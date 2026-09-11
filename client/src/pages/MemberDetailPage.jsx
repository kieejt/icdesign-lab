import React from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import useApiQuery from '../hooks/useApiQuery'
import {
  DetailHeader,
  DetailSkeleton,
  ErrorState,
  Icon,
  Media,
  NotFoundDetail,
  Section,
  Shell,
} from '../components/ui'

/**
 * The three people lists, keyed by the `:category` segment of the URL.
 *
 * The same component serves `/people/professor/:id`, `/people/students/:id` and
 * `/people/alumni/:id`; this table is what lets the back link point at the list
 * the visitor actually came from.
 */
const CATEGORIES = {
  professor: { titleKey: 'people.profTitle', eyebrow: 'Faculty' },
  students: { titleKey: 'people.studentsTitle', eyebrow: 'Researcher' },
  alumni: { titleKey: 'people.alumniTitle', eyebrow: 'Alumnus' },
}

/** A single lab member, at `/people/:category/:id`. */
export default function MemberDetailPage() {
  const { category, id } = useParams()
  const { t } = useTranslation()

  const section = CATEGORIES[category]

  const { data: member, loading, error, refetch } = useApiQuery(`/members/${id}`, {
    // Skip the request entirely for a category that does not exist.
    enabled: Boolean(section),
    staleTime: 5 * 60_000,
  })

  const backTo = section ? `/people/${category}` : '/people/professor'

  if (!section) {
    return (
      <NotFoundDetail
        title={t('ui.notFoundTitle')}
        description={t('ui.sectionNotFound')}
        backTo="/people/professor"
        backLabel={t('ui.labMembers')}
      />
    )
  }

  if (loading) return <DetailSkeleton />

  if (error?.response?.status === 404) {
    return (
      <NotFoundDetail
        title={t('ui.memberNotFound')}
        description={t('ui.memberNotFoundBody')}
        backTo={backTo}
        backLabel={t(section.titleKey)}
      />
    )
  }

  if (error || !member) {
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
        backTo={backTo}
        backLabel={t(section.titleKey)}
        eyebrow={member.role || section.eyebrow}
        title={member.name}
        actions={
          member.email && (
            <a href={`mailto:${member.email}`} className="btn-secondary btn-sm">
              <Icon name="mail" className="h-3.5 w-3.5" strokeWidth={2} />
              {t('ui.email')}
            </a>
          )
        }
      />

      <Section>
        <Shell>
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
            {/* Portrait */}
            <div className="lg:col-span-4">
              <Media
                src={member.image}
                alt={member.name}
                ratio="aspect-[3/4]"
                className="border border-paper-border"
                priority
                fallback={<Icon name="user" className="h-16 w-16" strokeWidth={1} />}
              />
            </div>

            {/* Profile */}
            <div className="lg:col-span-8">
              <dl className="divide-hairline border-t border-paper-border">
                <div className="flex flex-col gap-1 py-4 sm:flex-row sm:gap-8">
                  <dt className="eyebrow sm:w-40 sm:shrink-0 sm:pt-0.5">{t('ui.position')}</dt>
                  <dd className="text-[15px] text-ink-800">{member.role}</dd>
                </div>

                <div className="flex flex-col gap-1 py-4 sm:flex-row sm:gap-8">
                  <dt className="eyebrow sm:w-40 sm:shrink-0 sm:pt-0.5">{t('ui.group')}</dt>
                  <dd className="text-[15px] text-ink-800">{member.category}</dd>
                </div>

                {member.email && (
                  <div className="flex flex-col gap-1 py-4 sm:flex-row sm:gap-8">
                    <dt className="eyebrow sm:w-40 sm:shrink-0 sm:pt-0.5">{t('ui.email')}</dt>
                    <dd className="text-[15px]">
                      <a href={`mailto:${member.email}`} className="link break-all">
                        {member.email}
                      </a>
                    </dd>
                  </div>
                )}

                {member.research && (
                  <div className="flex flex-col gap-1 py-4 sm:flex-row sm:gap-8">
                    <dt className="eyebrow sm:w-40 sm:shrink-0 sm:pt-0.5">{t('ui.researchInterests')}</dt>
                    <dd className="prose-body whitespace-pre-wrap">{member.research}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </Shell>
      </Section>
    </>
  )
}
