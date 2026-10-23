import express from 'express'
import verifyToken from '../middleware/verifyToken.js'
import verifyAdmin from '../middleware/verifyAdmin.js'
import LabEvent from '../models/LabEvent.js'
import { logAdminAction } from '../utils/auditLogger.js'
import { parseDay, statusFilter, todayInVietnam, withStatus } from '../utils/eventDates.js'
import { httpCache, invalidateOnWrite, microCache } from '../middleware/cache.js'

const router = express.Router()

router.use(invalidateOnWrite('lab-events'))
router.use(invalidateOnWrite('home')) // the homepage lists events too

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

router.get('/', httpCache(120, 600), microCache('lab-events', 60_000), async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1)
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100)
    const today = todayInVietnam()

    // Status (computed from the dates) and the search text must both hold.
    const clauses = []
    const byStatus = statusFilter(req.query.status, today)
    if (byStatus.$or) clauses.push(byStatus)
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : ''
    if (q) {
      const pattern = new RegExp(escapeRegex(q), 'i')
      clauses.push({ $or: [{ title: pattern }, { location: pattern }] })
    }
    const filter = clauses.length > 1 ? { $and: clauses } : (clauses[0] ?? {})

    /*
     * Upcoming events first, soonest at the top; then past events, most recent
     * first. Older entries without a real date use the day they were created.
     * One sort key does both: it is the day for upcoming events and its
     * negative for past ones, so a single ascending sort orders each group.
     */
    const day = { $toLong: { $ifNull: ['$eventDate', '$createdAt'] } }
    const isUpcoming = {
      $cond: [
        { $ne: [{ $type: '$eventDate' }, 'missing'] },
        { $gte: [{ $ifNull: ['$endDate', '$eventDate'] }, today] },
        { $eq: ['$status', 'Upcoming'] },
      ],
    }

    const [total, events] = await Promise.all([
      LabEvent.countDocuments(filter),
      LabEvent.aggregate([
        { $match: filter },
        { $addFields: { _upcoming: { $cond: [isUpcoming, 1, 0] }, _key: { $cond: [isUpcoming, day, { $multiply: [day, -1] }] } } },
        { $sort: { _upcoming: -1, _key: 1, createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        { $project: { _upcoming: 0, _key: 0, __v: 0 } },
      ]),
    ])

    return res.json({
      data: events.map((event) => withStatus(event, today)),
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch events' })
  }
})

// Single lab event.
router.get('/:id', httpCache(120, 600), microCache('lab-events', 60_000), async (req, res) => {
  try {
    const event = await LabEvent.findById(req.params.id).lean()
    if (!event) return res.status(404).json({ message: 'Event not found' })
    return res.json(withStatus(event))
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Event not found' })
    }
    return res.status(500).json({ message: 'Failed to fetch event' })
  }
})

/**
 * Validates an admin's event form. Returns `{ error }` or the cleaned fields.
 * The status is never taken from the request: it follows from the dates.
 */
function readEvent(body = {}) {
  const text = (value) => (typeof value === 'string' ? value.trim() : '')
  const title = text(body.title)
  const location = text(body.location)

  if (!title || !location) return { error: 'Title and location are required' }
  if (title.length > 150) return { error: 'The title is limited to 150 characters' }
  if (location.length > 200) return { error: 'The location is limited to 200 characters' }

  const eventDate = parseDay(body.eventDate)
  if (!eventDate) return { error: 'Choose the date of the event' }

  let endDate
  if (body.endDate) {
    endDate = parseDay(body.endDate)
    if (!endDate) return { error: 'The end date is not valid' }
    if (endDate < eventDate) return { error: 'The end date cannot be before the start date' }
    if (endDate.getTime() === eventDate.getTime()) endDate = undefined // one day
  }

  return { fields: { title, location, eventDate, endDate } }
}

router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { error, fields } = readEvent(req.body)
    if (error) return res.status(400).json({ message: error })

    const newEvent = new LabEvent(fields)
    newEvent.status = withStatus(newEvent.toObject()).status
    await newEvent.save()

    await logAdminAction(req, 'CREATE_EVENT', `Created lab event: ${fields.title}`)
    return res.status(201).json(withStatus(newEvent.toObject()))
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create event' })
  }
})

router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { error, fields } = readEvent(req.body)
    if (error) return res.status(400).json({ message: error })

    const event = await LabEvent.findById(req.params.id)
    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }

    event.set(fields)
    event.endDate = fields.endDate // undefined clears a previous end date
    event.status = withStatus(event.toObject()).status
    await event.save() // re-derives the readable date from the day(s)

    await logAdminAction(req, 'UPDATE_EVENT', `Updated lab event: ${fields.title}`)
    return res.json(withStatus(event.toObject()))
  } catch (error) {
    if (error.name === 'CastError') return res.status(404).json({ message: 'Event not found' })
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
    if (error.name === 'CastError') return res.status(404).json({ message: 'Event not found' })
    return res.status(500).json({ message: 'Failed to delete event' })
  }
})

export default router
