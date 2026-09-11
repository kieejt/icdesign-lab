import React from 'react'
import { useTranslation } from 'react-i18next'

import Pagination from './Pagination'
import useApiQuery from '../hooks/useApiQuery'
import useListParams from '../hooks/useListParams'
import {
  Badge,
  EmptyState,
  ErrorState,
  Icon,
  Media,
  PageHeader,
  Section,
  SectionHeading,
  Shell,
  SkeletonCard,
  formatDate,
} from './ui'

const PAGE_SIZE = 20

/** Module constant: it is part of the URL-state memo key. */
const LIST_DEFAULTS = { page: 1, from: '', to: '' }

/** Featured card — image, source, headline, standfirst. */
function FeatureCard({ item, locale }) {
  return (
    <article className="group flex flex-col">
      {item.thumbnail && (
        <Media
          src={item.thumbnail}
          ratio="aspect-[16/10]"
          className="mb-5 border border-paper-border"
        />
      )}

      <div className="flex flex-wrap items-center gap-2.5">
        <Badge>{item.source}</Badge>
        <time className="font-mono text-[11px] text-ink-300" dateTime={item.publishedAt}>
          {formatDate(item.publishedAt, 'long', locale)}
        </time>
      </div>

      <h3 className="mt-3.5 font-display text-xl font-medium leading-snug text-ink-950 transition-colors group-hover:text-accent-700 md:text-2xl">
        <a href={item.url} target="_blank" rel="noopener noreferrer">
          {item.title}
          {/* Stretches the link over the whole card so the entire tile is clickable. */}
          <span className="absolute inset-0" aria-hidden="true" />
        </a>
      </h3>

      <p className="mt-3 line-clamp-3 text-sm font-light leading-relaxed text-ink-500">
        {item.summary}
      </p>
    </article>
  )
}

/** Archive row — dense one-line listing. */
function ArchiveRow({ item, locale }) {
  return (
    <div className="group -mx-3 flex flex-col justify-between gap-2 px-3 py-3.5 transition-colors hover:bg-paper-sunken sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <Badge className="shrink-0">{item.source}</Badge>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate text-sm font-medium text-ink-700 transition-colors group-hover:text-accent-600"
          title={item.title}
        >
          {item.title}
        </a>
      </div>
      <time
        className="shrink-0 font-mono text-[11px] text-ink-300 sm:pl-4"
        dateTime={item.publishedAt}
      >
        {formatDate(item.publishedAt, 'short', locale)}
      </time>
    </div>
  )
}

/** From/To date filter for the archive. */
function DateFilter({ startDate, endDate, onChange, onClear }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="news-from" className="field-label">
          From
        </label>
        <input
          id="news-from"
          type="date"
          value={startDate}
          max={endDate || undefined}
          onChange={(e) => onChange('start', e.target.value)}
          className="field w-auto py-1.5 text-[13px]"
        />
      </div>
      <div>
        <label htmlFor="news-to" className="field-label">
          To
        </label>
        <input
          id="news-to"
          type="date"
          value={endDate}
          min={startDate || undefined}
          onChange={(e) => onChange('end', e.target.value)}
          className="field w-auto py-1.5 text-[13px]"
        />
      </div>
      {(startDate || endDate) && (
        <button type="button" onClick={onClear} className="btn-ghost btn-sm h-[38px]">
          Clear
        </button>
      )}
    </div>
  )
}

/**
 * Two-tier news feed: the newest 20 as cards, everything older as a paginated
 * archive list.
 *
 * @param {object} props
 * @param {string} props.title
 * @param {string} props.subtitle
 * @param {string} props.eyebrow
 * @param {'World News'|'Vietnam News'} props.category
 */
