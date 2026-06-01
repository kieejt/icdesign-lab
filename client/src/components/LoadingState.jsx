import React from 'react';

export default function LoadingState({ label }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <p className="text-sm text-slate-500">{label}</p>
      <div className="mt-3 h-2 w-32 animate-pulse rounded bg-slate-200" />
    </div>
  )
}
