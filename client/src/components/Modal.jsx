import React from 'react'

export default function Modal({ isOpen, onClose, title, children, footer, maxWidth = 'max-w-2xl' }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className={`w-full ${maxWidth} max-h-[90vh] flex flex-col overflow-hidden rounded-xl bg-white shadow-xl`}>
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 p-6">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>
        <div className="space-y-4 overflow-y-auto p-6">{children}</div>
        {footer && (
          <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 bg-slate-50 p-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
