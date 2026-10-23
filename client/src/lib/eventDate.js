/*
 * Dates of lab events.
 *
 * The server stores an event's day as UTC midnight of that calendar day, so the
 * day is formatted and read back in UTC: it never shifts with the viewer's
 * timezone. Older events have only free text (`date`); it is shown as it is and
 * offered to the admin as a starting point when they edit the event.
 */

const formatters = new Map()
function formatterFor(locale) {
  let formatter = formatters.get(locale)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    formatters.set(locale, formatter)
  }
  return formatter
}

const isValid = (date) => date instanceof Date && !Number.isNaN(date.getTime())

/** "14 July 2026", or a range for a multi-day event; falls back to the legacy text. */
export function formatEventDate(event, locale = 'en-US') {
  const start = event?.eventDate ? new Date(event.eventDate) : null
  if (!isValid(start)) return event?.date ?? ''

  const end = event.endDate ? new Date(event.endDate) : null
  const format = formatterFor(locale)
  return isValid(end) && end > start ? `${format.format(start)} – ${format.format(end)}` : format.format(start)
}

/** Date -> "2026-07-14" for an <input type="date">. */
export function toInputDay(value) {
  const date = value ? new Date(value) : null
  return isValid(date) ? date.toISOString().slice(0, 10) : ''
}

/**
 * Best guess at the day in an old free-text date ("14/7/2026", "2026-07-14",
 * "August 15, 2026"). Day-first for slashes, as written in Vietnam. Returns ''
 * when it cannot tell.
 */
export function guessDay(text) {
  if (typeof text !== 'string') return ''
  const value = text.trim()

  const slashed = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(value)
  if (slashed) {
    const [, d, m, y] = slashed.map(Number)
    const date = new Date(Date.UTC(y, m - 1, d))
    return date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? toInputDay(date) : ''
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value

  const parsed = new Date(`${value} UTC`)
  return isValid(parsed) ? toInputDay(parsed) : ''
}

/** Today in Vietnam as "YYYY-MM-DD" (UTC+7 all year), to compare with an input day. */
export function todayInput(now = Date.now()) {
  return new Date(now + 7 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/** 'Upcoming' | 'Past' for a day range typed into the form (ISO days compare as strings). */
export function statusForDays(startDay, endDay, today = todayInput()) {
  if (!startDay) return null
  return (endDay && endDay >= startDay ? endDay : startDay) >= today ? 'Upcoming' : 'Past'
}
