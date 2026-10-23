import jwt from 'jsonwebtoken'

import User from '../models/User.js'

/*
 * Session validation.
 *
 * A signed token alone cannot be revoked: deleting or suspending a student used
 * to leave their cookie working until it expired (a day). Every authenticated
 * request is now checked against the account — it must exist, be active, and
 * carry the account's current tokenVersion — so revoking access, resetting a
 * password or changing it elsewhere takes effect at once.
 *
 * The lookup is one indexed read, cached for a few seconds per account, and
 * dropped explicitly (forgetUser) whenever this process changes the account.
 */
const CACHE_TTL_MS = 10_000
const cache = new Map()

const FIELDS = 'email name role status tokenVersion mustChangePassword studentId'

export function forgetUser(id) {
  cache.delete(String(id))
}

async function loadAccount(id) {
  const key = String(id)
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.user

  const user = await User.findById(key).select(FIELDS).lean()
  cache.set(key, { at: Date.now(), user })
  if (cache.size > 2000) cache.clear() // a coarse bound; the cache is only an optimisation
  return user
}

/**
 * The account behind a token, or null when the token is invalid, expired,
 * revoked, or its account is gone or suspended.
 */
export async function getSessionUser(token) {
  if (!token) return null

  let payload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })
  } catch {
    return null
  }

  const user = await loadAccount(payload.id)
  if (!user || user.status === 'suspended') return null
  if ((user.tokenVersion || 0) !== (payload.tv || 0)) return null

  return {
    id: String(user._id),
    email: user.email,
    name: user.name || '',
    role: user.role,
    studentId: user.studentId || '',
    mustChangePassword: Boolean(user.mustChangePassword),
  }
}

/** The raw token from the cookie (or the legacy Bearer header). */
export function tokenFromRequest(req) {
  if (req.cookies?.token) return req.cookies.token
  const header = req.headers.authorization
  return header?.startsWith('Bearer ') ? header.split(' ')[1] : null
}
