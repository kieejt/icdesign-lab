import React from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import usePageMeta from '../hooks/usePageMeta'
import useApiQuery from '../hooks/useApiQuery'
import {
  DetailHeader,
  DetailSkeleton,
  ErrorState,
  Icon,
  Media,
  MetaDot,
  NotFoundDetail,
  Section,
  Shell,
  formatDate,
} from '../components/ui'

/** A single research project, at `/research/project/:id`. */
export default function ProjectDetailPage() {
  const { id } = useParams()
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US'

  const { data: project, loading, error, refetch } = useApiQuery(`/research/${id}`, {
    staleTime: 5 * 60_000,
  })

  usePageMeta({
    title: project?.title,
    description: project?.description,
    image: project?.image,
    jsonLd: project && {
      '@context': 'https://schema.org',
      '@type': 'ResearchProject',
      name: project.title,
      description: project.description || undefined,
      image: project.image || undefined,
    },
  })

  if (loading) return <DetailSkeleton />

  // The API answers a deleted or malformed id with 404; anything else is a real
  // failure and is worth offering a retry for.
  if (error?.response?.status === 404) {
    return (
      <NotFoundDetail
        title={t('ui.projectNotFound')}
        description={t('ui.projectNotFoundBody')}
        backTo="/research/project"
        backLabel={t('ui.allProjects')}
      />
    )
  }

  if (error || !project) {
    return (
      <Section>
        <Shell>
          <ErrorState message={error?.message} onRetry={refetch} />
        </Shell>
      </Section>
    )
  }

  return (
    <>
      <DetailHeader
        backTo="/research/project"
        backLabel={t('research.projectsTitle')}
        eyebrow={project.category}
        title={project.title}
        meta={
          <>
            {project.date && (
              <>
                <time dateTime={project.date}>{formatDate(project.date, 'monthYear', locale)}</time>
                {project.authors && <MetaDot />}
              </>
            )}
            {project.authors && <span className="normal-case tracking-normal">{project.authors}</span>}
          </>
        }
        actions={
          project.link && (
            <a
              href={project.link}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary btn-sm"
            >
              <Icon name="external" className="h-3.5 w-3.5" strokeWidth={2} />
              {t('ui.externalPage')}
            </a>
          )
        }
      />

      <Section>
        <Shell>
          {project.image && (
            <Media
              src={project.image}
              alt={project.title}
              ratio="aspect-[16/9]"
              className="mb-10 max-w-4xl border border-paper-border"
              // Above the fold on this page, so it is not lazy-loaded.
              priority
            />
          )}

          <div className="prose-body whitespace-pre-wrap">
            {project.description || (
              <span className="italic text-ink-400">{t('ui.noDescription')}</span>
            )}
          </div>

          {project.journal && (
            <p className="mt-8 border-t border-paper-border pt-6 text-sm text-ink-500">
              <span className="eyebrow mr-3">{t('ui.venue')}</span>
              <span className="italic">{project.journal}</span>
            </p>
          )}
        </Shell>
      </Section>
    </>
  )
}
