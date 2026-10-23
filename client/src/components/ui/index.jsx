import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { CARD_SIZES, responsiveImage } from '../../lib/image'

/*
 * Shared UI primitives.
 *
 * Everything visual that appeared in three or more pages lives here, so a change
 * to the page header, an empty state or a skeleton happens once instead of
 * fourteen times.
 */

/** Joins class names, dropping falsy values. */
export const cx = (...parts) => parts.filter(Boolean).join(' ')

/* -------------------------------------------------------------------------- */
/* Layout                                                                      */
/* -------------------------------------------------------------------------- */

/** The site's outer content rail. */
export function Shell({ as: Tag = 'div', className, narrow, children }) {
  // `narrow` caps the reading width while keeping the left edge on the same rail
  // as the page header. Putting max-w-* on the shell itself re-centres it, which
  // pushes the content right of the heading it belongs to.
  return (
    <Tag className={cx('shell', className)}>
      {narrow ? <div className={narrow}>{children}</div> : children}
    </Tag>
  )
}

/** Vertical rhythm wrapper for a page section. */
export function Section({ as: Tag = 'section', tone = 'default', className, children }) {
  const tones = {
    default: '',
    sunken: 'bg-paper-sunken',
    ink: 'bg-ink-950 text-paper',
  }
  return (
    <Tag className={cx('w-full py-12 sm:py-16 lg:py-20', tones[tone], className)}>{children}</Tag>
  )
}

/* -------------------------------------------------------------------------- */
/* Headings                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The masthead every inner page opens with.
 *
 * Deliberately compact: an academic page introduces itself in a line and gets
 * out of the way, so the first listing sits near the fold instead of below a
 * viewport-filling title block.
 */
export function PageHeader({ eyebrow, title, subtitle, actions, align = 'left' }) {
  return (
    <header
      className={cx(
        'w-full border-b border-paper-border bg-paper-raised pb-10 pt-10 sm:pb-12 sm:pt-14',
        align === 'center' && 'text-center',
      )}
    >
      <Shell>
        <div
          className={cx(
            'flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between',
            align === 'center' && 'items-center lg:flex-col lg:items-center',
          )}
        >
          <div className={cx('animate-fade-up', align === 'center' && 'mx-auto')}>
            {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
            <h1 className="text-display-md max-w-3xl font-semibold text-ink-950">{title}</h1>
            {subtitle && (
              <p className={cx('lede mt-4', align === 'center' && 'mx-auto')}>{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
        </div>
      </Shell>
    </header>
  )
}

/** Section heading with the hairline rule and an optional trailing link/control. */
export function SectionHeading({ title, description, action, size = 'md', id }) {
  const sizes = {
    sm: 'text-lg sm:text-xl',
    md: 'text-xl sm:text-2xl',
    lg: 'text-2xl sm:text-[1.75rem]',
  }
  return (
    <div className="section-rule" id={id}>
      <div>
        <h2 className={cx('font-semibold tracking-tight text-ink-950', sizes[size])}>{title}</h2>
        {description && <p className="eyebrow mt-2">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Feedback states                                                             */
/* -------------------------------------------------------------------------- */

/** A single shimmering placeholder block. */
export function Skeleton({ className }) {
  return <div className={cx('skeleton', className)} aria-hidden="true" />
}

/**
 * Skeleton that mirrors a real card, so the layout doesn't jump when data lands.
 *
 * @param {'card'|'person'|'row'|'article'} variant
 */
export function SkeletonCard({ variant = 'card' }) {
  if (variant === 'person') {
    return (
      <div className="flex flex-col">
        <Skeleton className="mb-5 aspect-[3/4] w-full" />
        <Skeleton className="mb-2 h-5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    )
  }

  if (variant === 'row') {
    return (
      <div className="flex items-center gap-5 py-5">
        <Skeleton className="h-16 w-16 shrink-0 sm:h-24 sm:w-24" />
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    )
  }

  if (variant === 'article') {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="aspect-[16/10] w-full" />
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    )
  }

  return (
    <div className="surface flex flex-col gap-4 p-6">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-6 w-4/5" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  )
}

/** Repeats a skeleton `count` times inside a grid the caller supplies. */
export function SkeletonGrid({ count = 6, variant = 'card', className }) {
  return (
    <div className={className}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} variant={variant} />
      ))}
    </div>
  )
}

/** Neutral "nothing here" state. */
export function EmptyState({ title, description, icon, action }) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-paper-border px-6 py-20 text-center">
      {icon && <div className="mb-5 text-ink-300">{icon}</div>}
      <p className="font-display text-xl font-medium text-ink-800">{title}</p>
      {description && <p className="mt-2 max-w-md text-sm font-light text-ink-400">{description}</p>}
      {action && <div className="mt-7">{action}</div>}
    </div>
  )
}

/** Error state with a retry affordance. */
export function ErrorState({ message, onRetry }) {
  const { t } = useTranslation()

  return (
    <div className="border border-signal-danger/25 bg-signal-dangerSoft px-6 py-8 text-center">
      <p className="eyebrow text-signal-danger">{t('ui.somethingWentWrong')}</p>
      <p className="mt-3 text-sm text-ink-700">
        {message || t('ui.couldNotLoad')}
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary btn-sm mt-6">
          {t('ui.tryAgain')}
        </button>
      )}
    </div>
  )
}

