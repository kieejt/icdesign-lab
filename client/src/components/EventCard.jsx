import React from 'react'
import { Link } from 'react-router-dom'
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
 * One event as a compact card: used by the Events page and the homepage.
 *
 * Upcoming is the normal state and carries no label; only a past event is
 * marked (and dimmed), because that is the exception worth noticing.
 */
export default function EventCard({ event, locale }) {
  const { t } = useTranslation()
  const past = event.status === 'Past'

  return (
    <Link
      to={`/lab-event/event/${event._id}`}
      className={`surface-interactive group flex h-full flex-col gap-4 p-6 ${past ? 'opacity-70 hover:opacity-100' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <DateBlock event={event} locale={locale} />
        {past && <Badge tone="neutral">{t('media.past')}</Badge>}
      </div>

      <div>
        <p className="eyebrow">{formatEventDate(event, locale)}</p>
        <h3 className="mt-2 font-display text-xl font-semibold leading-snug text-ink-950 transition-colors group-hover:text-accent-700">
          {event.title}
        </h3>
        <p className="mt-2 flex items-start gap-2 text-sm text-ink-500">
          <Icon name="pin" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {event.location}
        </p>
      </div>

      <p className="line-clamp-3 whitespace-pre-line text-[15px] leading-relaxed text-ink-500">{event.description}</p>

      <span className="link-quiet mt-auto pt-1">
        {t('ui.details')}
        <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5">
          →
        </span>
      </span>
    </Link>
  )
}
