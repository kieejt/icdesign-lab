import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import Pagination from '../components/Pagination'
import useApiQuery from '../hooks/useApiQuery'
import useListParams from '../hooks/useListParams'
import {
  Badge,
  EmptyState,
  ErrorState,
  Icon,
  PageHeader,
  Section,
  Shell,
  Skeleton,
} from '../components/ui'

/** Module constant: it is part of the URL-state memo key. */
const LIST_DEFAULTS = { page: 1 }

export default function EventPage() {
  const { t } = useTranslation()
  const { values, hrefFor } = useListParams(LIST_DEFAULTS)
  const { page } = values

  const { data, loading, error, refetch } = useApiQuery('/lab-events', {
    params: { page, limit: 10 },
    staleTime: 5 * 60_000,
  })

  const events = data?.data ?? []
  const totalPages = data?.totalPages ?? 1

  return (
    <>
      <PageHeader
        eyebrow={t('ui.eyebrowCalendar')}
        title={t('media.eventsTitle')}
        subtitle={t('media.eventsSubtitle')}
      />

      <Section>
        <Shell>
          {loading ? (
            <div className="divide-hairline">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex flex-col gap-6 py-10 md:flex-row md:gap-12">
                  <div className="space-y-3 md:w-1/4">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                </div>
              ))}
            </div>
          ) : error && events.length === 0 ? (
            <ErrorState message={error.message} onRetry={refetch} />
          ) : events.length === 0 ? (
            <EmptyState
              icon={<Icon name="calendar" className="h-12 w-12" strokeWidth={1} />}
              title={t('media.noEvents')}
            />
          ) : (
            <div className="divide-hairline">
              {events.map((event) => {
                const isUpcoming = event.status === 'Upcoming'
                return (
                  <Link
                    key={event._id}
                    to={`/lab-event/event/${event._id}`}
                    className={`group flex flex-col gap-6 py-10 transition-colors md:flex-row md:gap-12 ${
                      isUpcoming ? '' : 'opacity-65 hover:opacity-100'
                    }`}
                  >
                    {/* Metadata rail */}
                    <div className="flex shrink-0 flex-col gap-3 md:w-1/4">
                      <Badge tone={isUpcoming ? 'ok' : 'neutral'}>
                        {isUpcoming && (
                          <span className="h-1.5 w-1.5 rounded-full bg-signal-ok" aria-hidden="true" />
                        )}
                        {event.status}
                      </Badge>

                      {/* The date is set as free text by the admin, so it is
                          displayed verbatim rather than parsed. */}
                      <p className="font-display text-2xl font-light tracking-tight text-ink-950">
                        {event.date}
                      </p>

                      <p className="flex items-start gap-2 text-[13px] font-light text-ink-400">
                        <Icon name="pin" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {event.location}
                      </p>
                    </div>

                    <div className="flex-1">
                      <h2 className="font-display text-2xl font-medium leading-tight text-ink-950 transition-colors group-hover:text-accent-700 md:text-3xl">
                        {event.title}
                      </h2>
                      <p className="mt-4 line-clamp-3 max-w-4xl whitespace-pre-wrap text-[15px] font-light leading-relaxed text-ink-500">
                        {event.description}
                      </p>
                      <span className="link-quiet mt-4">
                        {t('ui.details')}
                        <span
                          aria-hidden="true"
                          className="transition-transform duration-200 group-hover:translate-x-0.5"
                        >
                          →
                        </span>
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            hrefFor={(next) => hrefFor({ page: next })}
            loading={loading}
            className="mt-16"
          />
        </Shell>
      </Section>
    </>
  )
}
