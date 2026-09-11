import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import Pagination from '../components/Pagination'
import useApiQuery from '../hooks/useApiQuery'
import useListParams from '../hooks/useListParams'
import {
  EmptyState,
  ErrorState,
  Icon,
  Media,
  PageHeader,
  Section,
  Shell,
  Skeleton,
} from '../components/ui'

/**
 * Repeating 8/4/6/6 column rhythm.
 *
 * A uniform three-across grid makes every project look equally weighted; the
 * alternating widths give the page an editorial cadence and let the first
 * project in each cycle carry more presence.
 */
const SPANS = ['md:col-span-8', 'md:col-span-4', 'md:col-span-6', 'md:col-span-6']

/** Module constant: it is part of the URL-state memo key. */
const LIST_DEFAULTS = { page: 1 }

export default function ProjectPage() {
  const { t } = useTranslation()
  const { values, hrefFor } = useListParams(LIST_DEFAULTS)
  const { page } = values

  const { data, loading, error, refetch } = useApiQuery('/research', {
    params: { category: 'Project', page, limit: 9 },
    staleTime: 5 * 60_000,
  })

  const projects = data?.data ?? []
  const totalPages = data?.totalPages ?? 1

  return (
    <>
      <PageHeader
        eyebrow={t('ui.eyebrowResearch')}
        title={t('research.projectsTitle')}
        subtitle={t('research.projectsSubtitle')}
      />

      <Section tone="sunken">
        <Shell>
          {loading ? (
            <div className="grid grid-cols-1 gap-y-16 md:grid-cols-12 md:gap-x-12 lg:gap-x-16">
              {SPANS.slice(0, 3).map((span, i) => (
                <div key={i} className={span}>
                  <Skeleton className="mb-7 aspect-[4/3] w-full" />
                  <Skeleton className="mb-4 h-3 w-24" />
                  <Skeleton className="mb-3 h-9 w-4/5" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          ) : error && projects.length === 0 ? (
            <ErrorState message={error.message} onRetry={refetch} />
          ) : projects.length === 0 ? (
            <EmptyState
              icon={<Icon name="chip" className="h-12 w-12" strokeWidth={1} />}
              title={t('research.noProjects')}
            />
          ) : (
            <div className="grid grid-cols-1 gap-y-16 md:grid-cols-12 md:gap-x-12 lg:gap-x-16">
              {projects.map((project, index) => (
                <Link
                  key={project._id}
                  to={`/research/project/${project._id}`}
                  className={`group flex flex-col ${SPANS[index % SPANS.length]}`}
                >
                  <Media
                    src={project.image}
                    alt={project.title}
                    ratio="aspect-[4/3]"
                    className="mb-7"
                    fallback={<Icon name="chip" className="h-14 w-14" strokeWidth={1} />}
                  />
                  <p className="eyebrow">{project.category}</p>
                  <h2 className="mt-3 font-display text-2xl font-medium leading-tight text-ink-950 transition-colors group-hover:text-accent-700 md:text-3xl">
                    {project.title}
                  </h2>
                  <p className="mt-4 line-clamp-4 max-w-3xl whitespace-pre-wrap text-[15px] font-light leading-relaxed text-ink-500">
                    {project.description}
                  </p>
                  <span className="link-quiet mt-5">
                    {t('ui.readMore')}
                    <span
                      aria-hidden="true"
                      className="transition-transform duration-200 group-hover:translate-x-0.5"
                    >
                      →
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            hrefFor={(next) => hrefFor({ page: next })}
            loading={loading}
            className="mt-20"
          />
        </Shell>
      </Section>
    </>
  )
}
