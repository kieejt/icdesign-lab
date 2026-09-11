import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useAuth } from '../contexts/AuthContext'
import useApiQuery from '../hooks/useApiQuery'
import { youtubeThumbnail } from '../lib/youtube'
import {
  Badge,
  EmptyState,
  ErrorState,
  Icon,
  PageHeader,
  Section,
  Shell,
  SkeletonGrid,
  formatDate,
} from '../components/ui'

/** Card for one lecture module. */
function LectureCard({ lecture, t, locale }) {
  const thumbnail = youtubeThumbnail(lecture.youtubeUrl)

  return (
    <Link
      to={`/lectures/${lecture._id}`}
      className="surface-interactive group flex flex-col overflow-hidden"
    >
      <div className="relative aspect-video shrink-0 overflow-hidden border-b border-paper-border bg-ink-900">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-600">
            <Icon name="play" className="h-10 w-10" strokeWidth={1.5} />
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center bg-ink-950/0 transition-colors duration-300 group-hover:bg-ink-950/25">
          <span className="flex h-12 w-12 scale-90 items-center justify-center rounded-full bg-paper text-ink-950 opacity-0 shadow-lift transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
            <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5 fill-current" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-5 p-5">
        <div>
          <time className="eyebrow" dateTime={lecture.createdAt}>
            {formatDate(lecture.createdAt, 'short', locale)}
          </time>
          <h3 className="mt-2 line-clamp-2 font-display text-base font-semibold leading-snug text-ink-950 transition-colors group-hover:text-accent-700">
            {lecture.title}
          </h3>
          {lecture.description && (
            <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-ink-500">
              {lecture.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-paper-border pt-3.5 font-mono text-[11px] uppercase tracking-label text-ink-400">
          <span className="flex items-center gap-3">
            <span>
              {lecture.views || 0} {t('education.views')}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {lecture.comments?.length || 0} {t('education.qa')}
            </span>
          </span>
          <span className="text-ink-800 transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </div>
      </div>
    </Link>
  )
}

export default function LecturesPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US'
  const { currentUser } = useAuth()

  // `enabled` holds the request until we know there is a session — the endpoint
  // requires auth, and firing it while signed out just produces a 401 in the console.
  const { data, loading, error, refetch } = useApiQuery('/lectures', {
    enabled: Boolean(currentUser),
    staleTime: 60_000,
  })

  const lectures = data ?? []

  /* --- Signed out ---------------------------------------------------- */
  if (!currentUser) {
    return (
      <>
        <PageHeader
          eyebrow={t('ui.eyebrowRestricted')}
          title={t('education.classTitle')}
          subtitle={t('education.classSubtitleRestricted')}
        />

        <Section>
          <Shell>
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center border border-paper-border bg-paper-sunken text-ink-500">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>

              <h2 className="mt-6 font-display text-xl font-semibold text-ink-950">
                {t('education.accessRestricted')}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-500">
                {t('education.accessRestrictedDesc')}
              </p>

              <Link to="/login" className="btn-primary mt-8 w-full">
                {t('education.signIn')}
              </Link>
            </div>
          </Shell>
        </Section>
      </>
    )
  }

  /* --- Signed in ----------------------------------------------------- */
  return (
    <>
      <PageHeader
        eyebrow={t('ui.eyebrowCoursePortal')}
        title={t('education.classTitle')}
        subtitle={t('education.classSubtitle')}
        actions={
          <div className="flex items-center gap-2.5">
            <span className="eyebrow">{t('education.identity')}</span>
            <Badge tone="accent">{currentUser.role}</Badge>
          </div>
        }
      />

      <Section>
        <Shell>
          {loading ? (
            <SkeletonGrid
              count={6}
              variant="article"
              className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
            />
          ) : error ? (
            <ErrorState message={error.message} onRetry={refetch} />
          ) : lectures.length === 0 ? (
            <EmptyState
              icon={<Icon name="play" className="h-12 w-12" strokeWidth={1} />}
              title={t('education.noLectures')}
            />
          ) : (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {lectures.map((lecture) => (
                <LectureCard key={lecture._id} lecture={lecture} t={t} locale={locale} />
              ))}
            </div>
          )}
        </Shell>
      </Section>
    </>
  )
}
