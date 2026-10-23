import express from 'express'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import generateToken from '../utils/generateToken.js'
import verifyToken from '../middleware/verifyToken.js'
import { logAdminAction } from '../utils/auditLogger.js'
import { SESSION_TTL_MS } from '../constants/auth.js'

const router = express.Router()

/**
 * Attributes the session cookie is set with — and must be cleared with.
 *
 * A compliant browser only drops a cookie when the clearing response repeats the
 * same attributes (everything but expiry). `res.clearCookie('token')` with no
 * options therefore left a `sameSite=strict; secure` cookie in place, so
 * "sign out" could return a success message while the session stayed live.
 * Defined once so setting and clearing cannot disagree.
 */
const SESSION_COOKIE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
}

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
    
    // maxAge matches what the token is signed with, so the credential cannot
    // outlive the cookie that carries it.
    res.cookie('token', token, { ...SESSION_COOKIE, maxAge: SESSION_TTL_MS })

    return res.json({
      message: 'Login successful',
      user: { id: user._id, email: user.email, role: user.role },
    })
  } catch (error) {
    return res.status(500).json({ message: 'Server error during login' })
  }
})

// Answers 200 with `user: null` for a visitor who is not signed in. The client
// asks on every page load, so a 401 here put a red error in every anonymous
// visitor's console for what is simply the normal state.
router.get('/me', (req, res) => {
  const token =
    req.cookies.token ||
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null)
  if (!token) return res.json({ user: null })

  try {
    return res.json({ user: jwt.verify(token, process.env.JWT_SECRET) })
  } catch {
    return res.json({ user: null })
  }
})

router.post('/logout', (req, res) => {
  res.clearCookie('token', SESSION_COOKIE)
  return res.json({ message: 'Logged out successfully' })
})

// Get all student accounts (Admin only)
router.get('/students', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin access required' })
    }
    const students = await User.find({ role: 'student' }).select('-password').sort({ createdAt: -1 }).limit(500).lean()
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

