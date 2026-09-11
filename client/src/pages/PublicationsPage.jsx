import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

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
  formatDate,
} from '../components/ui'

/** Module constant: it is part of the URL-state memo key. */
const LIST_DEFAULTS = { page: 1 }

/** One citation line, with a collapsible abstract. */
function Publication({ pub, locale, expanded, onToggle }) {
  const { t } = useTranslation()
  const { title, authors, journal, link, description } = pub
  const date = pub.date || pub.createdAt

  return (
    <li className="group relative py-5 pl-8">
      {/* Copper tick in the margin — a list marker that belongs to the design
          system rather than the browser's default bullet. */}
      <span
        aria-hidden="true"
        className="absolute left-0 top-[1.85rem] h-px w-4 bg-ink-200 transition-all duration-300 group-hover:w-5 group-hover:bg-accent-500"
      />

      <p className="text-[15px] leading-relaxed text-ink-700">
        {authors && <span className="text-ink-500">{authors}, </span>}
        {/* The title opens this publication's own page, which carries the
            abstract, the citation and the BibTeX. The publisher's copy is one
            click further in, via "Read the paper" there — and also directly
            from the icon at the end of this line. */}
        <Link to={`/research/publications/${pub._id}`} className="link font-medium">
          “{title},”
        </Link>{' '}
        {journal && <span className="italic text-ink-600">{journal}, </span>}
        <span className="font-mono text-[13px] text-ink-400">
          {formatDate(date, 'monthYear', locale)}
        </span>
        .
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            title="Open the publisher's page"
            className="ml-2 inline-flex translate-y-0.5 text-ink-300 transition-colors hover:text-accent-600"
          >
            <Icon name="external" className="h-3.5 w-3.5" />
            <span className="sr-only">Open the publisher's page</span>
          </a>
        )}
      </p>

      {description && (
        <>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            className="mt-2 font-mono text-[11px] font-medium uppercase tracking-label text-ink-400 transition-colors hover:text-accent-600"
          >
            {expanded ? `− ${t('ui.abstract')}` : `+ ${t('ui.abstract')}`}
          </button>

          {expanded && (
            <p className="mt-3 max-w-prose animate-fade-in whitespace-pre-wrap border-l-2 border-accent-200 pl-4 text-sm font-light leading-relaxed text-ink-500">
              {description}
            </p>
          )}
        </>
      )}
    </li>
  )
}

export default function PublicationsPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US'

  const { values, hrefFor } = useListParams(LIST_DEFAULTS)
  const { page } = values
  const [expandedIds, setExpandedIds] = useState(() => new Set())

  const { data, loading, error, refetch } = useApiQuery('/research', {
    params: { category: 'Publications', page, limit: 15 },
    staleTime: 5 * 60_000,
  })

  const publications = data?.data
  const totalPages = data?.totalPages ?? 1

  const toggleAbstract = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Grouping is O(n) but runs on every keystroke-free render; memoising keeps it
  // off the path when only an abstract toggles.
  const byYear = useMemo(() => {
    const groups = new Map()
    for (const pub of publications ?? []) {
      const source = pub.date || pub.createdAt
      const year = source ? new Date(source).getFullYear() : new Date().getFullYear()
      if (!groups.has(year)) groups.set(year, [])
      groups.get(year).push(pub)
    }
    return [...groups.entries()].sort((a, b) => b[0] - a[0])
  }, [publications])

  return (
    <>
      <PageHeader
        eyebrow={t('ui.eyebrowArchive')}
        title={t('research.pubsTitle')}
        subtitle={t('research.pubsSubtitle')}
      />

      <Section>
        <Shell>
          <div className="mx-auto max-w-4xl">
            {loading ? (
              <div className="space-y-10">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i}>
                    <Skeleton className="mb-6 h-8 w-24" />
                    <div className="space-y-5">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-4 w-4/6" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error && !publications ? (
              <ErrorState message={error.message} onRetry={refetch} />
            ) : byYear.length === 0 ? (
              <EmptyState
                icon={<Icon name="document" className="h-12 w-12" strokeWidth={1} />}
                title={t('research.noPubs')}
              />
            ) : (
              byYear.map(([year, items]) => (
                <section key={year} className="mb-14">
                  {/* Year label sits in the margin on wide screens, so the
                      citations form one continuous column. */}
                  <div className="mb-2 flex items-baseline gap-5 border-b border-ink-900 pb-3">
                    <h2 className="font-display text-3xl font-medium tabular-nums text-ink-950">
                      {year}
                    </h2>
                    <span className="eyebrow">{t('ui.entry', { count: items.length })}</span>
                  </div>

                  <ul className="divide-hairline">
                    {items.map((pub) => (
                      <Publication
                        key={pub._id}
                        pub={pub}
                        locale={locale}
                        expanded={expandedIds.has(pub._id)}
                        onToggle={() => toggleAbstract(pub._id)}
                      />
                    ))}
                  </ul>
                </section>
              ))
            )}

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              hrefFor={(next) => hrefFor({ page: next })}
              loading={loading}
              className="mt-16"
            />
          </div>
        </Shell>
      </Section>
    </>
  )
}
