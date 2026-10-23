import React, { useMemo, useState } from 'react'

import { AdminCard, AdminPage, AdminSection, EmptyRow, InlineNotice } from '../../components/admin'
import Pagination from '../../components/Pagination'
import { Badge, ErrorState, Skeleton, cx, formatDate } from '../../components/ui'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { invalidateQueries, useApiQuery } from '../../hooks/useApiQuery'
import api from '../../lib/api'

const AUDIT_LOGS_PER_PAGE = 10
const PAGE_HEAD = {
  title: 'Console Analytics',
  description:
    'Real-time tracking of visitor traffic, resource downloads, pending academic discussions, and administrator actions.',
}
const DASHBOARD_ERROR = 'Failed to fetch console statistics. Ensure you have administrator rights.'

// Friendly names for the most-visited URL paths. Order matters: first match wins.
const PAGE_NAMES = [
  ['/people/professor', 'Faculty - Professor'],
  ['/people/students', 'Students List'],
  ['/people/alumni', 'Alumni Directory'],
  ['/research/project', 'Research Projects'],
  ['/research/publications', 'Research Publications'],
  ['/lab-event/event', 'Lab Events'],
  ['/lab-event/gallery', 'Gallery Media'],
  ['/documents', 'Books & Documents Catalog'],
  ['/lectures', 'Classroom Lecture Video Portal'],
  ['/news/world-news', 'World Semiconductors News'],
  ['/news/vietnam-news', 'Vietnam ICDesign News'],
  ['/news/jobs', 'Jobs & Internship Board'],
  ['/lab-recruitment', 'Admission/Join the Lab'],
  ['/contact', 'Contact Form Page'],
  ['/admin', 'Admin Panel Area'],
]

function friendlyPageName(path) {
  if (path === '/') return 'Home Page'
  return PAGE_NAMES.find(([fragment]) => path.includes(fragment))?.[1] ?? path
}

function auditTone(action) {
  if (action.includes('CREATE')) return 'ok'
  if (action.includes('DELETE') || action.includes('REVOKE')) return 'danger'
  if (action.includes('UPDATE')) return 'warn'
  if (action.includes('REPLY')) return 'accent'
  return 'neutral'
}

const formatCount = (value) => (value ?? 0).toLocaleString()

/* -------------------------------------------------------------------------- */
/* Stat tiles                                                                  */
/* -------------------------------------------------------------------------- */

function StatTile({ label, value, hint }) {
  return (
    <AdminCard padded={false} className="flex flex-col justify-between gap-4 p-5">
      <p className="eyebrow">{label}</p>
      <div>
        <p className="text-3xl font-semibold tracking-tight text-ink-950">{value}</p>
        <p className="mt-1.5 text-xs text-ink-400">{hint}</p>
      </div>
    </AdminCard>
  )
}

function ReachTile({ week, month }) {
  return (
    <AdminCard padded={false} className="flex flex-col justify-between gap-4 p-5">
      <p className="eyebrow">Reach Statistics</p>
      <div className="grid grid-cols-2 divide-x divide-paper-border">
        <div className="pr-4">
          <p className="text-2xl font-semibold tracking-tight text-ink-950">{formatCount(week)}</p>
          <p className="mt-1.5 text-xs text-ink-400">This week</p>
        </div>
        <div className="pl-4">
          <p className="text-2xl font-semibold tracking-tight text-ink-950">{formatCount(month)}</p>
          <p className="mt-1.5 text-xs text-ink-400">This month</p>
        </div>
      </div>
    </AdminCard>
  )
}

/* -------------------------------------------------------------------------- */
/* Discussion feed                                                             */
/* -------------------------------------------------------------------------- */

