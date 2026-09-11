import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import Pagination from './Pagination'
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
  formatDate,
} from './ui'

const PAGE_SIZE = 20

/** Module constant: it is part of the URL-state memo key. */
const LIST_DEFAULTS = { page: 1, from: '', to: '' }

/** Matches Hanoi in either language, plus the common "HN" shorthand. */
const HANOI_PATTERN = /hanoi|hà nội|ha noi|\bhn\b/i

/**
 * Relative age for recent postings, absolute date beyond a week.
 *
 * A job listed "3 days ago" tells a reader what they need; the same listing from
 * March needs a real date.
 */
function postedLabel(value, t, locale) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000)
  if (days <= 0) return t('jobs.today')
  if (days === 1) return t('jobs.yesterday')
  if (days < 7) return t('jobs.daysAgo', { count: days })

  return formatDate(date, 'short', locale)
}

/** A single job posting row. */
function JobCard({ job, t, locale }) {
  return (
    <article className="group relative flex flex-col gap-5 border-b border-paper-border py-7 transition-colors hover:bg-paper-sunken sm:flex-row sm:items-start">
      {job.thumbnail && (
        <div className="hidden h-16 w-16 shrink-0 items-center justify-center border border-paper-border bg-paper-raised p-2 sm:flex">
          <img
            src={job.thumbnail}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain"
          />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge>{job.source || t('jobs.company')}</Badge>
          <span className="font-mono text-[11px] text-ink-400">
            {postedLabel(job.publishedAt, t, locale)}
          </span>
        </div>

        <h3 className="mt-2.5 font-display text-lg font-semibold leading-snug text-ink-950 transition-colors group-hover:text-accent-700">
          <a href={job.url} target="_blank" rel="noopener noreferrer">
            {/* Covers the whole row, so anywhere on the card opens the posting. */}
            <span className="absolute inset-0" aria-hidden="true" />
            {job.title}
          </a>
        </h3>

        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-500">{job.summary}</p>
      </div>

      <div className="relative z-10 shrink-0 self-start sm:self-center">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary btn-sm group-hover:border-ink-900"
        >
          {t('jobs.applyNow')}
          <Icon name="external" className="h-3.5 w-3.5" strokeWidth={2} />
        </a>
      </div>
    </article>
  )
}

/**
 * Job and internship board, grouped by location.
 *
 * @param {object} props
 * @param {string} props.title
 * @param {string} props.subtitle
 * @param {string} props.eyebrow
 * @param {'Jobs'} props.category
 */
export default function JobsFeedLayout({ title, subtitle, category, eyebrow }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US'

  const { values, update, hrefFor } = useListParams(LIST_DEFAULTS)
  const { page: currentPage, from: startDate, to: endDate } = values

  const { data, loading, error, refetch } = useApiQuery('/news/published', {
    params: {
      category,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      offset: (currentPage - 1) * PAGE_SIZE,
      limit: PAGE_SIZE,
    },
  })

  // Memoised so the location split below isn't recomputed on every render.
  const jobs = useMemo(() => data?.data ?? [], [data])
  const totalPages = Math.max(Math.ceil((data?.total ?? 0) / PAGE_SIZE), 1)

  // Split once per data change rather than twice per render — the old version
  // built the "other" list with an O(n²) `hanoiJobs.includes` lookup per item.
  const { hanoiJobs, otherJobs } = useMemo(() => {
    const hanoi = []
    const other = []
    for (const job of jobs) {
      const haystack = `${job.title} ${job.summary} ${(job.tags || []).join(' ')}`
      ;(HANOI_PATTERN.test(haystack) ? hanoi : other).push(job)
    }
    return { hanoiJobs: hanoi, otherJobs: other }
  }, [jobs])

  // `update` drops the page whenever anything else changes, so narrowing the
  // date range can never leave the offset past the end of the results.
  const clearFilters = () => update({ from: '', to: '' })

  const renderGroup = (items, heading) => {
    if (items.length === 0) return null
    return (
      <section className="mb-12">
        <h2 className="border-b border-ink-900 pb-3 font-display text-xl font-semibold text-ink-950">
          {heading}
          <span className="ml-3 font-mono text-[11px] font-normal tracking-label text-ink-400">
            {items.length}
          </span>
        </h2>
        <div>
          {items.map((job) => (
            <JobCard key={job._id} job={job} t={t} locale={locale} />
          ))}
        </div>
      </section>
    )
  }

  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />

      <Section>
        <Shell>
          <div className="mx-auto max-w-5xl">
            {/* Filter bar */}
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border border-paper-border bg-paper-raised px-5 py-4">
              <p className="eyebrow">Filter by date</p>

              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label htmlFor="jobs-from" className="field-label">
                    From
                  </label>
                  <input
                    id="jobs-from"
                    type="date"
                    value={startDate}
                    max={endDate || undefined}
                    onChange={(e) => update({ from: e.target.value })}
                    className="field w-auto py-1.5 text-[13px]"
                  />
                </div>
                <div>
                  <label htmlFor="jobs-to" className="field-label">
                    To
                  </label>
                  <input
                    id="jobs-to"
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(e) => update({ to: e.target.value })}
                    className="field w-auto py-1.5 text-[13px]"
                  />
                </div>
                {(startDate || endDate) && (
                  <button type="button" onClick={clearFilters} className="btn-ghost btn-sm h-[38px]">
                    Clear
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="space-y-1">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="space-y-3 border-b border-paper-border py-7">
                    <Skeleton className="h-2.5 w-32" />
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            ) : error && jobs.length === 0 ? (
              <ErrorState message={error.message} onRetry={refetch} />
            ) : jobs.length === 0 ? (
              <EmptyState
                icon={<Icon name="document" className="h-12 w-12" strokeWidth={1} />}
                title={t('jobs.noActiveJobs')}
                action={
                  (startDate || endDate) && (
                    <button type="button" onClick={clearFilters} className="btn-secondary btn-sm">
                      Clear filters
                    </button>
                  )
                }
              />
            ) : (
              <>
                {renderGroup(hanoiJobs, t('jobs.hanoiJobs'))}
                {renderGroup(otherJobs, t('jobs.otherCityJobs'))}
              </>
            )}

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              hrefFor={(next) => hrefFor({ page: next })}
              loading={loading}
              className="mt-12 border-t border-paper-border pt-8"
            />
          </div>
        </Shell>
      </Section>
    </>
  )
}
