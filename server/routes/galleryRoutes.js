import express from 'express'
import verifyToken from '../middleware/verifyToken.js'
import verifyAdmin from '../middleware/verifyAdmin.js'
import Gallery from '../models/Gallery.js'
import { logAdminAction } from '../utils/auditLogger.js'

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

router.get('/:id', async (req, res) => {
  try {
    const item = await Gallery.findById(req.params.id)
    if (!item) return res.status(404).json({ message: 'Album not found' })
    return res.json(item)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch gallery album' })
  }
})

router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { title, category, coverImage, images } = req.body
    if (!title || !category) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    const newItem = await Gallery.create({ title, category, coverImage, images: images || [] })
    
    await logAdminAction(req, 'CREATE_ALBUM', `Created gallery album: ${title}`)
    
    return res.status(201).json(newItem)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create gallery item' })
  }
})

router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { title, category, coverImage, images } = req.body
    const updatedItem = await Gallery.findByIdAndUpdate(
      req.params.id,
      { title, category, coverImage, images },
      { new: true, runValidators: true }
    )

    if (!updatedItem) {
      return res.status(404).json({ message: 'Gallery item not found' })
    }
    
    await logAdminAction(req, 'UPDATE_ALBUM', `Updated gallery album: ${title}`)
    
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
    
    await logAdminAction(req, 'DELETE_ALBUM', `Deleted gallery album: ${deletedItem.title}`)
    
    return res.json({ message: 'Gallery item deleted' })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete gallery item' })
  }
})

export default router
