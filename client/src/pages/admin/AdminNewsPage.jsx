import React, { useMemo, useState } from 'react'

import { AdminCard, AdminPage, AdminTabs, AdminThumb, EmptyRow, FormField } from '../../components/admin'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'
import Toast from '../../components/Toast'
import { Badge, ErrorState, Skeleton, cx } from '../../components/ui'
import { NEWS_CATEGORIES } from '../../constants/newsCategories'
import { invalidateQueries, useApiQuery } from '../../hooks/useApiQuery'
import api from '../../lib/api'

const AUTO_APPROVE_THRESHOLD = 7
const PAGE_SIZE = 50

const STATUS_TABS = [
  { id: 'pending', label: 'Pending' },
  { id: 'published', label: 'Published' },
  { id: 'rejected', label: 'Rejected' },
]

// Labels in display order; the pending queue is the only view grouped by age.
const TIME_GROUPS = ['Today', 'Yesterday', 'This week', 'This month', 'Older']

// Prefix covering every cached list/stats read this page makes, but not cron-time.
const QUEUE_CACHE = /^\/news\/(pending|history|admin)/

function getTimeGroup(dateString) {
  const date = new Date(dateString)
  const now = new Date()

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const itemDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.floor((today - itemDay) / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays <= 7) return 'This week'
  if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) return 'This month'
  return 'Older'
}

function groupByAge(items) {
  const groups = Object.fromEntries(TIME_GROUPS.map((name) => [name, []]))
  items.forEach((item) => {
    groups[getTimeGroup(item.createdAt || item.publishedAt)].push(item)
  })
  return TIME_GROUPS.filter((name) => groups[name].length > 0).map((name) => ({
    name,
    items: groups[name],
  }))
}

const formatCrawlTime = (value) =>
  new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })

function NewsRow({ item, activeTab, onEdit, onAction, onDelete }) {
  return (
    <tr className="align-top hover:bg-paper-sunken/60">
      <td className="max-w-lg px-5 py-4">
        <div className="flex items-start gap-3">
          {item.thumbnail && <AdminThumb src={item.thumbnail} size="h-10 w-10" />}
          <div className="min-w-0">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-ink-900 hover:text-accent-600 hover:underline"
            >
              {item.title}
            </a>
            <p className="mt-1.5 line-clamp-2 text-xs text-ink-500">{item.summary}</p>
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap px-5 py-4">
        <Badge>{item.source}</Badge>
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-xs text-ink-500">
        {formatCrawlTime(item.createdAt || item.publishedAt)}
      </td>
      <td className="whitespace-nowrap px-5 py-4">
        <Badge tone={item.score >= AUTO_APPROVE_THRESHOLD ? 'ok' : 'neutral'}>{item.score}</Badge>
      </td>
      <td className="px-5 py-4">
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => onEdit(item)} className="btn-secondary btn-sm">
            Edit Detail
          </button>
          {activeTab === 'pending' && (
            <>
              <button type="button" onClick={() => onAction(item._id, 'approve')} className="btn-primary btn-sm">
                Approve
              </button>
              <button type="button" onClick={() => onAction(item._id, 'reject')} className="btn-danger btn-sm">
                Reject
              </button>
            </>
          )}
          {activeTab === 'published' && (
            <button type="button" onClick={() => onDelete(item._id)} className="btn-danger btn-sm">
              Delete
            </button>
          )}
          {activeTab === 'rejected' && (
            <button type="button" onClick={() => onAction(item._id, 'restore')} className="btn-secondary btn-sm">
              Restore
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

function NewsTable({ items, activeTab, ...handlers }) {
  const groups = useMemo(
    () => (activeTab === 'pending' ? groupByAge(items) : [{ name: null, items }]),
    [items, activeTab],
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-paper-border">
            <th className="eyebrow whitespace-nowrap px-5 py-3 font-medium">Title &amp; AI Summary</th>
            <th className="eyebrow whitespace-nowrap px-5 py-3 font-medium">Source</th>
            <th className="eyebrow whitespace-nowrap px-5 py-3 font-medium">Crawl Time</th>
            <th className="eyebrow whitespace-nowrap px-5 py-3 font-medium">AI Score</th>
            <th className="eyebrow whitespace-nowrap px-5 py-3 text-right font-medium">Action</th>
          </tr>
        </thead>
        {groups.map((group) => (
          <tbody key={group.name ?? 'all'} className="divide-y divide-paper-border">
            {group.name && (
              <tr className="border-b border-paper-border bg-paper-sunken">
                <td colSpan={5} className="eyebrow px-5 py-2">
                  {group.name} ({group.items.length})
                </td>
              </tr>
            )}
            {group.items.map((item) => (
              <NewsRow key={item._id} item={item} activeTab={activeTab} {...handlers} />
            ))}
          </tbody>
        ))}
      </table>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="divide-hairline" aria-busy="true">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="h-10 w-10 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full max-w-md" />
          </div>
          <Skeleton className="hidden h-8 w-40 sm:block" />
        </div>
      ))}
    </div>
  )
}

