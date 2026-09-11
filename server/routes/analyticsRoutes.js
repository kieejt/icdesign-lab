import express from 'express'
import PageView from '../models/PageView.js'
import AuditLog from '../models/AuditLog.js'
import Lecture from '../models/Lecture.js'
import Document from '../models/Document.js'
import verifyToken from '../middleware/verifyToken.js'
import verifyAdmin from '../middleware/verifyAdmin.js'

const router = express.Router()

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

  PageView.create({ ip, url: url.slice(0, 512), userAgent, user: userId || undefined }).catch((error) => {
    console.error('Failed to track page view:', error.message)
  })
})

// 2. Dashboard analytics (admin only).
router.get('/dashboard', verifyToken, verifyAdmin, async (req, res, next) => {
  try {
    const now = new Date()

    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)

    const startOfWeek = new Date(now)
    startOfWeek.setDate(startOfWeek.getDate() - 7)
    startOfWeek.setHours(0, 0, 0, 0)

    const startOfMonth = new Date(now)
    startOfMonth.setDate(startOfMonth.getDate() - 30)
    startOfMonth.setHours(0, 0, 0, 0)

    // Every visitor metric comes from a single pass over PageView.
    //
    // The previous version called distinct('ip') four times. distinct materialises
    // the entire list of unique IPs in memory and returns it over the wire just to
    // take its .length — and it hard-fails once that list exceeds the 16 MB BSON
    // limit, so the dashboard would eventually break as traffic grew. A $group
    // counts server-side and returns five numbers.
    const visitorFacet = (since) => [
      ...(since ? [{ $match: { createdAt: { $gte: since } } }] : []),
      { $group: { _id: '$ip' } },
      { $count: 'count' },
    ]

    const [aggregate, topLectures, unansweredComments, documentDownloads] = await Promise.all([
      PageView.aggregate([
        {
          $facet: {
            totalPageViews: [{ $count: 'count' }],
            uniqueVisitors: visitorFacet(null),
            visitorsToday: visitorFacet(startOfToday),
            visitorsThisWeek: visitorFacet(startOfWeek),
            visitorsThisMonth: visitorFacet(startOfMonth),
            topPages: [
              { $group: { _id: '$url', count: { $sum: 1 } } },
              { $sort: { count: -1 } },
              { $limit: 10 },
              { $project: { _id: 0, url: '$_id', count: 1 } },
            ],
          },
        },
      ]),

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

    const facets = aggregate[0] || {}
    const countOf = (key) => facets[key]?.[0]?.count ?? 0

    return res.json({
      metrics: {
        totalPageViews: countOf('totalPageViews'),
        uniqueVisitors: countOf('uniqueVisitors'),
        visitorsToday: countOf('visitorsToday'),
        visitorsThisWeek: countOf('visitorsThisWeek'),
        visitorsThisMonth: countOf('visitorsThisMonth'),
      },
      topPages: facets.topPages || [],
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