function CommentRow({ comment, text, busy, onTextChange, onReply, onDelete }) {
  const inputId = `reply-${comment.commentId}`

  return (
    <div className="space-y-3 px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="min-w-0 truncate text-sm font-medium text-ink-950" title={comment.email}>
          {comment.email}
        </p>
        <p className="font-mono text-[12.5px] text-ink-400">{formatDate(comment.createdAt)}</p>
      </div>

      <div className="border border-paper-border bg-paper-sunken px-4 py-3">
        <p className="eyebrow mb-1.5 break-words">Lecture: {comment.lectureTitle}</p>
        <p className="text-sm leading-relaxed text-ink-800">{comment.text}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor={inputId} className="sr-only">
          Reply to {comment.email}
        </label>
        <input
          id={inputId}
          type="text"
          value={text}
          onChange={(e) => onTextChange(comment.commentId, e.target.value)}
          placeholder="Type official professor response..."
          disabled={busy}
          className="field min-w-0 flex-1"
        />
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onReply(comment)}
            disabled={busy || !text.trim()}
            className="btn-primary flex-1 sm:flex-none"
          >
            {busy ? 'Posting...' : 'Reply'}
          </button>
          <button
            type="button"
            onClick={() => onDelete(comment)}
            disabled={busy}
            className="btn-danger flex-1 sm:flex-none"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Ranked panels                                                               */
/* -------------------------------------------------------------------------- */

// Header stays put while the list scrolls inside the card, so the page height
// doesn't depend on how many rows the API returned (it caps each list).
function RankPanel({ title, description, empty, children }) {
  return (
    <AdminCard padded={false} className="flex flex-col">
      <div className="border-b border-paper-border px-5 py-4">
        <h2 className="text-base font-semibold text-ink-950">{title}</h2>
        <p className="mt-1 text-xs text-ink-500">{description}</p>
      </div>
      {React.Children.count(children) === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-ink-400">{empty}</p>
      ) : (
        <div className="divide-hairline max-h-[22rem] overflow-y-auto">{children}</div>
      )}
    </AdminCard>
  )
}

function RankRow({ label, value, unit, ratio, title }) {
  return (
    <div className="space-y-2 px-5 py-3.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 truncate font-medium text-ink-900" title={title ?? label}>
          {label}
        </span>
        <span className="shrink-0 font-mono text-xs text-ink-500">
          {formatCount(value)} {unit}
        </span>
      </div>
      <div className="h-1 w-full bg-ink-100">
        <div className="h-full bg-ink-900" style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  )
}

