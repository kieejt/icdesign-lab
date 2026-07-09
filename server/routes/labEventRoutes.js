import express from 'express'
import verifyToken from '../middleware/verifyToken.js'
import verifyAdmin from '../middleware/verifyAdmin.js'
import LabEvent from '../models/LabEvent.js'
import { logAdminAction } from '../utils/auditLogger.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1)
    const limit = Math.max(Number(req.query.limit) || 10, 1)
    const filter = req.query.status ? { status: req.query.status } : {}

    const [total, events] = await Promise.all([
      LabEvent.countDocuments(filter),
      LabEvent.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
    ])

    return res.json({ data: events, total, totalPages: Math.ceil(total / limit), currentPage: page })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch events' })
  }
})

router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { title, date, location, status, description } = req.body
    if (!title || !date || !location || !description) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    const newEvent = await LabEvent.create({ title, date, location, status, description })
    await logAdminAction(req, 'CREATE_EVENT', `Created lab event: ${title}`)
    return res.status(201).json(newEvent)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create event' })
  }
})

router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { title, date, location, status, description } = req.body
    const updatedEvent = await LabEvent.findByIdAndUpdate(
      req.params.id,
      { title, date, location, status, description },
      { new: true, runValidators: true }
    )

    if (!updatedEvent) {
      return res.status(404).json({ message: 'Event not found' })
    }
    await logAdminAction(req, 'UPDATE_EVENT', `Updated lab event: ${title}`)
    return res.json(updatedEvent)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update event' })
  }
})

router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const deletedEvent = await LabEvent.findByIdAndDelete(req.params.id)
    if (!deletedEvent) {
      return res.status(404).json({ message: 'Event not found' })
    }
    await logAdminAction(req, 'DELETE_EVENT', `Deleted lab event: ${deletedEvent.title}`)
    return res.json({ message: 'Event deleted' })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete event' })
  }
})

export default router
