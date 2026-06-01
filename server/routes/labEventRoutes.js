import express from 'express'
import verifyToken from '../middleware/verifyToken.js'
import verifyAdmin from '../middleware/verifyAdmin.js'
import LabEvent from '../models/LabEvent.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const events = await LabEvent.find().sort({ createdAt: -1 })
    return res.json(events)
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
    return res.json({ message: 'Event deleted' })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete event' })
  }
})

export default router
