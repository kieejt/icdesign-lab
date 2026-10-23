import { randomInt } from 'node:crypto'

/** Letters and digits without the look-alikes (0/O, 1/l/I), so a password read out or printed survives. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'

export const MIN_PASSWORD_LENGTH = 10

/** A random password for an account an admin is handing out. 14 characters is ~80 bits. */
export function generatePassword(length = 14) {
  let out = ''
  for (let i = 0; i < length; i += 1) out += ALPHABET[randomInt(ALPHABET.length)]
  return out
}

/** Null when the password is acceptable, otherwise the reason. */
export function passwordProblem(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
  }
  if (password.length > 128) return 'Password must be at most 128 characters'
  return null
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Lower-cased e-mail, or null when it is not one. */
export function normalizeEmail(value) {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  return email.length <= 254 && EMAIL.test(email) ? email : null
}

/** How an account is named in a discussion: its name, else the part of the e-mail before the @. */
export function displayName(user) {
  if (user?.name) return user.name
  const email = user?.email
  return typeof email === 'string' ? email.split('@')[0] : 'Member'
}
