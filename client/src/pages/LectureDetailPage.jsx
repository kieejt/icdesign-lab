import React, { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import ErrorText from '../components/ErrorText'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'
import { youtubeEmbedUrl } from '../lib/youtube'
import {
  Badge,
  Icon,
  PageHeader,
  Section,
  Shell,
  Skeleton,
  formatDate,
} from '../components/ui'

/** Circular initial avatar. */
function Avatar({ email, tone = 'muted' }) {
  const initial = email?.charAt(0).toUpperCase() || '?'
  return (
    <span
      aria-hidden="true"
      className={`flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full font-mono text-xs font-medium uppercase ${
        tone === 'strong' ? 'bg-ink-950 text-paper' : 'bg-paper-sunken text-ink-600'
      }`}
    >
      {initial}
    </span>
  )
}

export default function LectureDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US'
  const { id } = useParams()
  const { currentUser, loading: authLoading } = useAuth()

  const [lecture, setLecture] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [commentText, setCommentText] = useState('')
  const [replyText, setReplyText] = useState({})
  const [busy, setBusy] = useState(false)

  const isAdmin = currentUser?.role === 'admin'

  /*
   * Not routed through the query cache on purpose.
   *
   * GET /lectures/:id increments the view counter, so serving it from cache — or
   * revalidating it in the background — would either lose views or inflate them.
   * It is fetched exactly once per mount.
   */
  useEffect(() => {
    // Nothing to fetch yet (session still resolving) or ever (signed out). The
    // signed-out branch below renders before the loading branch, so `loading`
    // can simply stay true here.
    if (authLoading || !currentUser) return undefined

    const controller = new AbortController()
    // Entering the loading state is the point of this effect, not an incidental
    // side effect of it: the request below is what the state describes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError('')

    api
      .get(`/lectures/${id}`, { signal: controller.signal })
      .then(({ data }) => setLecture(data))
      .catch((err) => {
        if (err.code === 'ERR_CANCELED') return
        setError(err.response?.status === 404 ? t('education.errorNotFound') : t('education.errorLoad'))
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [id, currentUser, authLoading, t])

  /** Every mutation returns the full updated lecture, so state is just replaced. */
  const runAction = useCallback(async (request, onSuccess) => {
    setBusy(true)
    setError('')
    try {
      const { data } = await request()
      setLecture(data)
      onSuccess?.()
    } catch (err) {
      setError(err.response?.data?.message || 'The action could not be completed.')
    } finally {
      setBusy(false)
    }
  }, [])

  const postComment = (event) => {
    event.preventDefault()
    if (!commentText.trim() || !lecture) return
    runAction(
      () => api.post(`/lectures/${lecture._id}/comments`, { text: commentText }),
      () => setCommentText(''),
    )
  }

  const postReply = (commentId) => {
    const text = replyText[commentId]
    if (!text?.trim() || !lecture) return
    runAction(
      () => api.post(`/lectures/${lecture._id}/comments/${commentId}/replies`, { text }),
      () => setReplyText((prev) => ({ ...prev, [commentId]: '' })),
    )
  }

  const deleteComment = (commentId) => {
    if (!lecture || !window.confirm('Delete this question and its replies?')) return
    runAction(() => api.delete(`/lectures/${lecture._id}/comments/${commentId}`))
  }

  /* --- Signed out ---------------------------------------------------- */
  if (!authLoading && !currentUser) {
    return (
      <>
        <PageHeader
          eyebrow={t('ui.eyebrowRestricted')}
          title={t('education.classTitle')}
          subtitle={t('education.classSubtitleRestricted')}
        />
        <Section>
          <Shell>
            <div className="mx-auto max-w-md text-center">
              <h2 className="font-display text-xl font-semibold text-ink-950">
                {t('education.accessRestricted')}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-500">
                {t('education.accessRestrictedDesc')}
              </p>
              <Link to="/login" className="btn-primary mt-8 w-full">
                {t('education.signIn')}
              </Link>
            </div>
          </Shell>
        </Section>
      </>
    )
  }

  /* --- Loading ------------------------------------------------------- */
  if (loading) {
    return (
      <Section>
        <Shell className="max-w-4xl">
          <Skeleton className="mb-4 h-3 w-32" />
          <Skeleton className="mb-8 h-10 w-3/4" />
          <Skeleton className="mb-8 aspect-video w-full" />
          <Skeleton className="mb-3 h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </Shell>
      </Section>
    )
  }

  /* --- Load failed --------------------------------------------------- */
  if (!lecture) {
    return (
      <Section>
        <Shell>
          <div className="mx-auto max-w-md space-y-6 text-center">
            <ErrorText message={error || 'An unexpected error occurred.'} />
            <Link to="/lectures" className="btn-secondary">
              {t('education.backToClass')}
            </Link>
          </div>
        </Shell>
      </Section>
    )
  }

  const embedUrl = youtubeEmbedUrl(lecture.youtubeUrl)
  const comments = lecture.comments ?? []

  return (
    <>
      {/* --- Header ------------------------------------------------------ */}
      <header className="w-full border-b border-paper-border bg-paper-raised py-8">
        <Shell>
          <Link to="/lectures" className="link-quiet">
            <span aria-hidden="true">←</span> {t('education.backToClass').replace('←', '').trim()}
          </Link>

          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="font-display text-2xl font-semibold leading-tight text-ink-950 sm:text-3xl">
                {lecture.title}
              </h1>
              <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-label text-ink-400">
                <span>
                  {t('education.published')} {formatDate(lecture.createdAt, 'short', locale)}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {lecture.views} {t('education.views')}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {comments.length} {t('education.qa')}
                </span>
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2.5">
              <span className="eyebrow">{t('education.identity')}</span>
              <Badge tone="accent">{currentUser.role}</Badge>
            </div>
          </div>
        </Shell>
      </header>

      <Section>
        <Shell className="max-w-5xl">
          {error && <ErrorText message={error} />}

          {/* --- Video ---------------------------------------------------- */}
          <div className="mt-6 aspect-video w-full overflow-hidden border border-paper-border bg-ink-950">
            {embedUrl ? (
              <iframe
                src={embedUrl}
                title={lecture.title}
                className="h-full w-full"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-paper-sunken text-ink-400">
                <Icon name="play" className="h-9 w-9" strokeWidth={1.25} />
                <span className="text-sm">{t('education.noVideo')}</span>
              </div>
            )}
          </div>

          {/* --- Summary + handouts --------------------------------------- */}
          <div className="mt-10 flex flex-col gap-10 lg:flex-row lg:items-start">
            <div className="flex-1">
              <h2 className="eyebrow">{t('education.lecSummary')}</h2>
              {lecture.description ? (
                <p className="prose-body mt-4 whitespace-pre-wrap">{lecture.description}</p>
              ) : (
                <p className="mt-4 text-sm italic text-ink-400">{t('education.noOverview')}</p>
              )}
            </div>

            {lecture.materialUrl && (
              <aside className="w-full shrink-0 border border-paper-border bg-paper-sunken p-6 lg:w-80">
                <h3 className="font-display text-base font-semibold text-ink-950">
                  {t('education.lecHandouts')}
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
                  {t('education.lecHandoutsDesc')}
                </p>
                <a
                  href={lecture.materialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary mt-5 w-full"
                >
                  <Icon name="download" className="h-4 w-4" strokeWidth={2} />
                  {t('education.downloadPdf').replace('→', '').trim()}
                </a>
              </aside>
            )}
          </div>

          {/* --- Discussion ----------------------------------------------- */}
          <div className="mt-14 border-t border-paper-border pt-12">
            <h2 className="font-display text-xl font-semibold text-ink-950">
              {t('education.classDiscussion')}
            </h2>
            <p className="mt-1.5 text-[13px] text-ink-500">{t('education.classDiscussionDesc')}</p>

            {/* Only students ask questions; the professor answers below. */}
            {currentUser.role === 'student' && (
              <form onSubmit={postComment} className="mt-7">
                <label htmlFor="question" className="sr-only">
                  {t('education.askQuestion')}
                </label>
                <textarea
                  id="question"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={3}
                  required
                  className="field resize-y"
                  placeholder={t('education.askQuestion')}
                />
                <div className="mt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={busy || !commentText.trim()}
                    className="btn-primary"
                  >
                    {busy ? t('education.posting') : t('education.askBtn')}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-10">
              {comments.length === 0 ? (
                <p className="border-t border-paper-border py-12 text-center text-sm italic text-ink-400">
                  {t('education.noQuestions')}
                </p>
              ) : (
                comments.map((comment) => (
                  <article
                    key={comment._id}
                    className="animate-fade-in border-t border-paper-border py-8"
                  >
                    {/* Question */}
                    <div className="flex items-start gap-4">
                      <Avatar email={comment.email} />
                      <div className="min-w-0 flex-1">
                        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink-900">
                          {comment.text}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                          <p className="font-mono text-[11px] text-ink-400">
                            {comment.email}
                            <span aria-hidden="true" className="mx-2">
                              ·
                            </span>
                            {formatDate(comment.createdAt, 'short', locale)}
                          </p>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => deleteComment(comment._id)}
                              disabled={busy}
                              className="font-mono text-[11px] uppercase tracking-label text-ink-400 transition-colors hover:text-signal-danger disabled:opacity-40"
                            >
                              {t('education.delete')}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Replies */}
                    {(comment.replies ?? []).map((reply) => (
                      <div
                        key={reply._id}
                        className="mt-6 flex items-start gap-4 border-l-2 border-accent-200 pl-5 sm:ml-12"
                      >
                        <Avatar email={reply.email} tone="strong" />
                        <div className="min-w-0 flex-1">
                          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink-800">
                            {reply.text}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2.5">
                            <span className="font-mono text-[11px] text-ink-400">{reply.email}</span>
                            <Badge tone="accent">{t('education.professorRole')}</Badge>
                            <span className="font-mono text-[11px] text-ink-300">
                              {formatDate(reply.createdAt, 'short', locale)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Reply box */}
                    {isAdmin && (
                      <div className="mt-6 flex gap-3 sm:ml-12 sm:pl-5">
                        <label htmlFor={`reply-${comment._id}`} className="sr-only">
                          {t('education.replyPlaceholder')}
                        </label>
                        <input
                          id={`reply-${comment._id}`}
                          type="text"
                          value={replyText[comment._id] || ''}
                          onChange={(e) =>
                            setReplyText((prev) => ({ ...prev, [comment._id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              postReply(comment._id)
                            }
                          }}
                          className="field flex-1"
                          placeholder={t('education.replyPlaceholder')}
                        />
                        <button
                          type="button"
                          onClick={() => postReply(comment._id)}
                          disabled={busy || !replyText[comment._id]?.trim()}
                          className="btn-primary shrink-0"
                        >
                          {t('education.replyBtn')}
                        </button>
                      </div>
                    )}
                  </article>
                ))
              )}
            </div>
          </div>
        </Shell>
      </Section>
    </>
  )
}
