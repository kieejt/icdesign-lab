import React, { useEffect } from 'react'

const TOAST_STYLES = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-red-200 bg-red-50 text-red-700',
  info: 'border-slate-200 bg-white text-slate-700',
}

export default function Toast({ toast, onDismiss, duration = 4000 }) {
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [toast, onDismiss, duration])

  if (!toast) return null

  return (
    <div className="fixed bottom-6 right-6 z-[100] max-w-sm animate-fade-in">
      <div
        className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${
          TOAST_STYLES[toast.type] || TOAST_STYLES.info
        }`}
      >
        <p className="flex-1 whitespace-pre-line text-sm font-medium">{toast.message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="text-current opacity-60 hover:opacity-100"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
