import React from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import usePageMeta from '../hooks/usePageMeta'
import useApiQuery from '../hooks/useApiQuery'
import { formatEventDate } from '../lib/eventDate'
import {
  Badge,
  DetailHeader,
  DetailSkeleton,
  ErrorState,
  Icon,
  MetaDot,
  NotFoundDetail,
  Section,
  Shell,
} from '../components/ui'

/** A single lab event, at `/lab-event/event/:id`. */
export default function EventDetailPage() {
  const { id } = useParams()
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US'

  const { data: event, loading, error, refetch } = useApiQuery(`/lab-events/${id}`, {
    staleTime: 5 * 60_000,
  })

  usePageMeta({
    title: event?.title,
    description: event?.description,
  })

  if (loading) return <DetailSkeleton withMedia={false} />

  if (error?.response?.status === 404) {
    return (
      <NotFoundDetail
        title={t('ui.eventNotFound')}
        description={t('ui.eventNotFoundBody')}
        backTo="/lab-event/event"
        backLabel={t('ui.allEvents')}
      />
    )
  }

  if (error || !event) {
    return (
      <Section>
        <Shell>
          <ErrorState message={error?.message} onRetry={refetch} />
        </Shell>
      </Section>
    )
  }

  const isUpcoming = event.status === 'Upcoming'

  return (
    <>
      <DetailHeader
        backTo="/lab-event/event"
        backLabel={t('media.eventsTitle')}
        eyebrow={t('ui.eyebrowLabEvent')}
        title={event.title}
        meta={
          <>
            <span>{formatEventDate(event, locale)}</span>
            <MetaDot />
            <span className="inline-flex items-center gap-1.5 normal-case tracking-normal">
              <Icon name="pin" className="h-3.5 w-3.5" />
              {event.location}
            </span>
          </>
        }
        actions={isUpcoming ? undefined : <Badge tone="neutral">{t('media.past')}</Badge>}
      />

      <Section>
        <Shell>
          <div className="prose-body whitespace-pre-wrap">{event.description}</div>
        </Shell>
      </Section>
    </>
  )
}
