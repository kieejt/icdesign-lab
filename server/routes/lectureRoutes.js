import express from 'express'
import verifyToken from '../middleware/verifyToken.js'
import Lecture from '../models/Lecture.js'
import { logAdminAction } from '../utils/auditLogger.js'

const router = express.Router()

// 1. Fetch all lectures (any logged-in student or admin)
router.get('/', verifyToken, async (req, res) => {
  try {
    const lectures = await Lecture.find({}).sort({ createdAt: -1 })
    return res.json(lectures)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch lectures' })
  }
})

// 2. Fetch a single lecture (any logged-in student or admin)
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const lecture = await Lecture.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    )
    if (!lecture) {
      return res.status(404).json({ message: 'Lecture not found' })
    }
    return res.json(lecture)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch lecture' })
  }
})

// 3. Create a lecture (Admin only)
router.post('/', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin access required' })
    }
    const { title, description, youtubeUrl, materialUrl } = req.body
    if (!title) {
      return res.status(400).json({ message: 'Title is required' })
    }

    const lecture = await Lecture.create({
      title,
      description,
      youtubeUrl,
      materialUrl,
      comments: []
    })

    await logAdminAction(req, 'CREATE_LECTURE', `Created lecture: ${lecture.title}`)

    return res.status(201).json(lecture)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create lecture' })
  }
})

// 4. Delete a lecture (Admin only)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin access required' })
    }
    const lecture = await Lecture.findByIdAndDelete(req.params.id)
    if (!lecture) {
      return res.status(404).json({ message: 'Lecture not found' })
    }
    await logAdminAction(req, 'DELETE_LECTURE', `Deleted lecture: ${lecture.title}`)
    return res.json({ message: 'Lecture deleted' })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete lecture' })
  }
})

// 4.5 Update a lecture (Admin only)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin access required' })
    }
    const { title, description, youtubeUrl, materialUrl } = req.body
    if (!title) {
      return res.status(400).json({ message: 'Title is required' })
    }

    const lecture = await Lecture.findByIdAndUpdate(
      req.params.id,
      { title, description, youtubeUrl, materialUrl },
      { new: true }
    )

    if (!lecture) {
      return res.status(404).json({ message: 'Lecture not found' })
    }

    await logAdminAction(req, 'UPDATE_LECTURE', `Updated lecture: ${lecture.title}`)

    return res.json(lecture)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update lecture' })
  }
})


// 5. Post a new question/comment (any logged-in student or admin)
router.post('/:id/comments', verifyToken, async (req, res) => {
  try {
    const { text } = req.body
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text is required' })
    }

    const lecture = await Lecture.findById(req.params.id)
    if (!lecture) {
      return res.status(404).json({ message: 'Lecture not found' })
    }

    const comment = {
      user: req.user.id,
      email: req.user.email,
      text: text.trim(),
      replies: []
    }

    lecture.comments.push(comment)
    await lecture.save()

    return res.status(201).json(lecture)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to add comment' })
  }
})

// 6. Reply to a comment (restricted to Admin/Teacher only)
router.post('/:id/comments/:commentId/replies', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Only the Professor can reply' })
    }
    const { text } = req.body
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Reply text is required' })
    }

    const lecture = await Lecture.findById(req.params.id)
    if (!lecture) {
      return res.status(404).json({ message: 'Lecture not found' })
    }

    const comment = lecture.comments.id(req.params.commentId)
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' })
    }

    const reply = {
      user: req.user.id,
      email: req.user.email,
      text: text.trim()
    }

    comment.replies.push(reply)
    await lecture.save()

    await logAdminAction(req, 'REPLY_COMMENT', `Replied to comment on lecture: ${lecture.title} (Question by: ${comment.email})`)

    return res.status(201).json(lecture)
  } catch (error) {
    console.error('Failed to add reply:', error)
    return res.status(500).json({ message: 'Failed to add reply' })
  }
})

// 7. Delete a comment (restricted to Admin/Teacher only)
router.delete('/:id/comments/:commentId', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin access required' })
    }

    const lecture = await Lecture.findById(req.params.id)
    if (!lecture) {
      return res.status(404).json({ message: 'Lecture not found' })
    }

    const comment = lecture.comments.id(req.params.commentId)
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' })
    }

    lecture.comments.pull(req.params.commentId)
    await lecture.save()

    await logAdminAction(req, 'DELETE_COMMENT', `Deleted comment by ${comment.email} on lecture: ${lecture.title}`)

    return res.json(lecture)
  } catch (error) {
    console.error('Failed to delete comment:', error)
    return res.status(500).json({ message: 'Failed to delete comment' })
  }
})

export default router
