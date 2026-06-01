import React from 'react';

export default function ErrorCard({ message }) {
  if (!message) return null
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-medium text-red-700">Error: {message}</p>
    </div>
  )
}
