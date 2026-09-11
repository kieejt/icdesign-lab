import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'

import { Icon, cx } from './ui'

const TONES = {
  success: 'border-signal-ok/30 bg-signal-okSoft text-signal-ok',
  error: 'border-signal-danger/30 bg-signal-dangerSoft text-signal-danger',
  info: 'border-ink-900 bg-ink-950 text-paper',
}

/**
 * Transient status message, bottom-right.
 *
 * The dismiss timer restarts whenever a new toast arrives, and pauses on hover
 * so a message can't disappear mid-read.
 *
 * @param {object} props
 * @param {{type?: 'success'|'error'|'info', message: string}|null} props.toast
 * @param {() => void} props.onDismiss
 * @param {number} [props.duration] ms before auto-dismiss
 */
export default function Toast({ toast, onDismiss, duration = 4500 }) {
  const [paused, setPaused] = React.useState(false)

  useEffect(() => {
    if (!toast || paused) return undefined
    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [toast, onDismiss, duration, paused])

  if (!toast) return null

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      // Sits above the chatbot launcher so the two never overlap.
      className="fixed bottom-24 right-6 z-[120] max-w-sm animate-fade-up sm:bottom-6 sm:right-24"
    >
      <div
        className={cx(
          'flex items-start gap-3 border px-4 py-3 shadow-lift',
          TONES[toast.type] || TONES.info,
        )}
      >
        <p className="flex-1 whitespace-pre-line text-sm font-medium">{toast.message}</p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 opacity-60 transition-opacity hover:opacity-100"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>
    </div>,
    document.body,
  )
}
