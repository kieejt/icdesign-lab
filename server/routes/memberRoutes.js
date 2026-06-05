import express from 'express'
import verifyToken from '../middleware/verifyToken.js'
import verifyAdmin from '../middleware/verifyAdmin.js'
import Member from '../models/Member.js'
import { logAdminAction } from '../utils/auditLogger.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const filter = req.query.category ? { category: req.query.category } : {}
    const members = await Member.find(filter).sort({ createdAt: -1 })
    return res.json(members)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch members' })
  }
})

router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { name, role, category, email, research, image } = req.body
    if (!name || !role || !email) {
      return res.status(400).json({ message: 'Name, role, email are required' })
    }

    const member = await Member.create({ name, role, category: category || 'Students', email, research, image })
    await logAdminAction(req, 'CREATE_MEMBER', `Added team member: ${name}`)
    return res.status(201).json(member)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create member' })
  }
})

router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { name, role, category, email, research, image } = req.body
    if (!name || !role || !email) {
      return res.status(400).json({ message: 'Name, role, email are required' })
    }

    const member = await Member.findByIdAndUpdate(
      req.params.id,
      { name, role, category: category || 'Students', email, research, image },
      { new: true, runValidators: true },
    )

    if (!member) {
      return res.status(404).json({ message: 'Member not found' })
    }

    await logAdminAction(req, 'UPDATE_MEMBER', `Updated team member: ${name}`)

    return res.json(member)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update member' })
  }
})

router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const member = await Member.findByIdAndDelete(req.params.id)
    if (!member) {
      return res.status(404).json({ message: 'Member not found' })
    }

    await logAdminAction(req, 'DELETE_MEMBER', `Deleted team member: ${member.name}`)

    return res.json({ message: 'Member deleted' })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete member' })
  }
})

export default router
