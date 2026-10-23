import React from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import usePageMeta from '../hooks/usePageMeta'
import useApiQuery from '../hooks/useApiQuery'
import {
  CopyButton,
  DetailHeader,
  DetailSkeleton,
  ErrorState,
  Icon,
  MetaDot,
  NotFoundDetail,
  Section,
  Shell,
  formatDate,
} from '../components/ui'

/**
 * Builds the plain-text citation shown at the top of the page.
 *
 * Kept separate from the rendered markup because it is also what the "copy
 * citation" button puts on the clipboard.
 */
function citationText(pub, locale) {
  const date = pub.date || pub.createdAt

  // Everything that follows the title, in IEEE order.
  const tail = [pub.journal, formatDate(date, 'monthYear', locale)].filter(Boolean).join(', ')

  const lead = pub.authors ? `${pub.authors}, ` : ''

  // The comma belongs inside the closing quote only when something follows it;
  // joining the parts with ', ' would otherwise produce `Title,”, Journal`.
  return tail ? `${lead}“${pub.title},” ${tail}.` : `${lead}“${pub.title}.”`
}

/** A single publication, at `/research/publications/:id`. */
export default function PublicationDetailPage() {
  const { id } = useParams()
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US'

  const { data: pub, loading, error, refetch } = useApiQuery(`/research/${id}`, {
    staleTime: 5 * 60_000,
  })

  usePageMeta({
    title: pub?.title,
    description: pub ? [pub.authors, pub.journal, pub.description].filter(Boolean).join(' · ') : undefined,
    jsonLd: pub && {
      '@context': 'https://schema.org',
      '@type': 'ScholarlyArticle',
      headline: pub.title,
      author: pub.authors ? pub.authors.split(/,| and /).map((name) => ({ '@type': 'Person', name: name.trim() })).filter((a) => a.name) : undefined,
      datePublished: pub.date || pub.createdAt,
      isPartOf: pub.journal ? { '@type': 'Periodical', name: pub.journal } : undefined,
      url: pub.link || undefined,
      description: pub.description || undefined,
    },
  })

  if (loading) return <DetailSkeleton withMedia={false} />

  if (error?.response?.status === 404) {
    return (
      <NotFoundDetail
        title={t('ui.publicationNotFound')}
        description={t('ui.publicationNotFoundBody')}
        backTo="/research/publications"
        backLabel={t('ui.allPublications')}
      />
    )
  }

  if (error || !pub) {
    return (
      <Section>
        <Shell>
          <ErrorState message={error?.message} onRetry={refetch} />
        </Shell>
      </Section>
    )
  }

  const date = pub.date || pub.createdAt
  const citation = citationText(pub, locale)

  return (
    <>
      <DetailHeader
        backTo="/research/publications"
        backLabel={t('research.pubsTitle')}
        eyebrow={t('ui.eyebrowPublication')}
        title={pub.title}
        meta={
          <>
            {pub.journal && (
              <>
                <span className="normal-case tracking-normal italic">{pub.journal}</span>
                <MetaDot />
              </>
            )}
            {date && <time dateTime={date}>{formatDate(date, 'monthYear', locale)}</time>}
          </>
        }
        actions={
          pub.link && (
            <a
              href={pub.link}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary btn-sm"
            >
              <Icon name="external" className="h-3.5 w-3.5" strokeWidth={2} />
              {t('ui.readThePaper')}
            </a>
          )
        }
      />

      <Section>
        <Shell narrow="max-w-4xl">
          {/* --- Authors ------------------------------------------------- */}
          {pub.authors && (
            <section className="mb-10">
              <h2 className="eyebrow">{t('ui.authors')}</h2>
              <p className="mt-2.5 text-[16.5px] leading-relaxed text-ink-700">{pub.authors}</p>
            </section>
          )}

          {/* --- Abstract ------------------------------------------------ */}
          <section>
            <h2 className="eyebrow">{t('ui.abstract')}</h2>
            {pub.description ? (
              <p className="prose-body mt-3 whitespace-pre-wrap">{pub.description}</p>
            ) : (
              <p className="mt-3 text-sm italic text-ink-400">
                {t('ui.noAbstract')}
              </p>
            )}
          </section>

          {/* --- Citation ------------------------------------------------ */}
          <section className="mt-12 border-t border-paper-border pt-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="eyebrow">{t('ui.citeThis')}</h2>
              <CopyButton value={citation} label={t('ui.copyCitation')} />
            </div>
            <p className="mt-3 border-l-2 border-accent-200 pl-4 text-[16.5px] leading-relaxed text-ink-700">
              {citation}
            </p>
          </section>

          {/* --- BibTeX -------------------------------------------------- */}
          {pub.bibtex && (
            <section className="mt-10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="eyebrow">BibTeX</h2>
                <CopyButton value={pub.bibtex} label={t('ui.copyBibtex')} />
              </div>
              {/* Horizontally scrollable rather than wrapped: a broken BibTeX
                  line is worse than a scrollbar, since it gets pasted verbatim. */}
              <pre className="mt-3 overflow-x-auto border border-paper-border bg-paper-sunken p-5 font-mono text-[13.5px] leading-relaxed text-ink-700">
                {pub.bibtex}
              </pre>
            </section>
          )}
        </Shell>
      </Section>
    </>
  )
}
