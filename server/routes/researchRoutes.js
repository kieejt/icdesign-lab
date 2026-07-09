import express from 'express'
import verifyToken from '../middleware/verifyToken.js'
import verifyAdmin from '../middleware/verifyAdmin.js'
import Research from '../models/Research.js'
import { logAdminAction } from '../utils/auditLogger.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const filter = req.query.category ? { category: req.query.category } : {}
    const page = Math.max(Number(req.query.page) || 1, 1)
    const limit = Math.max(Number(req.query.limit) || 9, 1)

    const [total, research] = await Promise.all([
      Research.countDocuments(filter),
      Research.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ])

    return res.json({
      data: research,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch research' })
  }
})

router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { title, description, category, authors, journal, link, image, date } = req.body
    if (!title || !description || !category) {
      return res
        .status(400)
        .json({ message: 'Title, description, category are required' })
    }

    const item = await Research.create({ title, description, category, authors, journal, link, image, date })
    const label = item.category === 'Publications' ? 'publication' : 'project'
    await logAdminAction(req, 'CREATE_RESEARCH', `Created ${label}: ${item.title}`)
    return res.status(201).json(item)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create research' })
  }
})

router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { title, description, category, authors, journal, link, image, date } = req.body
    if (!title || !description || !category) {
      return res
        .status(400)
        .json({ message: 'Title, description, category are required' })
    }

    const item = await Research.findByIdAndUpdate(
      req.params.id,
      { title, description, category, authors, journal, link, image, date },
      { new: true, runValidators: true },
    )

    if (!item) {
      return res.status(404).json({ message: 'Research not found' })
    }

    const label = item.category === 'Publications' ? 'publication' : 'project'
    await logAdminAction(req, 'UPDATE_RESEARCH', `Updated ${label}: ${item.title}`)

    return res.json(item)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update research' })
  }
})

router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const item = await Research.findByIdAndDelete(req.params.id)
    if (!item) {
      return res.status(404).json({ message: 'Research not found' })
    }

    const label = item.category === 'Publications' ? 'publication' : 'project'
    await logAdminAction(req, 'DELETE_RESEARCH', `Deleted ${label}: ${item.title}`)

    return res.json({ message: 'Research deleted' })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete research' })
  }
})

export default router