function EditNewsModal({ item, onClose, onSave, saving }) {
  const [summary, setSummary] = useState(item.summary)
  const [category, setCategory] = useState(item.category || 'World News')

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Edit Article Metadata"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave({ summary, category })}
            disabled={saving}
            className="btn-primary"
          >
            Save Changes
          </button>
        </>
      }
    >
      <FormField label="Title" htmlFor="news-edit-title">
        <input id="news-edit-title" type="text" readOnly value={item.title} className="field" />
      </FormField>
      <FormField label="Category" htmlFor="news-edit-category">
        <select
          id="news-edit-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="field"
        >
          {NEWS_CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.label}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="AI Generated Summary" htmlFor="news-edit-summary">
        <textarea
          id="news-edit-summary"
          rows={6}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className="field"
        />
      </FormField>
    </Modal>
  )
}

const AdminNewsPage = () => {
  const [activeTab, setActiveTab] = useState('pending')
  const [activeCategory, setActiveCategory] = useState('World News')
  const [page, setPage] = useState(1)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [isFetching, setIsFetching] = useState(false)
  const [cronDraft, setCronDraft] = useState(null)
  const [isSavingCron, setIsSavingCron] = useState(false)
  const [autoApproveSaved, setAutoApproveSaved] = useState(null)
  const [isSavingAutoApprove, setIsSavingAutoApprove] = useState(false)

  const [editingItem, setEditingItem] = useState(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'info') => setToast({ message, type })

  const listParams = {
    page,
    limit: PAGE_SIZE,
    category: activeCategory,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    status: activeTab === 'pending' ? undefined : activeTab === 'published' ? 'approved' : 'rejected',
  }

  const list = useApiQuery(activeTab === 'pending' ? '/news/pending' : '/news/history', {
    params: listParams,
    staleTime: 0,
  })
  const statsQuery = useApiQuery('/news/admin/stats', { staleTime: 0 })
  const cronQuery = useApiQuery('/news/cron-time', { staleTime: 0 })
  const autoApproveQuery = useApiQuery('/settings/news_auto_approve', { staleTime: 0 })

  const news = useMemo(() => list.data?.data ?? [], [list.data])
  const totalPages = list.data?.totalPages || 1
  const cronTime = cronDraft ?? cronQuery.data ?? { hour: 8, minute: 0 }
  const autoApprove = autoApproveSaved ?? autoApproveQuery.data?.value === true

  const countByCategory = statsQuery.data?.[activeTab === 'published' ? 'approved' : activeTab] ?? {}
  const categoryMeta = NEWS_CATEGORIES.find((c) => c.id === activeCategory)
  const totalCount = countByCategory[activeCategory] || 0

  // The refetch drops the cache entry first, so other queue views are cleared too.
  const refreshQueue = () => {
    invalidateQueries(QUEUE_CACHE)
    list.refetch()
    statsQuery.refetch()
  }

  const changeTab = (id) => {
    setActiveTab(id)
    setPage(1)
  }

  const changeCategory = (id) => {
    setActiveCategory(id)
    setPage(1)
  }

  const changeDate = (type, value) => {
    if (type === 'start') setStartDate(value)
    else setEndDate(value)
    setPage(1)
  }

  const clearDates = () => {
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  const handleAction = async (id, action) => {
    try {
      await api.post(`/news/${id}/${action}`)
      refreshQueue()
    } catch {
      showToast('Error executing this action.', 'error')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this article?')) return
    try {
      await api.delete(`/news/${id}`)
      refreshQueue()
    } catch {
      showToast('Error deleting news.', 'error')
    }
  }

  const handleManualFetch = async () => {
    setIsFetching(true)
    try {
      const res = await api.post('/news/fetch', {}, { timeout: 60000 })
      const perCategory = res.data?.perCategory
      const summary = perCategory
        ? NEWS_CATEGORIES.map((c) => `${c.shortLabel}: ${perCategory[c.id]?.saved ?? 0} saved`).join('\n')
        : ''
      showToast(summary ? `Fetch completed.\n${summary}` : 'News aggregation successful!', 'success')
      refreshQueue()
    } catch (err) {
      if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        showToast(
          'Aggregation is taking longer than expected and is still running in the background. Please check back in a minute.',
          'info',
        )
      } else {
        showToast('Error during news aggregation.', 'error')
      }
    } finally {
      setIsFetching(false)
    }
  }

  const handleToggleAutoApprove = async () => {
    const nextValue = !autoApprove
    setIsSavingAutoApprove(true)
    try {
      await api.put('/settings/news_auto_approve', { value: nextValue })
      setAutoApproveSaved(nextValue)
      invalidateQueries('/settings/news_auto_approve')
      showToast(`Auto-approve ${nextValue ? 'enabled' : 'disabled'}.`, 'success')
    } catch {
      showToast('Error updating auto-approve setting.', 'error')
    } finally {
      setIsSavingAutoApprove(false)
    }
  }

  const handleSaveCron = async () => {
    setIsSavingCron(true)
    try {
      await api.post('/news/cron-time', cronTime)
      invalidateQueries('/news/cron-time')
      showToast('Automatic aggregation time updated!', 'success')
    } catch {
      showToast('Error updating time.', 'error')
    } finally {
      setIsSavingCron(false)
    }
  }

  const saveEdit = async (changes) => {
    setIsSavingEdit(true)
    try {
      await api.patch(`/news/${editingItem._id}`, changes)
      setEditingItem(null)
      refreshQueue()
    } catch {
      showToast('Failed to update news item', 'error')
    } finally {
      setIsSavingEdit(false)
    }
  }

  let content
  if (list.error && !list.data) {
    content = <ErrorState message="Failed to load news data." onRetry={list.refetch} />
  } else if (list.loading) {
    content = <TableSkeleton />
  } else if (news.length === 0) {
    content = (
      <div className="p-5">
        <EmptyRow>No news found for this criteria.</EmptyRow>
      </div>
    )
  } else {
    content = (
      <NewsTable
        items={news}
        activeTab={activeTab}
        onEdit={setEditingItem}
        onAction={handleAction}
        onDelete={handleDelete}
      />
    )
  }

  return (
    <AdminPage
      title="AI News"
      description="Review articles gathered by the AI aggregator, then approve, edit or reject them before they appear on the site."
      actions={
        <button type="button" onClick={handleManualFetch} disabled={isFetching} className="btn-primary">
          {isFetching ? 'Aggregating AI...' : 'Fetch Sources Now'}
        </button>
      }
    >
      <AdminCard className="grid gap-6 md:grid-cols-2 md:gap-0 md:divide-x md:divide-paper-border">
        <div className="md:pr-6">
          <p className="eyebrow">Auto-Approve</p>
          <label className="mt-3 flex cursor-pointer items-center gap-3 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={autoApprove}
              onChange={handleToggleAutoApprove}
              disabled={isSavingAutoApprove}
              className="h-4 w-4 accent-[theme(colors.accent.600)]"
            />
            Publish articles scoring {AUTO_APPROVE_THRESHOLD} or higher automatically
          </label>
        </div>
        <div className="md:pl-6">
          <p className="eyebrow">Auto Fetch</p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <FormField label="Hour" htmlFor="news-cron-hour">
              <input
                id="news-cron-hour"
                type="number"
                min="0"
                max="23"
                value={cronTime.hour}
                onChange={(e) => setCronDraft({ ...cronTime, hour: parseInt(e.target.value) || 0 })}
                className="field w-20 text-center"
              />
            </FormField>
            <FormField label="Minute" htmlFor="news-cron-minute">
              <input
                id="news-cron-minute"
                type="number"
                min="0"
                max="59"
                value={cronTime.minute}
                onChange={(e) => setCronDraft({ ...cronTime, minute: parseInt(e.target.value) || 0 })}
                className="field w-20 text-center"
              />
            </FormField>
            <button
              type="button"
              onClick={handleSaveCron}
              disabled={isSavingCron}
              className="btn-secondary"
            >
              Save
            </button>
          </div>
        </div>
      </AdminCard>

      <div className="space-y-5">
        <AdminTabs tabs={STATUS_TABS} active={activeTab} onChange={changeTab} label="Article status" />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="field-label">Category</p>
            <div className="flex flex-wrap gap-2">
              {NEWS_CATEGORIES.map((cat) => {
                const selected = cat.id === activeCategory
                return (
                  <button
                    key={cat.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => changeCategory(cat.id)}
                    className={cx(
                      'btn-secondary',
                      selected && 'border-ink-900 bg-paper-sunken text-ink-950',
                    )}
                  >
                    {cat.shortLabel}
                    <span className="font-mono text-[11px] text-ink-400">
                      {statsQuery.data ? countByCategory[cat.id] || 0 : '–'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <FormField label="From" htmlFor="news-start-date">
              <input
                id="news-start-date"
                type="date"
                value={startDate}
                onChange={(e) => changeDate('start', e.target.value)}
                className="field"
              />
            </FormField>
            <FormField label="To" htmlFor="news-end-date">
              <input
                id="news-end-date"
                type="date"
                value={endDate}
                onChange={(e) => changeDate('end', e.target.value)}
                className="field"
              />
            </FormField>
            {(startDate || endDate) && (
              <button type="button" onClick={clearDates} className="btn-ghost">
                Clear
              </button>
            )}
          </div>
        </div>

        <AdminCard padded={false}>
          <div className="flex flex-col gap-1 border-b border-paper-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-base font-semibold text-ink-950">{categoryMeta.label}</h2>
                <Badge tone="accent">
                  {totalCount} total {totalCount === 1 ? 'article' : 'articles'}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-ink-500">{categoryMeta.description}</p>
            </div>
            {news.length > 0 && (
              <span className="text-xs text-ink-400">Showing {news.length} on this page</span>
            )}
          </div>
          {content}
        </AdminCard>

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} loading={list.loading} />
      </div>

      {editingItem && (
        <EditNewsModal
          key={editingItem._id}
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={saveEdit}
          saving={isSavingEdit}
        />
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </AdminPage>
  )
}

export default AdminNewsPage
