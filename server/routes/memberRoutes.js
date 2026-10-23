import express from 'express'
import verifyToken from '../middleware/verifyToken.js'
import verifyAdmin from '../middleware/verifyAdmin.js'
import Member from '../models/Member.js'
import { logAdminAction } from '../utils/auditLogger.js'
import { searchFilter } from '../models/plugins/searchTokens.js'
import { httpCache, invalidateOnWrite, microCache } from '../middleware/cache.js'

const router = express.Router()

// Public directory listings are read constantly and change only when an admin
// edits a profile — cache them briefly and purge on every write below.
router.use(invalidateOnWrite('members'))

router.get('/', httpCache(60, 300), microCache('members', 30_000), async (req, res) => {
  try {
    const { page = 1, limit = 12, search = '' } = req.query
    const pageNum = Math.max(Number(page) || 1, 1)
    const limitNum = Math.min(Math.max(Number(limit) || 12, 1), 100)
    const filter = req.query.category ? { category: req.query.category } : {}

    const textFilter = searchFilter(search)
    if (textFilter) Object.assign(filter, textFilter)

    const [total, members] = await Promise.all([
      Member.countDocuments(filter),
      Member.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        // Plain objects: no Mongoose document wrapper to build for read-only data.
        .lean(),
    ])

    return res.json({
      data: members,
      total,
      totalPages: Math.max(Math.ceil(total / limitNum), 1),
      currentPage: pageNum,
    })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch members' })
  }
})

// Single member profile.
router.get('/:id', httpCache(60, 300), microCache('members', 30_000), async (req, res) => {
  try {
    const member = await Member.findById(req.params.id).lean()
    if (!member) return res.status(404).json({ message: 'Member not found' })
    return res.json(member)
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Member not found' })
    }
    return res.status(500).json({ message: 'Failed to fetch member' })
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
