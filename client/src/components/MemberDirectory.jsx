import React from 'react'
import { Link } from 'react-router-dom'

import useApiQuery from '../hooks/useApiQuery'
import useListParams from '../hooks/useListParams'
import Pagination from './Pagination'
import {
  EmptyState,
  ErrorState,
  Icon,
  Media,
  PageHeader,
  Section,
  Shell,
  SkeletonGrid,
} from './ui'

/** Module constant: it is part of the URL-state memo key. */
const LIST_DEFAULTS = { page: 1 }

/*
 * The Professors, Students and Alumni pages were three files that differed only
 * in a category string, a couple of translation keys and a portrait size. They
 * are now one component; a change to the card is a change in one place.
 */

/** A single person card. `size="lg"` is used for the smaller professor grid. */
function MemberCard({ member, size, basePath }) {
  const large = size === 'lg'

  return (
    <Link to={`${basePath}/${member._id}`} className="group flex flex-col">
      <Media
        src={member.image}
        alt={member.name}
        ratio="aspect-[3/4]"
        className="mb-5"
        fallback={<Icon name="user" className={large ? 'h-14 w-14' : 'h-10 w-10'} strokeWidth={1} />}
      />

      <h3
        className={`font-display font-medium text-ink-950 ${large ? 'text-2xl' : 'text-lg'}`}
      >
        {member.name}
      </h3>
      <p className="eyebrow mt-2">{member.role}</p>

      <div className="mt-4 space-y-2.5 border-t border-paper-border pt-4">
        {/* Plain text, not a mailto: — the whole card is already a link to the
            profile, and a nested anchor would be invalid markup. The address is
            clickable on the profile page itself. */}
        <p className="flex items-center gap-2.5 text-[14.5px] text-ink-500">
          <Icon name="mail" className="h-3.5 w-3.5 shrink-0 text-ink-300" />
          <span className="truncate" title={member.email}>
            {member.email}
          </span>
        </p>

        {member.research && (
          <p className="flex items-start gap-2.5 text-[14.5px] text-ink-500">
            <Icon name="document" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-300" />
            <span className={`font-light leading-relaxed ${large ? '' : 'line-clamp-2'}`}>
              {member.research}
            </span>
          </p>
        )}
      </div>
    </Link>
  )
}

/**
 * Paginated directory of lab members in one category.
 *
 * @param {object} props
 * @param {'Professors'|'Students'|'Alumni'} props.category
 * @param {string} props.basePath  URL prefix for a profile, e.g. `/people/students`
 * @param {string} props.eyebrow
 * @param {string} props.title
 * @param {string} props.subtitle
 * @param {string} props.emptyLabel
 * @param {'md'|'lg'} [props.cardSize] portrait scale; `lg` for the professor grid
 */
export default function MemberDirectory({
  category,
  basePath,
  eyebrow,
  title,
  subtitle,
  emptyLabel,
  cardSize = 'md',
}) {
  const { values, hrefFor } = useListParams(LIST_DEFAULTS)
  const { page } = values

  const { data, loading, error, refetch } = useApiQuery('/members', {
    params: { category, page, limit: 12 },
    staleTime: 5 * 60_000,
  })

  const members = data?.data ?? []
  const totalPages = data?.totalPages ?? 1

  const gridClass =
    cardSize === 'lg'
      ? 'grid grid-cols-1 gap-x-10 gap-y-16 sm:grid-cols-2 lg:grid-cols-3'
      : 'grid grid-cols-2 gap-x-6 gap-y-14 md:grid-cols-4 lg:gap-x-10'

  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />

      <Section>
        <Shell>
          {loading ? (
            <SkeletonGrid count={cardSize === 'lg' ? 6 : 8} variant="person" className={gridClass} />
          ) : error && members.length === 0 ? (
            <ErrorState message={error.message} onRetry={refetch} />
          ) : members.length === 0 ? (
            <EmptyState
              icon={<Icon name="user" className="h-12 w-12" strokeWidth={1} />}
              title={emptyLabel}
            />
          ) : (
            <div className={gridClass}>
              {members.map((member) => (
                <MemberCard
                  key={member._id}
                  member={member}
                  size={cardSize}
                  basePath={basePath}
                />
              ))}
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
