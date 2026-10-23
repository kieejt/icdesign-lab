import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Icon, cx } from './ui'

/**
 * Builds a compact page list with ellipses, e.g. `1 … 4 5 6 … 20`.
 *
 * Rendering every page number works for five pages and falls apart at fifty —
 * the control wraps onto three lines and stops being scannable.
 *
 * @param {number} current
 * @param {number} total
 * @param {number} [siblings] pages shown either side of the current one
 * @returns {(number|'…')[]}
 */
function pageRange(current, total, siblings = 1) {
  const span = siblings * 2 + 5 // current + siblings + first + last + 2 ellipses
  if (total <= span) return Array.from({ length: total }, (_, i) => i + 1)

  const left = Math.max(current - siblings, 1)
  const right = Math.min(current + siblings, total)

  const showLeftEllipsis = left > 2
  const showRightEllipsis = right < total - 1

  const pages = [1]
  if (showLeftEllipsis) pages.push('…')

  for (let page = Math.max(left, 2); page <= Math.min(right, total - 1); page += 1) {
    pages.push(page)
  }

  if (showRightEllipsis) pages.push('…')
  pages.push(total)

  return pages
}

const ARROW_CLASS =
  'flex h-9 items-center gap-1.5 border border-ink-200 px-3 font-mono text-[12.5px] font-medium uppercase tracking-label text-ink-600 transition-colors hover:border-ink-900 hover:text-ink-950'

const PAGE_CLASS =
  'flex h-9 w-9 items-center justify-center border border-ink-200 font-mono text-xs font-medium text-ink-600 transition-colors hover:border-ink-900 hover:text-ink-950'

const DISABLED_CLASS = 'pointer-events-none opacity-35'

/**
 * Prev/Next control: a link, or an inert span when the step would leave the range.
 *
 * Declared at module scope rather than inside `Pagination`. A component defined
 * during render is a new type on every render, so React unmounts and remounts it
 * each time instead of updating it.
 */
function PageStep({ href, onSelect, disabled, onNavigate, children }) {
  if (disabled) {
    return (
      <span aria-disabled="true" className={cx(ARROW_CLASS, DISABLED_CLASS)}>
        {children}
      </span>
    )
  }

  // State-driven lists (the admin tables) have no URL per page, so they get a
  // button; everything public is a real link.
  if (onSelect) {
    return (
      <button type="button" onClick={onSelect} className={ARROW_CLASS}>
        {children}
      </button>
    )
  }

  return (
    <Link to={href} onClick={onNavigate} className={ARROW_CLASS}>
      {children}
    </Link>
  )
}

/**
 * Paginator rendered as real links.
 *
 * Page state lives in the URL, so these are anchors rather than buttons: they
 * can be middle-clicked, opened in a new tab, and copied — and the browser's own
 * Back button steps through pages.
 *
 * @param {object} props
 * @param {number} props.currentPage
 * @param {number} props.totalPages
 * @param {(page: number) => string} [props.hrefFor]  URL for a given page (link mode)
 * @param {(page: number) => void} [props.onPageChange]
 *   Button mode, for lists whose page lives in component state rather than the
 *   URL (the admin tables). Exactly one of `hrefFor` / `onPageChange` is used;
 *   `hrefFor` wins when both are given.
 * @param {boolean} [props.loading]
 * @param {string} [props.scrollTargetId]
 *   Element to bring into view after a page change. Without it the window
 *   scrolls to the top, which is right for a list that starts near it; the news
 *   archive sits far down its page and passes its own anchor instead.
 * @param {string} [props.className]
 */
export default function Pagination({
  currentPage,
  totalPages,
  hrefFor,
  onPageChange,
  loading = false,
  scrollTargetId,
  className,
}) {
  const { t } = useTranslation()

  if (!totalPages || totalPages <= 1) return null

  /*
   * A page number from the URL is untrusted input: `?page=99` on a two-page list
   * is one edited address bar or one stale shared link away. Clamping here keeps
   * the control from ever offering a page that does not exist — previously the
   * Next arrow on an out-of-range page happily linked one further out still.
   *
   * The page itself stays on the empty result and says so; this only governs
   * where the control can take you back to.
   */
  const safePage = Math.min(Math.max(currentPage, 1), totalPages)
  const outOfRange = currentPage !== safePage

  const pages = pageRange(safePage, totalPages)

  // Link mode when a URL builder is supplied, button mode otherwise.
  const linkMode = typeof hrefFor === 'function'
  const stepProps = (target) =>
    linkMode
      ? { href: hrefFor(target), onNavigate: scrollAfterNavigation }
      : { onSelect: () => onPageChange?.(target) }

  const scrollAfterNavigation = () => {
    const target = scrollTargetId && document.getElementById(scrollTargetId)
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    else window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <nav
      aria-label="Pagination"
      className={cx('flex items-center justify-between gap-4', className)}
    >
      <PageStep
        {...stepProps(outOfRange ? totalPages : safePage - 1)}
        disabled={(safePage === 1 && !outOfRange) || loading}
      >
        <Icon name="arrowRight" className="h-3.5 w-3.5 rotate-180" strokeWidth={2} />
        <span className="hidden sm:inline">{t('ui.prev')}</span>
      </PageStep>

      <div className="flex items-center gap-1">
        {pages.map((page, index) =>
          page === '…' ? (
            <span
              key={`gap-${index}`}
              aria-hidden="true"
              className="px-1 font-mono text-xs text-ink-300"
            >
              …
            </span>
          ) : page === currentPage && !outOfRange ? (
            <span
              key={page}
              aria-current="page"
              className="flex h-9 w-9 items-center justify-center bg-ink-950 font-mono text-xs font-medium text-paper"
            >
              {page}
            </span>
          ) : linkMode ? (
            <Link
              key={page}
              to={hrefFor(page)}
              onClick={scrollAfterNavigation}
              aria-label={t('ui.pageNumber', { page })}
              className={cx(PAGE_CLASS, loading && DISABLED_CLASS)}
            >
              {page}
            </Link>
          ) : (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange?.(page)}
              aria-label={t('ui.pageNumber', { page })}
              className={cx(PAGE_CLASS, loading && DISABLED_CLASS)}
            >
              {page}
            </button>
          ),
        )}
      </div>

      <PageStep {...stepProps(safePage + 1)} disabled={safePage === totalPages || loading}>
        <span className="hidden sm:inline">{t('ui.next')}</span>
        <Icon name="arrowRight" className="h-3.5 w-3.5" strokeWidth={2} />
      </PageStep>
    </nav>
  )
}
