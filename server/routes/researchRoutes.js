import express from 'express'
import verifyToken from '../middleware/verifyToken.js'
import verifyAdmin from '../middleware/verifyAdmin.js'
import Research from '../models/Research.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const filter = req.query.category ? { category: req.query.category } : {}
    const research = await Research.find(filter).sort({ createdAt: -1 })
    return res.json(research)
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
    return res.json({ message: 'Research deleted' })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete research' })
  }
})

export default router
