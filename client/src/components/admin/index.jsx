import React from 'react'

import { responsiveImage } from '../../lib/image'
import { Icon, cx } from '../ui'

/*
 * Admin kit.
 *
 * The console used to be nine pages that each hand-rolled their own title size,
 * tab style, button colours and list rows, so no two screens looked alike. Every
 * admin page now composes these pieces instead; the public site's tokens
 * (`.btn-*`, `.field`, `.badge-*`, `.surface`) do the rest.
 *
 * Conventions every admin page follows:
 *   - page chrome:  <AdminPage title description actions>
 *   - sub-sections: <AdminTabs>
 *   - containers:   <AdminCard>
 *   - forms:        <FormField> around a `.field` control
 *   - row actions:  <RowActions> (secondary Edit, danger Delete)
 *   - thumbnails:   <AdminThumb> (resized, lazy, no external placeholders)
 *   - primary action: `btn-primary`; never a bespoke colour
 */

/** Consistent page title block with optional description and header actions. */
export function AdminPage({ title, description, actions, children, className }) {
  return (
    <div className={cx('space-y-8', className)}>
      <header className="flex flex-col gap-4 border-b border-ink-900 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-display-sm font-semibold text-ink-950">{title}</h1>
          {description && <p className="mt-2 max-w-measure text-sm text-ink-500">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
      </header>
      {children}
    </div>
  )
}

/** Titled block inside a page: hairline heading, optional trailing control. */
export function AdminSection({ title, count, description, action, children, className }) {
  return (
    <section className={className}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink-950">
            {title}
            {count !== undefined && (
              <span className="ml-2 font-mono text-xs font-medium text-ink-400">{count}</span>
            )}
          </h2>
          {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

/** Bordered container. `padded={false}` for tables that need to touch the edges. */
export function AdminCard({ padded = true, className, children, ...rest }) {
  return (
    <div className={cx('surface', padded && 'p-5 sm:p-6', className)} {...rest}>
      {children}
    </div>
  )
}

/**
 * Underline tabs.
 *
 * @param {{id: string, label: React.ReactNode, count?: number}[]} props.tabs
 * @param {string} props.active
 * @param {(id: string) => void} props.onChange
 */
export function AdminTabs({ tabs, active, onChange, label = 'Sections', className }) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cx('flex flex-wrap gap-x-6 border-b border-paper-border', className)}
    >
      {tabs.map((tab) => {
        const selected = tab.id === active
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={cx(
              '-mb-px border-b-2 py-3 text-sm font-medium transition-colors',
              selected
                ? 'border-accent-600 text-ink-950'
                : 'border-transparent text-ink-500 hover:text-ink-900',
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-2 font-mono text-[12.5px] text-ink-400">{tab.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** Label + control + optional hint/error, wired together for assistive tech. */
export function FormField({ label, required, hint, error, htmlFor, className, children }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="field-label">
          {label}
          {required && <span className="ml-1 text-accent-600">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-ink-400">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-signal-danger">{error}</p>}
    </div>
  )
}

/** Edit / Delete pair used at the end of every list row. */
export function RowActions({ onEdit, onDelete, editLabel = 'Edit', deleteLabel = 'Delete', disabled }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      {onEdit && (
        <button type="button" onClick={onEdit} disabled={disabled} className="btn-secondary btn-sm">
          {editLabel}
        </button>
      )}
      {onDelete && (
        <button type="button" onClick={onDelete} disabled={disabled} className="btn-danger btn-sm">
          {deleteLabel}
        </button>
      )}
    </div>
  )
}

/**
 * Small square thumbnail for list rows.
 *
 * Asks the server for a 320px WebP instead of the full upload (the lists used to
 * download every original at full size), and shows a neutral hatched tile rather
 * than calling out to an external placeholder service when there is no image or
 * it fails to load.
 */
export function AdminThumb({ src, alt = '', size = 'h-14 w-14', icon = 'image', className }) {
  const [failed, setFailed] = React.useState(false)

  return (
    <div
      className={cx(
        'relative shrink-0 overflow-hidden border border-paper-border bg-paper-sunken',
        size,
        className,
      )}
    >
      {src && !failed ? (
        <img
          {...responsiveImage(src)}
          sizes="120px"
          alt={alt}
          width="120"
          height="120"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="hatch flex h-full w-full items-center justify-center text-ink-300">
          <Icon name={icon} className="h-5 w-5" strokeWidth={1} />
        </div>
      )}
    </div>
  )
}

/** Error line shown above a form or list when a request fails. */
export function InlineNotice({ tone = 'danger', children, className }) {
  const tones = {
    danger: 'border-signal-danger/25 bg-signal-dangerSoft text-signal-danger',
    ok: 'border-signal-ok/25 bg-signal-okSoft text-signal-ok',
    info: 'border-signal-info/25 bg-signal-infoSoft text-signal-info',
  }
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cx('border px-4 py-3 text-sm', tones[tone], className)}>
      {children}
    </div>
  )
}

/** Plain "no rows" message for tables and lists. */
export function EmptyRow({ children = 'Nothing here yet.' }) {
  return <p className="border border-dashed border-paper-border px-6 py-12 text-center text-sm text-ink-400">{children}</p>
}
