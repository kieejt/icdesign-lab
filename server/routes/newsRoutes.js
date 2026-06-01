import express from 'express'
import News from '../models/News.js'
import verifyToken from '../middleware/verifyToken.js'
import verifyAdmin from '../middleware/verifyAdmin.js'
import { fetchAndProcessNews } from '../services/agent.service.js'
import { getCronTime, updateCronTime } from '../jobs/cron.js'

const router = express.Router()

// GET /api/news/published (Public)
router.get('/published', async (req, res) => {
  try {
    const filter = { status: 'approved' }
    if (req.query.category) {
      filter.category = req.query.category
    }
    const news = await News.find(filter).sort({ publishedAt: -1 })
    res.json(news)
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

// =========================================================================
// Beyond this point, all news system endpoints require Admin privileges
// =========================================================================
router.use(verifyToken, verifyAdmin)

// GET /api/news/pending (Admin)
router.get('/pending', async (req, res) => {
  try {
    const news = await News.find({ status: 'pending' }).sort({ createdAt: -1 })
    res.json(news)
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

// GET /api/news/history (Admin)
router.get('/history', async (req, res) => {
  try {
    const news = await News.find({ status: { $ne: 'pending' } }).sort({ updatedAt: -1 })
    res.json(news)
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/news/:id/approve (Admin)
router.post('/:id/approve', async (req, res) => {
  try {
    const news = await News.findByIdAndUpdate(req.params.id, { status: 'approved' }, { returnDocument: 'after' })
    if (!news) return res.status(404).json({ message: 'News not found' })
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
    res.json(news)
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/news/fetch (Admin - Manual Trigger)
router.post('/fetch', async (req, res) => {
  try {
    const result = await fetchAndProcessNews()
    res.json({
      message: 'Fetch completed',
      totalSaved: result?.totalSaved ?? 0,
      perCategory: result?.perCategoryStats ?? {},
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error during fetch' })
  }
})

// GET /api/news/cron-time (Admin)
router.get('/cron-time', (req, res) => {
  res.json(getCronTime())
})

// POST /api/news/cron-time (Admin)
router.post('/cron-time', (req, res) => {
  const { hour, minute } = req.body
  if (typeof hour !== 'number' || typeof minute !== 'number') {
    return res.status(400).json({ message: 'Invalid time format' })
  }
  const success = updateCronTime(hour, minute)
  if (success) {
    res.json({ message: 'Cron time updated', hour, minute })
  } else {
    res.status(500).json({ message: 'Failed to update cron time' })
  }
})

export default router