/** Indeterminate spinner, for the few places a skeleton cannot model the shape. */
export function Spinner({ className }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cx(
        'h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-ink-900',
        className,
      )}
    />
  )
}

/* -------------------------------------------------------------------------- */
/* Content atoms                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Fixed-ratio image frame with a hatched placeholder when there is no source.
 * `ratio` is any Tailwind aspect utility.
 */
export function Media({
  src,
  alt = '',
  ratio = 'aspect-[4/3]',
  className,
  priority = false,
  fallback,
  sizes = CARD_SIZES,
}) {
  return (
    <div className={cx('media-frame', ratio, className)}>
      {src ? (
        <img
          {...responsiveImage(src)}
          sizes={sizes}
          alt={alt}
          // Below-the-fold images stay out of the critical path; the hero opts in
          // with priority so it is fetched eagerly as the LCP element.
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          fetchPriority={priority ? 'high' : 'auto'}
        />
      ) : (
        <div className="hatch flex h-full w-full items-center justify-center text-ink-300">
          {fallback}
        </div>
      )}
    </div>
  )
}

/** Small mono metadata chip (source name, category, status). */
export function Badge({ tone = 'neutral', children, className }) {
  const tones = {
    neutral: 'badge-neutral',
    accent: 'badge-accent',
    ok: 'badge-ok',
    warn: 'badge-warn',
    danger: 'badge-danger',
  }
  return <span className={cx(tones[tone], className)}>{children}</span>
}

/** "View all →" style link. Renders a router Link for internal paths. */
export function QuietLink({ to, href, children, className, ...rest }) {
  const content = (
    <>
      {children}
      <span aria-hidden="true" className="transition-transform duration-200 group-hover/q:translate-x-0.5">
        →
      </span>
    </>
  )
  const classes = cx('link-quiet group/q', className)

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    )
  }
  return (
    <a href={href} className={classes} {...rest}>
      {content}
    </a>
  )
}

/* -------------------------------------------------------------------------- */
/* Detail pages                                                                */
/* -------------------------------------------------------------------------- */

/** "← Back to X" link that opens every detail page. */
export function BackLink({ to, children }) {
  return (
    <Link
      to={to}
      className="link-quiet group/b"
    >
      <span
        aria-hidden="true"
        className="transition-transform duration-200 group-hover/b:-translate-x-0.5"
      >
        ←
      </span>
      {children}
    </Link>
  )
}

/**
 * Masthead for a single item.
 *
 * Detail pages share one shape — back link, eyebrow, title, a row of metadata —
 * so the header is defined once rather than re-laid-out on each page.
 */
export function DetailHeader({ backTo, backLabel, eyebrow, title, meta, actions }) {
  return (
    <header className="w-full border-b border-paper-border bg-paper-raised pb-9 pt-8">
      <Shell>
        {backTo && <BackLink to={backTo}>{backLabel}</BackLink>}

        <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl animate-fade-up">
            {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
            <h1 className="font-display text-2xl font-semibold leading-tight text-ink-950 sm:text-3xl">
              {title}
            </h1>
            {meta && (
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[11px] uppercase tracking-label text-ink-400">
                {meta}
              </div>
            )}
          </div>

          {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
        </div>
      </Shell>
    </header>
  )
}

/** Separator between two metadata items in a `DetailHeader` meta row. */
export function MetaDot() {
  return (
    <span aria-hidden="true" className="text-ink-200">
      ·
    </span>
  )
}

/**
 * Copies `value` to the clipboard and confirms it inline for a moment.
 *
 * Used for BibTeX entries, which are the one thing on this site visitors
 * reliably want to take away with them.
 */
export function CopyButton({ value, label, className }) {
  const { t } = useTranslation()
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    if (!copied) return undefined
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
    } catch {
      // Clipboard access is blocked outside a secure context; the text is
      // selectable on the page either way, so this fails quietly.
    }
  }

  return (
    <button type="button" onClick={copy} className={cx('btn-secondary btn-sm', className)}>
      <Icon name={copied ? 'check' : 'copy'} className="h-3.5 w-3.5" strokeWidth={2} />
      {copied ? t('ui.copied') : label ?? t('ui.copy')}
    </button>
  )
}

