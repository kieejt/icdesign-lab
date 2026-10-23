import express from 'express'

import { SESSION_TTL_MS } from '../constants/auth.js'
import verifyAdmin from '../middleware/verifyAdmin.js'
import verifyToken from '../middleware/verifyToken.js'
import User from '../models/User.js'
import generateToken from '../utils/generateToken.js'
import { logAdminAction } from '../utils/auditLogger.js'
import { generatePassword, normalizeEmail, passwordProblem } from '../utils/passwords.js'
import { forgetUser, getSessionUser, tokenFromRequest } from '../utils/session.js'

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

const setSessionCookie = (res, user) =>
  res.cookie('token', generateToken(user), { ...SESSION_COOKIE, maxAge: SESSION_TTL_MS })

/** What the client may know about an account (never the hash). */
const publicUser = (user) => ({
  id: String(user._id ?? user.id),
  email: user.email,
  name: user.name || '',
  role: user.role,
  studentId: user.studentId || '',
  mustChangePassword: Boolean(user.mustChangePassword),
})

/** The admin-facing view of a student account. */
const studentView = (user) => ({
  _id: user._id,
  email: user.email,
  name: user.name || '',
  studentId: user.studentId || '',
  status: user.status || 'active',
  mustChangePassword: Boolean(user.mustChangePassword),
  lastLoginAt: user.lastLoginAt || null,
  createdAt: user.createdAt,
})

const cleanText = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

// There is deliberately no public sign-up route. The first admin is inserted into
// the database with `npm run create-admin` (scripts/create-admin.js); student
// accounts are created by an admin below.
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() })
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    // Said only after the password is right, so it does not reveal which e-mail
    // addresses have accounts.
    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'This account is suspended. Contact the lab to restore access.' })
    }

    await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } })

    // maxAge matches what the token is signed with, so the credential cannot
    // outlive the cookie that carries it.
    setSessionCookie(res, user)

    return res.json({ message: 'Login successful', user: publicUser(user) })
  } catch (error) {
    return res.status(500).json({ message: 'Server error during login' })
  }
})

// Answers 200 with `user: null` for a visitor who is not signed in. The client
// asks on every page load, so a 401 here put a red error in every anonymous
// visitor's console for what is simply the normal state.
router.get('/me', async (req, res) => {
  try {
    const user = await getSessionUser(tokenFromRequest(req))
    return res.json({ user: user ? publicUser(user) : null })
  } catch {
    return res.json({ user: null })
  }
})

router.post('/logout', (req, res) => {
  res.clearCookie('token', SESSION_COOKIE)
  return res.json({ message: 'Logged out successfully' })
})

/* -------------------------------------------------------------------------- */
/* Self-service (any signed-in account)                                        */
/* -------------------------------------------------------------------------- */

router.patch('/profile', verifyToken, async (req, res) => {
  try {
    const name = cleanText(req.body?.name, 100)
    const user = await User.findByIdAndUpdate(req.user.id, { name }, { new: true })
    forgetUser(req.user.id)
    return res.json({ user: publicUser(user) })
  } catch (error) {
    return res.status(500).json({ message: 'Could not update your profile' })
  }
})

router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body ?? {}
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({ message: 'Current and new password are required' })
    }

    const problem = passwordProblem(newPassword)
    if (problem) return res.status(400).json({ message: problem })

    const user = await User.findById(req.user.id)
    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ message: 'Your current password is not correct' })
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'Choose a password different from the current one' })
    }

    user.password = newPassword
    user.passwordChangedAt = new Date()
    user.mustChangePassword = false
    user.tokenVersion = (user.tokenVersion || 0) + 1 // every other session of this account ends
    await user.save()
    forgetUser(user._id)

    setSessionCookie(res, user) // this one carries on
    return res.json({ message: 'Password changed', user: publicUser(user) })
  } catch (error) {
    return res.status(500).json({ message: 'Could not change the password' })
  }
})

/* -------------------------------------------------------------------------- */
/* Student accounts (admin only)                                               */
/* -------------------------------------------------------------------------- */

const adminOnly = [verifyToken, verifyAdmin]

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Creates one student with a generated temporary password and returns the
 * account together with that password (it exists nowhere else). Admins never
 * choose a student's password: the student sets their own at the first sign-in.
 */
async function createStudent({ email, name, studentId }) {
  const normalized = normalizeEmail(email)
  if (!normalized) return { error: 'Invalid e-mail address' }

  if (await User.exists({ email: normalized })) return { error: 'Email already exists' }

  const id = cleanText(studentId, 30)
  if (id && (await User.exists({ studentId: id, role: 'student' }))) {
    return { error: `Student ID ${id} is already used` }
  }

  const temporaryPassword = generatePassword()

  const user = await User.create({
    email: normalized,
    password: temporaryPassword,
    role: 'student',
    name: cleanText(name, 100),
    studentId: id || undefined,
    mustChangePassword: true, // the student replaces it at the first sign-in
  })

  return { user, temporaryPassword }
}

// List, with optional search (?q=) and status filter (?status=active|suspended).
router.get('/students', adminOnly, async (req, res) => {
  try {
    const filter = { role: 'student' }
    if (req.query.status === 'active' || req.query.status === 'suspended') {
      filter.status = req.query.status === 'active' ? { $ne: 'suspended' } : 'suspended'
    }
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : ''
    if (q) {
      const pattern = new RegExp(escapeRegex(q), 'i')
      filter.$or = [{ email: pattern }, { name: pattern }, { studentId: pattern }]
    }

    const students = await User.find(filter).select('-password').sort({ createdAt: -1 }).limit(500).lean()
    return res.json(students.map(studentView))
  } catch (error) {
    return res.status(500).json({ message: 'Server error fetching student accounts' })
  }
})

