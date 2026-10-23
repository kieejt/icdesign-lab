import React from 'react'
import { useTranslation } from 'react-i18next'

import { formatEventDate } from '../lib/eventDate'
import { Badge, Icon } from './ui'

const monthFormatters = new Map()
function monthOf(date, locale) {
  let formatter = monthFormatters.get(locale)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' })
    monthFormatters.set(locale, formatter)
  }
  return formatter.format(date)
}

/** Day and month at a glance. Older events that only have free-text dates get none. */
function DateBlock({ event, locale }) {
  const date = event.eventDate ? new Date(event.eventDate) : null
  if (!date || Number.isNaN(date.getTime())) return null

  return (
    <div
      className="flex h-14 w-14 shrink-0 flex-col items-center justify-center border border-paper-border bg-paper-sunken leading-none"
      aria-hidden="true"
    >
      <span className="font-display text-xl font-semibold text-ink-950">{date.getUTCDate()}</span>
      <span className="eyebrow mt-1">{monthOf(date, locale)}</span>
    </div>
  )
}

/**
 * One event as a compact card: used by the Events page and the homepage. An
 * event is its title, date and place, so there is nothing to open.
 *
 * Upcoming is the normal state and carries no label; only a past event is
 * marked (and dimmed), because that is the exception worth noticing.
 */
export default function EventCard({ event, locale }) {
  const { t } = useTranslation()
  const past = event.status === 'Past'

  return (
    <article className={`surface flex h-full flex-col gap-4 p-6 ${past ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <DateBlock event={event} locale={locale} />
        {past && <Badge tone="neutral">{t('media.past')}</Badge>}
      </div>

      <div>
        <p className="eyebrow">{formatEventDate(event, locale)}</p>
        <h3 className="mt-2 font-display text-xl font-semibold leading-snug text-ink-950">{event.title}</h3>
        <p className="mt-3 flex items-start gap-2 text-sm text-ink-500">
          <Icon name="pin" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {event.location}
        </p>
      </div>
    </article>
  )
}
