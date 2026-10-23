import express from 'express'
import PageView from '../models/PageView.js'
import AuditLog from '../models/AuditLog.js'
import Lecture from '../models/Lecture.js'
import Document from '../models/Document.js'
import verifyToken from '../middleware/verifyToken.js'
import verifyAdmin from '../middleware/verifyAdmin.js'

const router = express.Router()

/*
 * Page views are written in batches.
 *
 * Every view used to be its own insert, and the collection carries four
 * secondary indexes, so one visit meant five index writes. At ~0.65 ms per
 * insert that is cheap for one visitor and wasteful under any real traffic;
 * the same rows go in about ten times faster as a batch. Views are buffered in
 * memory and flushed every few seconds, when the buffer fills, and on shutdown.
 * The cost is that a crash loses at most a few seconds of analytics.
 */
const FLUSH_INTERVAL_MS = 5000
const FLUSH_BATCH_SIZE = 200
let pending = []
let flushTimer = null

export async function flushPageViews() {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  if (pending.length === 0) return

  const batch = pending
  pending = []
  try {
    await PageView.insertMany(batch, { ordered: false })
  } catch (error) {
    console.error(`Failed to record ${batch.length} page views:`, error.message)
  }
}

function recordPageView(view) {
  pending.push(view)
  if (pending.length >= FLUSH_BATCH_SIZE) {
    flushPageViews()
    return
  }
  if (!flushTimer) {
    flushTimer = setTimeout(flushPageViews, FLUSH_INTERVAL_MS)
    flushTimer.unref?.() // never hold the process open for analytics
  }
}

/** Crawlers, uptime probes and automation would otherwise dominate the counts. */
const BOT_PATTERN = /bot|crawl|spider|slurp|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python-requests|axios|node-fetch/i

/** Base64url-decode a JWT payload without verifying it. */
function readTokenPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(Buffer.from(base64, 'base64').toString())
  } catch {
    return null
  }
}

// 1. Track a page view (public — anonymous or logged-in).
router.post('/track', (req, res) => {
  const { url } = req.body || {}
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ message: 'URL is required' })
  }

  // Acknowledge immediately. Analytics must never add latency to a navigation,
  // and a lost hit is far cheaper than a blocked page transition.
  res.status(202).json({ success: true })

  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || req.ip
  const userAgent = req.headers['user-agent'] || 'unknown'

  // The cookie is the real session; the Bearer header is a legacy fallback. It is
  // decoded, not verified — a forged id only mislabels one analytics row, and a
  // verification failure must not lose the hit.
  let userId = null
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    userId = readTokenPayload(authHeader.slice(7))?.id ?? null
  } else if (req.cookies?.token) {
    userId = readTokenPayload(req.cookies.token)?.id ?? null
  }

  if (BOT_PATTERN.test(userAgent)) return

  recordPageView({ ip, url: url.slice(0, 512), userAgent: userAgent.slice(0, 256), user: userId || undefined })
})

/*
 * Visitor statistics for the dashboard.
 *
 * Unique visitors are counted per window with an indexed $match, in parallel.
 * This used to be one $facet with five branches. $facet cannot use an index, so
 * every branch scanned the whole collection and the stage held all five result
 * sets in memory: ~1.1 s at 300 000 views, growing linearly and eventually
 * hitting the stage's memory ceiling. Separate pipelines each use the createdAt /
 * ip indexes and finish in ~0.15 s on the same data.
 *
 * The result is memoised for a minute: the numbers are aggregates over months of
 * traffic, so being a minute behind is invisible, while recomputing them on
 * every dashboard load is the most expensive thing the admin area does. Only
 * this part is cached — comments and downloads below are read fresh, so a reply
 * disappears from the inbox immediately.
 */
const STATS_TTL_MS = 60_000
let statsMemo = { at: 0, value: null }

