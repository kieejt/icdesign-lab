import express from 'express'
import User from '../models/User.js'
import generateToken from '../utils/generateToken.js'
import verifyToken from '../middleware/verifyToken.js'
import { logAdminAction } from '../utils/auditLogger.js'

const router = express.Router()

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    const adminExists = await User.exists({ role: 'admin' })
    if (adminExists) {
      return res.status(403).json({ message: 'Registration is disabled after initial setup.' })
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return res.status(409).json({ message: 'Email already exists' })
    }

    const user = await User.create({
      email,
      password,
      role: 'admin',
    })

    return res.status(201).json({
      message: 'Register successful',
      user: { id: user._id, email: user.email, role: user.role },
    })
  } catch (error) {
    return res.status(500).json({ message: 'Server error during register' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const token = generateToken(user)
    return res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, email: user.email, role: user.role },
    })
  } catch (error) {
    return res.status(500).json({ message: 'Server error during login' })
  }
})

router.get('/me', verifyToken, (req, res) => {
  return res.json({ user: req.user })
})

// Get all student accounts (Admin only)
router.get('/students', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin access required' })
    }
    const students = await User.find({ role: 'student' }).select('-password').sort({ createdAt: -1 })
    return res.json(students)
  } catch (error) {
    return res.status(500).json({ message: 'Server error fetching student accounts' })
  }
})

// Create a student account (Admin only)
router.post('/students', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin access required' })
    }
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return res.status(409).json({ message: 'Email already exists' })
    }

    const student = await User.create({
      email,
      password,
      role: 'student',
    })

    await logAdminAction(req, 'CREATE_STUDENT_ACCOUNT', `Created student account for: ${student.email}`)

    return res.status(201).json({
      message: 'Student account created successfully',
      user: { id: student._id, email: student.email, role: student.role },
    })
  } catch (error) {
    console.error('Create student error:', error)
    return res.status(500).json({ message: 'Server error during student creation' })
  }
})

// Delete a student account (Admin only)
router.delete('/students/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin access required' })
    }
    const student = await User.findOneAndDelete({ _id: req.params.id, role: 'student' })
    if (!student) {
      return res.status(404).json({ message: 'Student account not found' })
    }
    
    await logAdminAction(req, 'REVOKE_STUDENT_ACCOUNT', `Revoked student account for: ${student.email}`)

    return res.json({ message: 'Student account revoked successfully' })
  } catch (error) {
    return res.status(500).json({ message: 'Server error revoking student account' })
  }
})

export default router

