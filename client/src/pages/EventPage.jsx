import React from 'react'
import { useTranslation } from 'react-i18next'

import EventCard from '../components/EventCard'
import Pagination from '../components/Pagination'
import useApiQuery from '../hooks/useApiQuery'
import useListParams from '../hooks/useListParams'
import {
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
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US'
  const { values, hrefFor } = useListParams(LIST_DEFAULTS)
  const { page } = values

  const { data, loading, error, refetch } = useApiQuery('/lab-events', {
    params: { page, limit: 9 },
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
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="surface space-y-4 p-6">
                  <Skeleton className="h-14 w-14" />
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-6 w-4/5" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
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
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <EventCard key={event._id} event={event} locale={locale} />
              ))}
            </div>
          )}

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            hrefFor={(next) => hrefFor({ page: next })}
            loading={loading}
            className="mt-12"
          />
        </Shell>
      </Section>
    </>
  )
}
