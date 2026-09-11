import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import { Icon, cx } from './ui'

/**
 * Accessible modal dialog.
 *
 * Adds what the previous version was missing: it renders in a portal (so it is
 * never clipped by a transformed ancestor), closes on Escape and backdrop click,
 * locks body scroll, moves focus in and traps it, and restores focus to whatever
 * opened it on close.
 *
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {React.ReactNode} props.title
 * @param {React.ReactNode} [props.footer]
 * @param {string} [props.maxWidth] Tailwind max-w-* class
 */
export default function Modal({ isOpen, onClose, title, children, footer, maxWidth = 'max-w-2xl' }) {
  const panelRef = useRef(null)
  const previouslyFocused = useRef(null)

  useEffect(() => {
    if (!isOpen) return undefined

    previouslyFocused.current = document.activeElement

    const scrollLock = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Focus the panel itself rather than the first control: dropping the caret
    // straight into a text field is disorienting for screen-reader users.
    panelRef.current?.focus()

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }

      if (event.key !== 'Tab') return

      // Keep Tab inside the dialog.
      const focusables = panelRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!focusables || focusables.length === 0) return

      const first = focusables[0]
      const last = focusables[focusables.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = scrollLock
      previouslyFocused.current?.focus?.()
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-950/55 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        // Only a press that both starts and ends on the backdrop dismisses —
        // otherwise a text selection dragged out of the panel closes the dialog.
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        className={cx(
          'flex max-h-[90vh] w-full animate-scale-in flex-col overflow-hidden border border-ink-900 bg-paper-raised shadow-overlay focus:outline-none',
          maxWidth,
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-paper-border px-6 py-5">
          <h3 className="font-display text-lg font-medium text-ink-950">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 text-ink-400 transition-colors hover:text-ink-950"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto p-6">{children}</div>

        {footer && (
          <div className="flex shrink-0 justify-end gap-3 border-t border-paper-border bg-paper-sunken px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
