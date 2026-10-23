import express from 'express'
import News from '../models/News.js'
import verifyToken from '../middleware/verifyToken.js'
import verifyAdmin from '../middleware/verifyAdmin.js'
import { getFetchStatus, startNewsFetch } from '../services/agent.service.js'
import { getCronTime, updateCronTime } from '../jobs/cron.js'
import { logAdminAction } from '../utils/auditLogger.js'
import { httpCache, invalidateOnWrite, microCache } from '../middleware/cache.js'

const router = express.Router()

// Approving, rejecting or editing an article must show on the public feed at
// once, so every admin write purges the cached payloads.
router.use(invalidateOnWrite('news'))

// GET /api/news/published (Public)
router.get('/published', httpCache(60, 300), microCache('news', 30_000), async (req, res) => {
  try {
    const { offset = 0, limit = 20, startDate, endDate, category } = req.query
    const filter = { status: 'approved' }
    if (category) {
      filter.category = category
    }
    if (startDate || endDate) {
      filter.publishedAt = {}
      if (startDate) filter.publishedAt.$gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        filter.publishedAt.$lte = end
      }
    }
    
    // Count and page run concurrently rather than back to back — one round-trip
    // of latency instead of two.
    const [total, news] = await Promise.all([
      News.countDocuments(filter),
      News.find(filter)
        .sort({ createdAt: -1 })
        .skip(Math.max(Number(offset) || 0, 0))
        .limit(Math.min(Math.max(Number(limit) || 20, 1), 100))
        // The feed never needs the raw score or tag array.
        .select('-score -tags -__v')
        .lean(),
    ])

    res.json({ data: news, total })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

// =========================================================================
// Beyond this point, all news system endpoints require Admin privileges
// =========================================================================
router.use(verifyToken, verifyAdmin)

// GET /api/news/admin/stats (Admin)
router.get('/admin/stats', async (req, res) => {
  try {
    const stats = await News.aggregate([
      {
        $group: {
          _id: { category: '$category', status: '$status' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    const result = {
      pending: { All: 0 },
      approved: { All: 0 },
      rejected: { All: 0 },
    };
    
    stats.forEach(item => {
      const { category, status } = item._id;
      if (!result[status]) result[status] = { All: 0 };
      result[status][category] = item.count;
      result[status].All += item.count;
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

// GET /api/news/pending (Admin)
router.get('/pending', async (req, res) => {
  try {
    const { page = 1, limit = 50, startDate, endDate, category } = req.query;
    const filter = { status: 'pending' };
    if (category && category !== 'All') filter.category = category;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
    const [total, news] = await Promise.all([
      News.countDocuments(filter),
      News.find(filter)
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .lean(),
    ]);
    res.json({ data: news, total, totalPages: Math.ceil(total / Number(limit)), currentPage: Number(page) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

// GET /api/news/history (Admin)
router.get('/history', async (req, res) => {
  try {
    const { page = 1, limit = 50, startDate, endDate, category, status } = req.query;
    const filter = { status: { $ne: 'pending' } };
    
    if (status) {
      if (status === 'published') filter.status = 'approved';
      else if (status === 'rejected') filter.status = 'rejected';
      else filter.status = status;
    }
    
    if (category && category !== 'All') filter.category = category;
    if (startDate || endDate) {
      filter.updatedAt = {};
      if (startDate) filter.updatedAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.updatedAt.$lte = end;
      }
    }
    const [total, news] = await Promise.all([
      News.countDocuments(filter),
      News.find(filter)
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .lean(),
    ]);
    res.json({ data: news, total, totalPages: Math.ceil(total / Number(limit)), currentPage: Number(page) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/news/:id/approve (Admin)
router.post('/:id/approve', async (req, res) => {
  try {
    const news = await News.findByIdAndUpdate(req.params.id, { status: 'approved' }, { returnDocument: 'after' })
    if (!news) return res.status(404).json({ message: 'News not found' })
    await logAdminAction(req, 'APPROVE_NEWS', `Approved news: ${news.summary?.substring(0, 30)}...`)
    res.json(news)
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/news/:id/reject (Admin)
router.post('/:id/reject', async (req, res) => {
  try {
    const news = await News.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { returnDocument: 'after' })
    if (!news) return res.status(404).json({ message: 'News not found' })
    await logAdminAction(req, 'REJECT_NEWS', `Rejected news: ${news.summary?.substring(0, 30)}...`)
    res.json(news)
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/news/:id/restore (Admin)
router.post('/:id/restore', async (req, res) => {
  try {
    const news = await News.findByIdAndUpdate(req.params.id, { status: 'pending' }, { returnDocument: 'after' })
    if (!news) return res.status(404).json({ message: 'News not found' })
    await logAdminAction(req, 'RESTORE_NEWS', `Restored news to pending: ${news.summary?.substring(0, 30)}...`)
    res.json(news)
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

// DELETE /api/news/:id (Admin)
router.delete('/:id', async (req, res) => {
  try {
    const news = await News.findByIdAndDelete(req.params.id)
    if (!news) return res.status(404).json({ message: 'News not found' })
    await logAdminAction(req, 'DELETE_NEWS', `Deleted news: ${news.summary?.substring(0, 30)}...`)
    res.json({ message: 'News deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

// PATCH /api/news/:id (Admin)
router.patch('/:id', async (req, res) => {
  try {
    const { summary, category } = req.body
    const updateData = {}
    if (summary !== undefined) updateData.summary = summary
    if (category !== undefined) updateData.category = category

    const news = await News.findByIdAndUpdate(req.params.id, updateData, { new: true })
    if (!news) return res.status(404).json({ message: 'News not found' })
    await logAdminAction(req, 'UPDATE_NEWS', `Updated news: ${news.summary?.substring(0, 30)}...`)
    res.json(news)
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/news/fetch (Admin - Manual Trigger)
//
// Starts the run and answers at once. A full fetch takes minutes, longer than the
// browser's request timeout and the proxy's read timeout, so holding the request
// open made every slow run look like an error while it carried on regardless. The
// console polls GET /fetch-status instead.
router.post('/fetch', async (req, res) => {
  try {
    const started = await startNewsFetch('admin')

    // A run already in progress is a normal outcome, not an error.
    if (!started.started) {
      return res.status(409).json({
        message: 'A news fetch is already running. Try again in a few minutes.',
      })
    }

    res.status(202).json({ message: 'Fetch started', runId: started.runId })
    await logAdminAction(req, 'FETCH_NEWS', 'Manually triggered the AI news fetcher.')
  } catch (error) {
    res.status(500).json({ message: 'Server error starting the fetch' })
  }
})

// GET /api/news/fetch-status (Admin) — progress of the current run and the last result.
router.get('/fetch-status', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store')
    res.json(await getFetchStatus())
  } catch (error) {
    res.status(500).json({ message: 'Could not read the fetch status' })
  }
})

// GET /api/news/cron-time (Admin)
router.get('/cron-time', async (req, res) => {
  res.json(await getCronTime())
})

// POST /api/news/cron-time (Admin)
router.post('/cron-time', async (req, res) => {
  const { hour, minute } = req.body
  if (typeof hour !== 'number' || typeof minute !== 'number') {
    return res.status(400).json({ message: 'Invalid time format' })
  }
  const success = await updateCronTime(hour, minute)
  if (success) {
    await logAdminAction(req, 'UPDATE_CRON', `Updated News Agent cron schedule to ${hour}:${minute}`)
    res.json({ message: 'Cron time updated', hour, minute })
  } else {
    res.status(500).json({ message: 'Failed to update cron time' })
  }
})

export default router