/**
 * Skeleton for a detail page, shaped like the real header + body so the layout
 * does not jump when the item arrives.
 */
export function DetailSkeleton({ withMedia = true }) {
  return (
    <>
      <div className="w-full border-b border-paper-border bg-paper-raised pb-9 pt-8">
        <Shell>
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-5 h-3 w-20" />
          <Skeleton className="mt-3 h-9 w-2/3 max-w-2xl" />
          <Skeleton className="mt-4 h-3 w-48" />
        </Shell>
      </div>
      <Section>
        <Shell>
          {withMedia && <Skeleton className="mb-10 aspect-[16/9] w-full max-w-4xl" />}
          <div className="max-w-measure space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </Shell>
      </Section>
    </>
  )
}

/**
 * Standard "this item does not exist" page for a detail route.
 *
 * A bad id is far more common than a bad path here — links get shared after the
 * item is deleted — so it says which kind of thing was missing and offers the
 * list it came from.
 */
export function NotFoundDetail({ title, description, backTo, backLabel }) {
  return (
    <Section>
      <Shell>
        <div className="mx-auto max-w-md text-center">
          <p className="eyebrow">Error 404</p>
          <h1 className="mt-4 font-display text-2xl font-semibold text-ink-950">{title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-500">{description}</p>
          <Link to={backTo} className="btn-primary mt-8">
            {backLabel}
          </Link>
        </div>
      </Shell>
    </Section>
  )
}

/* -------------------------------------------------------------------------- */
/* Formatting                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Locale-aware date formatting.
 *
 * Formatter construction is the expensive part of Intl, so instances are cached
 * per locale/style rather than rebuilt for every row in a list.
 */
const formatters = new Map()

function formatterFor(locale, options) {
  const key = `${locale}|${JSON.stringify(options)}`
  let formatter = formatters.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options)
    formatters.set(key, formatter)
  }
  return formatter
}

const DATE_STYLES = {
  short: { month: 'short', day: 'numeric', year: 'numeric' },
  long: { month: 'long', day: 'numeric', year: 'numeric' },
  monthYear: { month: 'long', year: 'numeric' },
}

/**
 * @param {string|Date} value
 * @param {'short'|'long'|'monthYear'} [style]
 * @param {string} [locale] BCP-47 tag; defaults to en-US
 */
export function formatDate(value, style = 'short', locale = 'en-US') {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return formatterFor(locale, DATE_STYLES[style] || DATE_STYLES.short).format(date)
}

/* -------------------------------------------------------------------------- */
/* Icons                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Inline icon set. Bundled as components rather than an icon library so the
 * build ships exactly the handful of paths this site uses.
 */
export function Icon({ name, className = 'h-4 w-4', strokeWidth = 1.5 }) {
  const paths = {
    mail: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    pin: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z',
    phone:
      'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
    user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    chip: 'M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m-2 6h2m14-6h2m-2 6h2M7 7h10v10H7V7z',
    document:
      'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    image:
      'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
    chevronDown: 'M19 9l-7 7-7-7',
    arrowRight: 'M14 5l7 7m0 0l-7 7m7-7H3',
    close: 'M6 18L18 6M6 6l12 12',
    menu: 'M4 7h16M4 12h16M4 17h16',
    search: 'M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z',
    logout: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
    download: 'M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3',
    external: 'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14',
    play: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z',
    calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    copy: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
    check: 'M5 13l4 4L19 7',
    link: 'M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5M10.172 13.828a4 4 0 010-5.656l3-3a4 4 0 015.656 5.656l-1.5 1.5',
    share: 'M8.684 13.342a3 3 0 100-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316M18 8a3 3 0 100-6 3 3 0 000 6zm0 14a3 3 0 100-6 3 3 0 000 6z',
  }

  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
        d={paths[name] || paths.chip}
      />
    </svg>
  )
}
