import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import Pagination from '../components/Pagination'
import api from '../lib/api'
import useApiQuery, { invalidateQueries } from '../hooks/useApiQuery'
import useDebouncedValue from '../hooks/useDebouncedValue'
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
  cx,
} from '../components/ui'

/**
 * Module constant: it is part of the URL-state memo key.
 *
 * Every one of these is reflected in the query string, so a filtered catalogue
 * — `/documents?search=vlsi&type=Free&page=2` — can be bookmarked or sent to
 * someone and comes back exactly as it was.
 */
const LIST_DEFAULTS = { page: 1, search: '', type: 'All', owned: 'All' }

/** Segmented single-choice control. */
function SegmentedControl({ label, options, value, onChange }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="eyebrow">{label}</span>
      <div className="flex border border-paper-border bg-paper-raised p-0.5" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            aria-pressed={value === option.key}
            className={cx(
              'px-3.5 py-1.5 font-mono text-[11px] font-medium uppercase tracking-label transition-colors',
              value === option.key
                ? 'bg-ink-950 text-paper'
                : 'text-ink-500 hover:bg-paper-sunken hover:text-ink-900',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function DocumentsPage() {
  const { t } = useTranslation()

  const { values, update, hrefFor } = useListParams(LIST_DEFAULTS)
  const { page, search, type: filterType, owned: filterOwned } = values

  /*
   * The search box is uncontrolled with respect to the URL.
   *
   * Typing writes to the URL on a debounce; writing every keystroke would put
   * one history entry per character and fire a request per character too. Local
   * state keeps the input responsive in between.
   */
  const [searchDraft, setSearchDraft] = useState(search)
  const debouncedDraft = useDebouncedValue(searchDraft, 400)

  // Push the settled search term into the URL. `replace` so Back leaves the
  // list rather than retyping the query backwards one character at a time.
  useEffect(() => {
    if (debouncedDraft !== search) update({ search: debouncedDraft }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs on the settled draft only
  }, [debouncedDraft])

  // Keep the box in step when the URL changes from outside it — Back/Forward, or
  // a link that carries its own search term. Adjusting during render rather than
  // in an effect means the input never paints one frame with the stale value.
  const [lastSearch, setLastSearch] = useState(search)
  if (search !== lastSearch) {
    setLastSearch(search)
    setSearchDraft(search)
  }

  const { data, loading, isValidating, error, refetch } = useApiQuery('/documents', {
    params: {
      page,
      limit: 10,
      search: search || undefined,
      type: filterType === 'All' ? undefined : filterType,
      owned: filterOwned === 'All' ? undefined : filterOwned,
    },
  })

  const books = data?.data ?? []
  const totalPages = data?.totalPages ?? 1
  const total = data?.total ?? 0

  /**
   * Records the download, then opens the file.
   *
   * The counter is best-effort: if the tracking call fails the file still opens
   * from the URL already in hand, so a metrics outage never blocks a download.
   */
  const handleDownload = async (book) => {
    try {
      const response = await api.post(`/documents/${book._id}/download`)
      // The count changed, so the cached listing is now stale.
      invalidateQueries('/documents')
      window.open(response.data.downloadUrl || book.downloadUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      console.warn('Failed to record download', err)
      if (book.downloadUrl) window.open(book.downloadUrl, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={t('home.teachingMaterials')}
        title={t('education.docsTitle')}
        subtitle={t('education.docsSubtitle')}
      />

      <Section>
        <Shell>
          {/* --- Controls ------------------------------------------------ */}
          <div className="flex flex-col gap-6 border-b border-paper-border pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="w-full max-w-md">
              <label htmlFor="doc-search" className="field-label">
                {t('ui.searchCatalogue')}
              </label>
              <div className="relative">
                <Icon
                  name="search"
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300"
                />
                <input
                  id="doc-search"
                  type="search"
                  className="field pl-10"
                  placeholder={t('education.searchDocs')}
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-5">
              <SegmentedControl
                label={t('ui.filterAccess')}
                value={filterType}
                onChange={(next) => update({ type: next })}
                options={[
                  { key: 'All', label: t('education.allAccess') },
                  { key: 'Free', label: t('education.free') },
                  { key: 'Paid', label: t('education.paid') },
                ]}
              />
              <SegmentedControl
                label={t('ui.filterSource')}
                value={filterOwned}
                onChange={(next) => update({ owned: next })}
                options={[
                  { key: 'All', label: t('education.allSources') },
                  { key: 'Owned', label: t('education.labOwned') },
                ]}
              />
            </div>
          </div>

          {/* Result count doubles as the "refreshing" indicator, so filtering
              never blanks the table the visitor is reading. */}
          <p className="mt-4 font-mono text-[11px] uppercase tracking-label text-ink-400">
            {loading ? t('ui.loading') : t('ui.entry', { count: total })}
            {isValidating && !loading && (
              <span className="ml-2 text-ink-300">{t('ui.updating')}</span>
            )}
          </p>

          {/* --- Catalogue ----------------------------------------------- */}
          <div className="mt-6">
            {loading ? (
              <div className="divide-hairline border-t border-ink-900">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="flex items-center gap-6 py-6">
                    <div className="flex-1 space-y-2.5">
                      <Skeleton className="h-5 w-2/3" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-8 w-28 shrink-0" />
                  </div>
                ))}
              </div>
            ) : error && books.length === 0 ? (
              <ErrorState message={error.message} onRetry={refetch} />
            ) : books.length === 0 ? (
              <EmptyState
                icon={<Icon name="document" className="h-12 w-12" strokeWidth={1} />}
                title={t('education.noBooksTitle')}
                description={t('education.noBooksDesc')}
              />
            ) : (
              <div className="overflow-x-auto border-t border-ink-900">
                <table className="min-w-full text-left">
                  <caption className="sr-only">{t('education.docsTitle')}</caption>
                  <thead>
                    <tr className="bg-paper-sunken">
                      <th scope="col" className="eyebrow w-1/2 px-4 py-3.5 text-left">
                        {t('education.bookTitleInfo')}
                      </th>
                      <th scope="col" className="eyebrow w-1/5 px-4 py-3.5 text-left">
                        {t('education.subject')}
                      </th>
                      <th scope="col" className="eyebrow px-4 py-3.5 text-left">
                        {t('education.reference')}
                      </th>
                      <th scope="col" className="eyebrow px-4 py-3.5 text-right">
                        {t('education.download')}
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-paper-border">
                    {books.map((book) => (
                      <tr key={book._id} className="group transition-colors hover:bg-paper-sunken">
                        <td className="px-4 py-5 align-top">
                          <h3 className="font-display text-[17px] font-semibold leading-snug text-ink-950">
                            {book.title}
                          </h3>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge tone={book.type === 'Free' ? 'ok' : 'warn'}>
                              {book.type === 'Free'
                                ? t('education.freeAccess')
                                : t('education.purchaseReq')}
                            </Badge>
                            {book.isLabOwned && (
                              <Badge tone="accent">{t('education.labOwnedEd')}</Badge>
                            )}
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-4 py-5 align-top text-sm text-ink-500">
                          {book.subject || t('education.general')}
                        </td>

                        <td className="whitespace-nowrap px-4 py-5 align-top">
                          {book.link ? (
                            <a
                              href={book.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="link inline-flex items-center gap-1.5 text-[13px]"
                            >
                              {t('education.details').replace('→', '').trim()}
                              <Icon name="external" className="h-3.5 w-3.5" />
                            </a>
                          ) : (
                            <span className="text-ink-300">—</span>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-5 text-right align-top">
                          {book.isLabOwned && book.downloadUrl ? (
                            <button
                              type="button"
                              onClick={() => handleDownload(book)}
                              className="btn-primary btn-sm"
                            >
                              <Icon name="download" className="h-3.5 w-3.5" strokeWidth={2} />
                              {t('education.downloadGDrive')}
                            </button>
                          ) : (
                            <span className="text-ink-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            hrefFor={(next) => hrefFor({ page: next })}
            loading={loading}
            className="mt-10"
          />
        </Shell>
      </Section>
    </>
  )
}