async function getVisitorStats() {
  if (statsMemo.value && Date.now() - statsMemo.at < STATS_TTL_MS) return statsMemo.value

  const now = new Date()
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const startOfWeek = new Date(now)
  startOfWeek.setDate(startOfWeek.getDate() - 7)
  startOfWeek.setHours(0, 0, 0, 0)
  const startOfMonth = new Date(now)
  startOfMonth.setDate(startOfMonth.getDate() - 30)
  startOfMonth.setHours(0, 0, 0, 0)

  const uniqueVisitors = async (match) =>
    (await PageView.aggregate([{ $match: match }, { $group: { _id: '$ip' } }, { $count: 'count' }]))[0]?.count ?? 0

  const [totalPageViews, uniqueAll, visitorsToday, visitorsThisWeek, visitorsThisMonth, topPages] = await Promise.all([
    // O(1) from collection metadata instead of counting every document.
    PageView.estimatedDocumentCount(),
    uniqueVisitors({}),
    uniqueVisitors({ createdAt: { $gte: startOfToday } }),
    uniqueVisitors({ createdAt: { $gte: startOfWeek } }),
    uniqueVisitors({ createdAt: { $gte: startOfMonth } }),
    PageView.aggregate([
      { $group: { _id: '$url', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, url: '$_id', count: 1 } },
    ]),
  ])

  statsMemo = {
    at: Date.now(),
    value: { totalPageViews, uniqueAll, visitorsToday, visitorsThisWeek, visitorsThisMonth, topPages },
  }
  return statsMemo.value
}

// 2. Dashboard analytics (admin only).
router.get('/dashboard', verifyToken, verifyAdmin, async (req, res, next) => {
  try {
    const [stats, topLectures, unansweredComments, documentDownloads] = await Promise.all([
      getVisitorStats(),

      Lecture.find({}).sort({ views: -1 }).limit(10).select('title views createdAt').lean(),

      // Unanswered questions used to be found by loading every lecture — comments,
      // replies and all — into Node and filtering there. Unwinding in Mongo returns
      // only the handful of rows the panel actually renders.
      Lecture.aggregate([
        { $match: { 'comments.0': { $exists: true } } },
        { $unwind: '$comments' },
        { $match: { $or: [{ 'comments.replies': { $size: 0 } }, { 'comments.replies': { $exists: false } }] } },
        { $sort: { 'comments.createdAt': -1 } },
        { $limit: 50 },
        {
          $project: {
            _id: 0,
            lectureId: '$_id',
            lectureTitle: '$title',
            commentId: '$comments._id',
            email: '$comments.email',
            text: '$comments.text',
            createdAt: '$comments.createdAt',
          },
        },
      ]),

      Document.find({}).sort({ downloads: -1 }).limit(20).select('title subject downloads type isLabOwned').lean(),
    ])

    const { totalPageViews, uniqueAll, visitorsToday, visitorsThisWeek, visitorsThisMonth, topPages } = stats

    return res.json({
      metrics: {
        totalPageViews,
        uniqueVisitors: uniqueAll,
        visitorsToday,
        visitorsThisWeek,
        visitorsThisMonth,
      },
      topPages,
      topLectures,
      unansweredComments,
      documentDownloads,
    })
  } catch (error) {
    return next(error)
  }
})

// 3. Admin audit logs — paginated and filtered server-side so the dashboard never
// loads the full history to show one page.
router.get('/audit-logs', verifyToken, verifyAdmin, async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '', action = 'All' } = req.query
    const pageNum = Math.max(Number(page) || 1, 1)
    const limitNum = Math.min(Math.max(Number(limit) || 10, 1), 100)
    const filter = {}

    if (action && action !== 'All') {
      filter.action = action
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(escaped, 'i')
      filter.$or = [{ adminEmail: regex }, { details: regex }, { action: regex }]
    }

    const [total, logs, actions] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      AuditLog.distinct('action'),
    ])

    return res.json({
      data: logs,
      total,
      totalPages: Math.max(Math.ceil(total / limitNum), 1),
      currentPage: pageNum,
      actions: ['All', ...actions.sort()],
    })
  } catch (error) {
    return next(error)
  }
})

export default router