router.post('/students', adminOnly, async (req, res) => {
  try {
    const result = await createStudent(req.body ?? {})
    if (result.error) {
      return res.status(/already (exists|used)/.test(result.error) ? 409 : 400).json({ message: result.error })
    }

    await logAdminAction(req, 'CREATE_STUDENT_ACCOUNT', `Created student account for: ${result.user.email}`)

    return res.status(201).json({
      message: 'Student account created successfully',
      student: studentView(result.user),
      temporaryPassword: result.temporaryPassword,
    })
  } catch (error) {
    console.error('Create student error:', error)
    return res.status(500).json({ message: 'Server error during student creation' })
  }
})

// Many at once: [{ email, name?, studentId? }]. Each gets its own generated password.
router.post('/students/bulk', adminOnly, async (req, res) => {
  try {
    const rows = Array.isArray(req.body?.students) ? req.body.students : null
    if (!rows || rows.length === 0) return res.status(400).json({ message: 'Provide a list of students' })
    if (rows.length > 100) return res.status(400).json({ message: 'At most 100 students per import' })

    const created = []
    const skipped = []
    const seen = new Set()

    // Duplicates inside the file are caught up front; the accounts are then
    // created a few at a time, because each one costs a bcrypt hash.
    const todo = []
    for (const row of rows) {
      const email = normalizeEmail(row?.email)
      if (!email) skipped.push({ email: String(row?.email ?? ''), reason: 'Invalid e-mail address' })
      else if (seen.has(email)) skipped.push({ email, reason: 'Listed twice' })
      else {
        seen.add(email)
        todo.push({ ...row, email })
      }
    }

    for (let i = 0; i < todo.length; i += 4) {
      const results = await Promise.all(todo.slice(i, i + 4).map((row) => createStudent(row)))
      results.forEach((result, j) => {
        const row = todo[i + j]
        if (result.error) skipped.push({ email: row.email, reason: result.error })
        else created.push({ ...studentView(result.user), temporaryPassword: result.temporaryPassword })
      })
    }

    await logAdminAction(req, 'IMPORT_STUDENT_ACCOUNTS', `Imported ${created.length} student accounts (${skipped.length} skipped)`)

    return res.status(201).json({ created, skipped })
  } catch (error) {
    console.error('Bulk student import error:', error)
    return res.status(500).json({ message: 'Server error during the import' })
  }
})

router.patch('/students/:id', adminOnly, async (req, res) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: 'student' })
    if (!student) return res.status(404).json({ message: 'Student account not found' })

    const { name, studentId, status, email } = req.body ?? {}
    const changes = []

    if (name !== undefined) {
      student.name = cleanText(name, 100)
      changes.push('name')
    }

    if (studentId !== undefined) {
      const id = cleanText(studentId, 30)
      if (id && (await User.exists({ studentId: id, role: 'student', _id: { $ne: student._id } }))) {
        return res.status(409).json({ message: `Student ID ${id} is already used` })
      }
      student.studentId = id || undefined
      changes.push('student ID')
    }

    if (email !== undefined) {
      const normalized = normalizeEmail(email)
      if (!normalized) return res.status(400).json({ message: 'Invalid e-mail address' })
      if (normalized !== student.email) {
        if (await User.exists({ email: normalized })) return res.status(409).json({ message: 'Email already exists' })
        student.email = normalized
        changes.push('e-mail')
      }
    }

    if (status !== undefined) {
      if (status !== 'active' && status !== 'suspended') return res.status(400).json({ message: 'Invalid status' })
      if (status !== student.status) {
        student.status = status
        if (status === 'suspended') student.tokenVersion = (student.tokenVersion || 0) + 1 // sessions end now
        changes.push(status === 'suspended' ? 'suspended' : 'reactivated')
      }
    }

    await student.save()
    forgetUser(student._id)

    if (changes.length) {
      await logAdminAction(req, 'UPDATE_STUDENT_ACCOUNT', `Updated ${student.email}: ${changes.join(', ')}`)
    }
    return res.json({ student: studentView(student) })
  } catch (error) {
    return res.status(500).json({ message: 'Server error updating the student account' })
  }
})

// New temporary password; the student must replace it at their next sign-in.
router.post('/students/:id/reset-password', adminOnly, async (req, res) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: 'student' })
    if (!student) return res.status(404).json({ message: 'Student account not found' })

    const temporaryPassword = generatePassword()
    student.password = temporaryPassword
    student.mustChangePassword = true
    student.passwordChangedAt = new Date()
    student.tokenVersion = (student.tokenVersion || 0) + 1
    await student.save()
    forgetUser(student._id)

    await logAdminAction(req, 'RESET_STUDENT_PASSWORD', `Reset the password of: ${student.email}`)
    return res.json({ student: studentView(student), temporaryPassword })
  } catch (error) {
    return res.status(500).json({ message: 'Server error resetting the password' })
  }
})

router.delete('/students/:id', adminOnly, async (req, res) => {
  try {
    const student = await User.findOneAndDelete({ _id: req.params.id, role: 'student' })
    if (!student) {
      return res.status(404).json({ message: 'Student account not found' })
    }
    forgetUser(student._id)

    await logAdminAction(req, 'REVOKE_STUDENT_ACCOUNT', `Revoked student account for: ${student.email}`)

    return res.json({ message: 'Student account revoked successfully' })
  } catch (error) {
    return res.status(500).json({ message: 'Server error revoking student account' })
  }
})

export default router
