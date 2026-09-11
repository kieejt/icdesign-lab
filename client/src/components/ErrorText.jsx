import React from 'react'

/** Field-level validation message. */
export default function ErrorText({ message }) {
  if (!message) return null
  return (
    <p role="alert" className="border-l-2 border-signal-danger bg-signal-dangerSoft px-3 py-2 text-sm text-signal-danger">
      {message}
    </p>
  )
}