export default function NewsFeedLayout({ title, subtitle, category, eyebrow }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US'

  // Page and both date bounds live in the URL, so a filtered archive view can be
  // reloaded, bookmarked or sent to someone.
  const { values, update, hrefFor } = useListParams(LIST_DEFAULTS)
  const { page: currentPage, from: startDate, to: endDate } = values

  const filters = {
    category,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  }

  /*
   * Featured and archive are two independent queries.
   *
   * They used to run sequentially inside one effect — the archive request did not
   * start until the featured one resolved, doubling time-to-content. Running them
   * as separate cached queries makes them concurrent, and paging the archive no
   * longer refetches the unchanged featured block at all.
   */
  const featured = useApiQuery('/news/published', {
    params: { ...filters, offset: 0, limit: PAGE_SIZE },
  })

  const archive = useApiQuery('/news/published', {
    params: { ...filters, offset: PAGE_SIZE * currentPage, limit: PAGE_SIZE },
  })

  const featuredItems = featured.data?.data ?? []
  const archiveItems = archive.data?.data ?? []

  // `total` counts every article; the first page-worth is shown as featured, so
  // only the remainder is paginated.
  const archiveTotal = Math.max((archive.data?.total ?? 0) - PAGE_SIZE, 0)
  const totalPages = Math.max(Math.ceil(archiveTotal / PAGE_SIZE), 1)

  // `update` drops the page whenever anything other than the page changes, so a
  // narrowed date range can never leave the offset past the end of the results.
  const handleFilterChange = (which, value) =>
    update({ [which === 'start' ? 'from' : 'to']: value })

  const clearFilters = () => update({ from: '', to: '' })

  const isFirstLoad = featured.loading && archive.loading
  const isEmpty = !isFirstLoad && featuredItems.length === 0 && archiveItems.length === 0

  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />

      <Section>
        <Shell>
          {featured.error && featuredItems.length === 0 ? (
            <ErrorState message={featured.error.message} onRetry={featured.refetch} />
          ) : isEmpty ? (
            <EmptyState
              icon={<Icon name="document" className="h-12 w-12" strokeWidth={1} />}
              title={t('media.newsEmpty')}
              action={
                (startDate || endDate) && (
                  <button type="button" onClick={clearFilters} className="btn-secondary btn-sm">
                    Clear filters
                  </button>
                )
              }
            />
          ) : (
            <div className="space-y-20">
              {/* --- Featured --------------------------------------------- */}
              <div className="space-y-10">
                <SectionHeading
                  title={t('media.latestUpdates')}
                  description={t('media.newestStories', { category })}
                />

                {featured.loading ? (
                  <div className="grid grid-cols-1 gap-x-12 gap-y-14 md:grid-cols-2">
                    {Array.from({ length: 4 }, (_, i) => (
                      <SkeletonCard key={i} variant="article" />
                    ))}
                  </div>
                ) : featuredItems.length === 0 ? (
                  <p className="py-8 text-sm font-light text-ink-400">{t('media.noUpdates')}</p>
                ) : (
                  <div className="grid grid-cols-1 gap-x-12 gap-y-14 md:grid-cols-2">
                    {featuredItems.map((item) => (
                      <div key={item._id} className="relative">
                        <FeatureCard item={item} locale={locale} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* --- Archive ---------------------------------------------- */}
              <div id="archive" className="space-y-8 border-t border-ink-900 pt-16">
                <div className="flex flex-col gap-6 border-b border-paper-border pb-6 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h2 className="font-display text-2xl font-medium tracking-tight text-ink-950 md:text-3xl">
                      {t('media.newsArchive')}
                    </h2>
                    <p className="eyebrow mt-2">{t('media.olderArticles', { category })}</p>
                  </div>

                  <DateFilter
                    startDate={startDate}
                    endDate={endDate}
                    onChange={handleFilterChange}
                    onClear={clearFilters}
                  />
                </div>

                {archive.loading ? (
                  <div className="divide-hairline">
                    {Array.from({ length: 8 }, (_, i) => (
                      <div key={i} className="skeleton my-3.5 h-5 w-full" />
                    ))}
                  </div>
                ) : archiveItems.length === 0 ? (
                  <p className="py-8 text-sm font-light text-ink-400">
                    {currentPage === 1 ? t('media.noOlder') : t('media.noMore')}
                  </p>
                ) : (
                  <div className="divide-hairline">
                    {archiveItems.map((item) => (
                      <ArchiveRow key={item._id} item={item} locale={locale} />
                    ))}
                  </div>
                )}

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  hrefFor={(next) => hrefFor({ page: next })}
                  loading={archive.loading}
                  // The archive sits well below the fold, so paging returns to
                  // the top of the archive rather than the top of the page.
                  scrollTargetId="archive"
                  className="border-t border-paper-border pt-8"
                />
              </div>
            </div>
          )}
        </Shell>
      </Section>
    </>
  )
}
