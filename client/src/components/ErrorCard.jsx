import React from 'react'

/** Block-level error notice for a failed section. */
export default function ErrorCard({ message }) {
  if (!message) return null
  return (
    <div
      role="alert"
      className="border border-signal-danger/25 bg-signal-dangerSoft px-4 py-3.5"
    >
      <p className="eyebrow text-signal-danger">Error</p>
      <p className="mt-1.5 text-sm text-ink-700">{message}</p>
    </div>
  )
}
