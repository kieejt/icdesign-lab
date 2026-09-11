/**
 * One source of truth for how long a session lasts.
 *
 * The JWT was signed with `expiresIn: '7d'` while the cookie carrying it was set
 * with `maxAge` of one day. The browser therefore dropped the cookie after a
 * day — but the token itself stayed valid for six more, so anything that had
 * captured one (a log, a proxy, an old backup) held a working credential long
 * after the user appeared to be signed out.
 *
 * Both now derive from this value, so they cannot drift apart again.
 */
const HOURS = Number(process.env.SESSION_TTL_HOURS) || 24

/** Session lifetime in milliseconds — for `res.cookie({ maxAge })`. */
export const SESSION_TTL_MS = HOURS * 60 * 60 * 1000

/** The same lifetime in the string form `jsonwebtoken` expects. */
export const SESSION_TTL_JWT = `${HOURS}h`

export default { SESSION_TTL_MS, SESSION_TTL_JWT }