function DownloadRow({ doc }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink-900" title={doc.title}>
          {doc.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="eyebrow">{doc.subject}</span>
          {doc.isLabOwned && <Badge tone="accent">Lab Owned</Badge>}
        </div>
      </div>
      <span className="shrink-0 font-mono text-xs text-ink-500">{formatCount(doc.downloads)} dl</span>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Audit trail                                                                 */
/* -------------------------------------------------------------------------- */

function AuditRow({ log }) {
  return (
    <tr>
      <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-ink-500">
        {new Date(log.createdAt).toLocaleString(undefined, {
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })}
      </td>
      <td className="whitespace-nowrap px-5 py-3.5 font-medium text-ink-900">{log.adminEmail}</td>
      <td className="whitespace-nowrap px-5 py-3.5">
        <Badge tone={auditTone(log.action)}>{log.action}</Badge>
      </td>
      <td className="max-w-sm truncate px-5 py-3.5 text-ink-700" title={log.details}>
        {log.details}
      </td>
      <td className="whitespace-nowrap px-5 py-3.5 text-right">
        <p className="font-mono text-xs text-ink-600">{log.ip || 'no-ip'}</p>
        <p className="ml-auto mt-0.5 max-w-[12rem] truncate text-[12.5px] text-ink-400" title={log.userAgent}>
          {log.userAgent}
        </p>
      </td>
    </tr>
  )
}

const AUDIT_COLUMNS = [
  ['Timestamp', 'text-left'],
  ['Administrator', 'text-left'],
  ['Action Type', 'text-left'],
  ['Operation Details', 'text-left'],
  ['Location Context', 'text-right'],
]

function AuditSkeleton() {
  return (
    <div className="divide-hairline" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="px-5 py-3.5">
          <Skeleton className="h-5 w-full" />
        </div>
      ))}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((n) => (
          <Skeleton key={n} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-64" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {[1, 2, 3].map((n) => (
          <Skeleton key={n} className="h-80" />
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default function AdminOverviewPage() {
  const dashboard = useApiQuery('/analytics/dashboard', { staleTime: 0 })

  // Reply drafts, keyed by comment id; answered/deleted comments are hidden
  // locally so the feed updates without refetching the whole dashboard.
  const [replyTexts, setReplyTexts] = useState({})
  const [busyId, setBusyId] = useState(null)
  const [hiddenIds, setHiddenIds] = useState(() => new Set())
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')

  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebouncedValue(searchTerm, 400)
  const [filterAction, setFilterAction] = useState('All')

  // The page belongs to the criteria it was chosen under. Reading it back
  // against the current criteria snaps to page 1 when the filter or search
  // changes, without an effect and without a wasted request for the old query.
  const criteria = `${debouncedSearch}|${filterAction}`
  const [pageState, setPageState] = useState({ page: 1, criteria })
  const auditPage = pageState.criteria === criteria ? pageState.page : 1

  const audit = useApiQuery('/analytics/audit-logs', {
    params: { page: auditPage, limit: AUDIT_LOGS_PER_PAGE, search: debouncedSearch, action: filterAction },
    staleTime: 0,
  })

  const todayLabel = useMemo(
    () => new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    [],
  )

  const auditLogs = audit.data?.data ?? []
  const auditTotalPages = audit.data?.totalPages || 1
  // Keep the active filter selectable while the list reloads after a mutation.
  const knownActions = audit.data?.actions || ['All']
  const auditActions = knownActions.includes(filterAction) ? knownActions : [...knownActions, filterAction]

  const handleReplyTextChange = (commentId, text) => {
    setReplyTexts((prev) => ({ ...prev, [commentId]: text }))
  }

  const hideComment = (commentId) => {
    setHiddenIds((prev) => new Set(prev).add(commentId))
  }

  const handlePostReply = async (comment) => {
    const text = (replyTexts[comment.commentId] || '').trim()
    if (!text) return

    setBusyId(comment.commentId)
    setActionError('')
    setNotice('')
    try {
      await api.post(`/lectures/${comment.lectureId}/comments/${comment.commentId}/replies`, { text })
      setReplyTexts((prev) => ({ ...prev, [comment.commentId]: '' }))
      hideComment(comment.commentId)
      setNotice('Reply posted successfully.')
      invalidateQueries('/lectures')
      audit.refetch()
    } catch (err) {
      console.error('Failed to post reply:', err)
      setActionError('Failed to submit professor reply.')
    } finally {
      setBusyId(null)
    }
  }

  const handleDeleteComment = async (comment) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return

    setActionError('')
    setNotice('')
    try {
      await api.delete(`/lectures/${comment.lectureId}/comments/${comment.commentId}`)
      hideComment(comment.commentId)
      invalidateQueries('/lectures')
      audit.refetch()
    } catch (err) {
      console.error('Failed to delete comment:', err)
      setActionError('Failed to delete comment.')
    }
  }

  if (dashboard.loading) {
    return (
      <AdminPage {...PAGE_HEAD} actions={<p className="eyebrow">Live feed: {todayLabel}</p>}>
        <DashboardSkeleton />
      </AdminPage>
    )
  }

  if (!dashboard.data) {
    return (
      <AdminPage {...PAGE_HEAD}>
        <ErrorState message={DASHBOARD_ERROR} onRetry={dashboard.refetch} />
      </AdminPage>
    )
  }

  const { metrics, topPages, topLectures, unansweredComments, documentDownloads } = dashboard.data
  const pending = unansweredComments.filter((c) => !hiddenIds.has(c.commentId))
  const maxPageViews = topPages[0]?.count || 1
  const maxLectureViews = topLectures[0]?.views || 1

  return (
    <AdminPage {...PAGE_HEAD} actions={<p className="eyebrow">Live feed: {todayLabel}</p>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Page Views" value={formatCount(metrics.totalPageViews)} hint="Accumulated page views" />
        <StatTile label="Unique Visitors" value={formatCount(metrics.uniqueVisitors)} hint="Distinct IP addresses" />
        <StatTile label="Active Today" value={formatCount(metrics.visitorsToday)} hint="Visitors today" />
        <ReachTile week={metrics.visitorsThisWeek} month={metrics.visitorsThisMonth} />
      </div>

      <AdminSection
        title="Unanswered Lecture Discussion Feed"
        count={pending.length}
        description="Lecturers will not miss student questions when replying from this inbox."
      >
        <div className="space-y-4">
          {notice && <InlineNotice tone="ok">{notice}</InlineNotice>}
          {actionError && <InlineNotice>{actionError}</InlineNotice>}
          {pending.length === 0 ? (
            <EmptyRow>Inbox fully cleared. All student questions have been replied to by the professor.</EmptyRow>
          ) : (
            <AdminCard padded={false} className="max-h-[40rem] divide-hairline overflow-y-auto">
              {pending.map((comment) => (
                <CommentRow
                  key={comment.commentId}
                  comment={comment}
                  text={replyTexts[comment.commentId] || ''}
                  busy={busyId === comment.commentId}
                  onTextChange={handleReplyTextChange}
                  onReply={handlePostReply}
                  onDelete={handleDeleteComment}
                />
              ))}
            </AdminCard>
          )}
        </div>
      </AdminSection>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <RankPanel title="Top Visited Pages" description="Pages receiving the highest navigation traffic." empty="No page views recorded yet.">
          {topPages.map((page) => (
            <RankRow
              key={page.url}
              label={friendlyPageName(page.url)}
              title={page.url}
              value={page.count}
              unit="views"
              ratio={page.count / maxPageViews}
            />
          ))}
        </RankPanel>

        <RankPanel
          title="Top Viewed Lectures"
          description="Classroom lecture videos with maximum student engagement."
          empty="No lecture views recorded yet."
        >
          {topLectures.map((lec) => (
            <RankRow key={lec._id} label={lec.title} value={lec.views} unit="views" ratio={lec.views / maxLectureViews} />
          ))}
        </RankPanel>

        <RankPanel
          title="Document Downloads"
          description="Downloads count for lab textbooks and study guides."
          empty="No documents downloaded yet."
        >
          {documentDownloads.map((doc) => (
            <DownloadRow key={doc._id} doc={doc} />
          ))}
        </RankPanel>
      </div>

      <AdminSection
        title="System Audit Trail"
        description="Traceable record of all administrative operations performed in the lab panel."
      >
        <AdminCard padded={false}>
          <div className="flex flex-col gap-3 border-b border-paper-border px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
            <label htmlFor="audit-action" className="sr-only">
              Filter by action
            </label>
            <select
              id="audit-action"
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="field sm:w-56"
            >
              {auditActions.map((action) => (
                <option key={action} value={action}>
                  {action === 'All' ? 'All System Actions' : action}
                </option>
              ))}
            </select>
            <label htmlFor="audit-search" className="sr-only">
              Search audit trail
            </label>
            <input
              id="audit-search"
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search audit trail..."
              className="field sm:w-64"
            />
          </div>

          {audit.loading ? (
            <AuditSkeleton />
          ) : audit.error && !audit.data ? (
            <div className="p-5">
              <InlineNotice>Failed to load audit records. Try again shortly.</InlineNotice>
            </div>
          ) : auditLogs.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-ink-400">No audit records found matching your filters.</p>
          ) : (
            <div className={cx('overflow-x-auto', audit.isValidating && 'opacity-70 transition-opacity')}>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-paper-border">
                    {AUDIT_COLUMNS.map(([label, align]) => (
                      <th key={label} scope="col" className={cx('eyebrow px-5 py-3', align)}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper-border">
                  {auditLogs.map((log) => (
                    <AuditRow key={log._id} log={log} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {auditTotalPages > 1 && (
            <div className="border-t border-paper-border px-5 py-4">
              <Pagination
                currentPage={auditPage}
                totalPages={auditTotalPages}
                loading={audit.loading}
                onPageChange={(page) => setPageState({ page, criteria })}
              />
            </div>
          )}
        </AdminCard>
      </AdminSection>
    </AdminPage>
  )
}
