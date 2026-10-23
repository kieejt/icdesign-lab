import { getSessionUser, tokenFromRequest } from '../utils/session.js'

/** Routes a signed-in user may still call while they owe a password change. */
const ALLOWED_WHILE_PASSWORD_PENDING = ['/api/auth/change-password', '/api/auth/me', '/api/auth/logout']

const verifyToken = async (req, res, next) => {
  try {
    const token = tokenFromRequest(req)
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: missing token' })
    }

    const user = await getSessionUser(token)
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized: invalid or revoked session' })
    }

    // An account whose password an admin issued must replace it before doing anything else.
    if (user.mustChangePassword && !ALLOWED_WHILE_PASSWORD_PENDING.some((p) => req.originalUrl.startsWith(p))) {
      return res.status(403).json({ code: 'PASSWORD_CHANGE_REQUIRED', message: 'Change your password to continue.' })
    }

    req.user = user
    return next()
  } catch (error) {
    return next(error)
  }
}

export default verifyToken
