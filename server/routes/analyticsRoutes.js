import express from 'express'
import PageView from '../models/PageView.js'
import AuditLog from '../models/AuditLog.js'
import Lecture from '../models/Lecture.js'
import Document from '../models/Document.js'
import verifyToken from '../middleware/verifyToken.js'
import verifyAdmin from '../middleware/verifyAdmin.js'

const router = express.Router()

// 1. Track a page view (Public/Anonymous or Logged-in)
router.post('/track', async (req, res) => {
  try {
    const { url } = req.body
    if (!url) {
      return res.status(400).json({ message: 'URL is required' })
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip
    const userAgent = req.headers['user-agent'] || 'unknown'

    // We can also extract the user if authorization header exists
    let userId = null
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1]
        // Note: Decodes without full validation to prevent tracking failures blocking navigation
        const base64Url = token.split('.')[1]
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const payload = JSON.parse(Buffer.from(base64, 'base64').toString())
        userId = payload.id
      } catch (err) {
        // Silently skip if token is invalid or parsing fails
      }
    }

    await PageView.create({
      ip,
      url,
      userAgent,
      user: userId || undefined,
    })

    return res.status(201).json({ success: true })
  } catch (error) {
    console.error('Failed to track page view:', error)
    return res.status(500).json({ message: 'Tracking failed' })
  }
})

// 2. Fetch Dashboard Analytics (Admin only)
router.get('/dashboard', verifyToken, verifyAdmin, async (req, res) => {
  try {
    // A. Total Page Views
    const totalPageViews = await PageView.countDocuments()

    // B. Unique Visitors Overall (based on unique IPs)
    const uniqueIPsResult = await PageView.distinct('ip')
    const uniqueVisitors = uniqueIPsResult.length

    // C. Date ranges for Today, This Week, This Month
    const now = new Date()

    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)

    const startOfWeek = new Date(now)
    startOfWeek.setDate(startOfWeek.getDate() - 7)
    startOfWeek.setHours(0, 0, 0, 0)

    const startOfMonth = new Date(now)
    startOfMonth.setDate(startOfMonth.getDate() - 30)
    startOfMonth.setHours(0, 0, 0, 0)

    // D. Multi-range visitor stats (computes unique IPs for each window)
    const [ipsToday, ipsWeek, ipsMonth] = await Promise.all([
      PageView.distinct('ip', { createdAt: { $gte: startOfToday } }),
      PageView.distinct('ip', { createdAt: { $gte: startOfWeek } }),
      PageView.distinct('ip', { createdAt: { $gte: startOfMonth } }),
    ])

    const visitorsToday = ipsToday.length
    const visitorsThisWeek = ipsWeek.length
    const visitorsThisMonth = ipsMonth.length

    // E. Top Most Visited Pages
    const topPagesAggregate = await PageView.aggregate([
      { $group: { _id: '$url', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ])
    const topPages = topPagesAggregate.map(item => ({
      url: item._id,
      count: item.count,
    }))

    // F. Top Most Viewed Lectures
    const topLectures = await Lecture.find({})
      .sort({ views: -1 })
      .limit(10)
      .select('title views createdAt')

    // G. Unanswered Comments Feed (from all lectures)
    const lectures = await Lecture.find({})
    const unansweredComments = []
    lectures.forEach(lecture => {
      if (lecture.comments && lecture.comments.length > 0) {
        lecture.comments.forEach(comment => {
          if (!comment.replies || comment.replies.length === 0) {
            unansweredComments.push({
              lectureId: lecture._id,
              lectureTitle: lecture.title,
              commentId: comment._id,
              email: comment.email,
              text: comment.text,
              createdAt: comment.createdAt,
            })
          }
        })
      }
    })
    // Sort unanswered comments so the newest is at the top
    unansweredComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    // H. Document Downloads Count
    const documentDownloads = await Document.find({})
      .sort({ downloads: -1 })
      .limit(20)
      .select('title subject downloads type isLabOwned')

    return res.json({
      metrics: {
        totalPageViews,
        uniqueVisitors,
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
    console.error('Failed to aggregate dashboard analytics:', error)
    return res.status(500).json({ message: 'Failed to fetch dashboard metrics' })
  }
})

// 3. Fetch Admin Audit Logs (Admin only) - paginated, filtered server-side so the
// dashboard never has to load the full log history to show one page.
router.get('/audit-logs', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', action = 'All' } = req.query
    const pageNum = Math.max(Number(page) || 1, 1)
    const limitNum = Math.max(Number(limit) || 10, 1)
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
        .limit(limitNum),
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
    console.error('Failed to fetch audit logs:', error)
    return res.status(500).json({ message: 'Failed to fetch audit logs' })
  }
})

export default router
