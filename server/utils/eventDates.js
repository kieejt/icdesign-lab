/*
 * Calendar-day arithmetic for lab events.
 *
 * An event's day is a Date at UTC midnight of that calendar day, so "14 July"
 * is the same value for everyone. "Today" is the lab's own: Vietnam time, which
 * is UTC+7 all year.
 */
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000

/** UTC midnight of today's date in Vietnam. */
export function todayInVietnam(now = Date.now()) {
  const local = new Date(now + VIETNAM_OFFSET_MS)
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()))
}

/** "2026-07-14" -> Date at UTC midnight, or null when it is not a real calendar day. */
export function parseDay(value) {
  if (typeof value !== 'string') return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return null
  const [, y, m, d] = match.map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const real = date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
  return real && y >= 1990 && y <= 2100 ? date : null
}

/** Upcoming until the last day of the event is over; legacy events keep the status an admin gave them. */
export function effectiveStatus(event, today = todayInVietnam()) {
  if (!event.eventDate) return event.status
  const lastDay = event.endDate || event.eventDate
  return lastDay >= today ? 'Upcoming' : 'Past'
}

/** Adds the computed status to a (lean) event. */
export const withStatus = (event, today) => ({ ...event, status: effectiveStatus(event, today) })

/** Mongo filter for a status, honouring both dated and legacy events. */
export function statusFilter(status, today = todayInVietnam()) {
  if (status === 'Upcoming') {
    return {
      $or: [
        { eventDate: { $exists: true }, $expr: { $gte: [{ $ifNull: ['$endDate', '$eventDate'] }, today] } },
        { eventDate: { $exists: false }, status: 'Upcoming' },
      ],
    }
  }
  if (status === 'Past') {
    return {
      $or: [
        { eventDate: { $exists: true }, $expr: { $lt: [{ $ifNull: ['$endDate', '$eventDate'] }, today] } },
        { eventDate: { $exists: false }, status: 'Past' },
      ],
    }
  }
  return {}
}
