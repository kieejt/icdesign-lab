import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import api from '../lib/api'
import { Icon, cx } from './ui'

const GREETING = {
  vi: 'Xin chào! Tôi là trợ lý ảo của IC Design Lab. Tôi có thể giúp gì cho bạn về thông tin của lab hoặc kiến thức thiết kế vi mạch?',
  en: "Hello! I'm the IC Design Lab assistant. Ask me about the lab or about integrated circuit design.",
}

const ERROR_REPLY = {
  vi: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.',
  en: 'Sorry, something went wrong. Please try again shortly.',
}

/** Only the last few turns are sent back, to keep the prompt small. */
const HISTORY_TURNS = 8

export default function Chatbot() {
  const { i18n } = useTranslation()
  const lang = i18n.language === 'vi' ? 'vi' : 'en'

  const [isOpen, setIsOpen] = useState(false)
  // Only the real conversation is stored. The greeting is derived from the
  // current language at render time, so switching VI/EN before the first
  // question re-labels it without any state synchronisation.
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const endRef = useRef(null)
  const inputRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    if (isOpen) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isOpen])

  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  const transcript = [{ role: 'assistant', content: GREETING[lang] }, ...messages]

  const close = useCallback(() => setIsOpen(false), [])

  // Escape closes the panel from anywhere inside it.
  useEffect(() => {
    if (!isOpen) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, close])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return

    const userMessage = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // `messages` here is the pre-update value — the new question travels in
      // `message`, not in the history.
      const history = messages.slice(-HISTORY_TURNS)

      const { data } = await api.post('/chat', {
        message: text,
        history: history.map((m) => ({ role: m.role, content: m.content })),
      })

      setMessages((prev) => [...prev, { role: 'assistant', content: data.response }])
    } catch (err) {
      console.error('Chat error:', err)
      setMessages((prev) => [...prev, { role: 'assistant', content: ERROR_REPLY[lang] }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[90] flex flex-col items-end">
      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Lab assistant"
          className="mb-3 flex h-[min(520px,70vh)] w-[min(380px,calc(100vw-2.5rem))] origin-bottom-right animate-scale-in flex-col overflow-hidden border border-ink-900 bg-paper-raised shadow-overlay"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-ink-800 bg-ink-950 px-4 py-3 text-paper">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center border border-paper/20 text-accent-300">
                <Icon name="chip" className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <div>
                <p className="font-display text-sm font-semibold leading-tight">
                  IC Design Assistant
                </p>
                <p className="font-mono text-[10px] uppercase tracking-label text-ink-400">
                  {lang === 'vi' ? 'Sẵn sàng giải đáp' : 'Ready to help'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={close}
              aria-label="Close assistant"
              className="p-1 text-paper/60 transition-colors hover:text-paper"
            >
              <Icon name="close" className="h-5 w-5" />
            </button>
          </div>

          {/* Transcript */}
          <div
            className="flex-1 space-y-3 overflow-y-auto bg-paper-sunken p-4"
            aria-live="polite"
            aria-atomic="false"
          >
            {transcript.map((message, index) => (
              <div
                key={index}
                className={cx('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cx(
                    'max-w-[85%] whitespace-pre-wrap px-3.5 py-2.5 text-[13px] leading-relaxed',
                    message.role === 'user'
                      ? 'bg-ink-950 text-paper'
                      : 'border border-paper-border bg-paper-raised text-ink-700',
                  )}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 border border-paper-border bg-paper-raised px-3.5 py-3">
                  {[0, 0.15, 0.3].map((delay) => (
                    <span
                      key={delay}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-300"
                      style={{ animationDelay: `${delay}s` }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Composer */}
          <form onSubmit={handleSubmit} className="border-t border-paper-border bg-paper-raised p-3">
            <div className="flex items-center gap-2">
              <label htmlFor="chat-input" className="sr-only">
                Message
              </label>
              <input
                id="chat-input"
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={lang === 'vi' ? 'Nhập câu hỏi của bạn…' : 'Ask a question…'}
                className="field flex-1 py-2 text-[13px]"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                aria-label="Send message"
                className="flex h-[38px] w-[38px] shrink-0 items-center justify-center bg-ink-950 text-paper transition-colors hover:bg-accent-600 disabled:bg-ink-200 disabled:text-ink-400"
              >
                <Icon name="arrowRight" className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Close assistant' : 'Open lab assistant'}
        className={cx(
          'flex h-12 w-12 items-center justify-center rounded-full bg-ink-950 text-paper shadow-lift transition-all duration-300 hover:bg-accent-600',
          isOpen && 'pointer-events-none scale-0 opacity-0',
        )}
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      </button>
    </div>
  )
}
