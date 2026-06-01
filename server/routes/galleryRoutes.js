import express from 'express'
import verifyToken from '../middleware/verifyToken.js'
import verifyAdmin from '../middleware/verifyAdmin.js'
import Gallery from '../models/Gallery.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const filter = req.query.category ? { category: req.query.category } : {}
    const items = await Gallery.find(filter).sort({ createdAt: -1 })
    return res.json(items)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch gallery items' })
  }
})

router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { title, category, imageUrl } = req.body
    if (!title || !category || !imageUrl) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    const newItem = await Gallery.create({ title, category, imageUrl })
    return res.status(201).json(newItem)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create gallery item' })
  }
})

router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { title, category, imageUrl } = req.body
    const updatedItem = await Gallery.findByIdAndUpdate(
      req.params.id,
      { title, category, imageUrl },
      { new: true, runValidators: true }
    )

    if (!updatedItem) {
      return res.status(404).json({ message: 'Gallery item not found' })
    }
    return res.json(updatedItem)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update gallery item' })
  }
})

router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const deletedItem = await Gallery.findByIdAndDelete(req.params.id)
    if (!deletedItem) {
      return res.status(404).json({ message: 'Gallery item not found' })
    }
    return res.json({ message: 'Gallery item deleted' })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete gallery item' })
  }
})

export default router
