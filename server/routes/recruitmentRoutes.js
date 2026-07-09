import express from 'express'
import verifyToken from '../middleware/verifyToken.js'
import verifyAdmin from '../middleware/verifyAdmin.js'
import Recruitment from '../models/Recruitment.js'
import { logAdminAction } from '../utils/auditLogger.js'

const router = express.Router()

const syncExpiredRecruitments = async () => {
  await Recruitment.updateMany(
    { deadline: { $lt: new Date() }, status: { $ne: 'closed' } },
    { $set: { status: 'closed' } },
  )
}

router.get('/', async (req, res) => {
  try {
    await syncExpiredRecruitments()
    let query = Recruitment.find().sort({ createdAt: -1 })
    if (req.query.limit) {
      query = query.limit(Math.max(Number(req.query.limit) || 0, 1))
    }
    const items = await query
    return res.json(items)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch recruitments' })
  }
})

router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { title, description, googleFormUrl, deadline, status } = req.body
    if (!title || !description || !googleFormUrl || !deadline) {
      return res.status(400).json({
        message: 'Title, description, googleFormUrl, deadline are required',
      })
    }

    const item = await Recruitment.create({
      title,
      description,
      googleFormUrl,
      deadline,
      status: status || 'active',
    })
    
    await logAdminAction(req, 'CREATE_RECRUITMENT', `Created recruitment post: ${title}`)
    
    return res.status(201).json(item)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create recruitment' })
  }
})

router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { title, description, googleFormUrl, deadline, status } = req.body
    if (!title || !description || !googleFormUrl || !deadline) {
      return res.status(400).json({
        message: 'Title, description, googleFormUrl, deadline are required',
      })
    }

    const nextStatus =
      new Date(deadline) < new Date() ? 'closed' : status || 'active'

    const item = await Recruitment.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        googleFormUrl,
        deadline,
        status: nextStatus,
      },
      { new: true, runValidators: true },
    )

    if (!item) {
      return res.status(404).json({ message: 'Recruitment not found' })
    }

    await logAdminAction(req, 'UPDATE_RECRUITMENT', `Updated recruitment post: ${title}`)

    return res.json(item)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update recruitment' })
  }
})

router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const item = await Recruitment.findByIdAndDelete(req.params.id)
    if (!item) {
      return res.status(404).json({ message: 'Recruitment not found' })
    }
    
    await logAdminAction(req, 'DELETE_RECRUITMENT', `Deleted recruitment post: ${item.title}`)
    
    return res.json({ message: 'Recruitment deleted' })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete recruitment' })
  }
})

export default router
