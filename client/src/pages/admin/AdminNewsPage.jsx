import React, { useState, useEffect, useMemo } from 'react'
import api from '../../lib/api'
import ErrorCard from '../../components/ErrorCard'
import Toast from '../../components/Toast'
import {
  NEWS_CATEGORIES,
  CATEGORY_BADGE_STYLES,
  CATEGORY_SECTION_STYLES,
} from '../../constants/newsCategories'

const AUTO_APPROVE_THRESHOLD = 7

const getTimeGroup = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const itemDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  
  const diffTime = today - itemDay
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays <= 0) return 'Hôm nay'
  if (diffDays === 1) return 'Hôm qua'
  if (diffDays > 1 && diffDays <= 7) return 'Tuần này'
  
  if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
    return 'Tháng này'
  }
  
  return 'Cũ hơn'
}

function NewsTable({ items, activeTab, onEdit, onAction, onDelete }) {
  if (items.length === 0) {
    return (
      <p className="px-6 py-8 text-center text-sm text-ink-500">
        No articles in this view.
      </p>
    )
  }

  let groupedItems = { 'Tất cả': items }
  if (activeTab === 'pending') {
    groupedItems = {
      'Hôm nay': [],
      'Hôm qua': [],
      'Tuần này': [],
      'Tháng này': [],
      'Cũ hơn': []
    }
    items.forEach(item => {
      const group = getTimeGroup(item.createdAt || item.publishedAt)
      if (groupedItems[group]) {
        groupedItems[group].push(item)
      } else {
        groupedItems['Cũ hơn'].push(item)
      }
    })
  }

  const renderTableRows = (itemList) => {
    return itemList.map((item) => (
      <tr key={item._id} className="hover:bg-paper-sunken/80">
        <td className="px-6 py-4 max-w-lg">
          <div className="font-medium text-ink-900 mb-1 flex items-start gap-2">
            {item.thumbnail && (
              <img src={item.thumbnail} alt="" className="w-8 h-8 object-cover shrink-0" />
            )}
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent-600 hover:underline"
            >
              {item.title}
            </a>
          </div>
          <div className="text-ink-500 text-xs mt-2 line-clamp-3 bg-paper-sunken p-2 border border-ink-100">
            {item.summary}
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className="inline-flex items-center bg-ink-100 px-2.5 py-0.5 text-xs font-medium text-ink-600">
            {item.source}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-xs text-ink-500 font-medium">
            {new Date(item.createdAt || item.publishedAt).toLocaleString('vi-VN')}
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className="font-semibold text-signal-ok">{item.score}</span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex flex-col gap-2 min-w-[140px]">
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="rounded bg-ink-100 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-paper-border text-center"
            >
              Edit Detail
            </button>
            {activeTab === 'pending' ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onAction(item._id, 'approve')}
                  className="flex-1 rounded bg-signal-ok px-3 py-1.5 text-xs font-medium text-paper hover:bg-signal-ok"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => onAction(item._id, 'reject')}
                  className="flex-1 rounded bg-signal-danger px-3 py-1.5 text-xs font-medium text-paper hover:bg-signal-danger"
                >
                  Reject
                </button>
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                {activeTab === 'published' && (
                  <button
                    type="button"
                    onClick={() => onDelete(item._id)}
                    className="flex-1 rounded px-2 py-1 text-xs font-medium text-ink-600 hover:bg-paper-border"
                  >
                    Delete
                  </button>
                )}
                {activeTab === 'rejected' && (
                  <button
                    type="button"
                    onClick={() => onAction(item._id, 'restore')}
                    className="flex-1 rounded px-2 py-1 text-xs font-medium text-accent-600 bg-accent-50 hover:bg-accent-100"
                  >
                    Restore
                  </button>
                )}
              </div>
            )}
          </div>
        </td>
      </tr>
    ))
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-paper-sunken text-ink-600">
          <tr>
            <th className="px-6 py-3 font-medium">Title & AI Summary</th>
            <th className="px-6 py-3 font-medium">Source</th>
            <th className="px-6 py-3 font-medium">Crawl Time</th>
            <th className="px-6 py-3 font-medium">AI Score</th>
            <th className="px-6 py-3 font-medium">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-paper-border">
          {activeTab === 'pending' ? (
            Object.entries(groupedItems).map(([groupName, groupItems]) => {
              if (groupItems.length === 0) return null
              return (
                <React.Fragment key={groupName}>
                  <tr className="bg-ink-100/50">
                    <td colSpan="5" className="px-6 py-2 font-semibold text-accent-700 text-xs uppercase tracking-wider">
                      {groupName} ({groupItems.length})
                    </td>
                  </tr>
                  {renderTableRows(groupItems)}
                </React.Fragment>
              )
            })
          ) : (
            renderTableRows(items)
          )}
        </tbody>
      </table>
    </div>
  )
}

function CategorySection({ categoryMeta, items, activeTab, onEdit, onAction, onDelete, totalCount }) {
  const badgeClass =
    CATEGORY_BADGE_STYLES[categoryMeta.id] || 'bg-paper-sunken text-ink-800 ring-paper-border'
  const borderClass = CATEGORY_SECTION_STYLES[categoryMeta.id] || 'border-l-ink-400'

  return (
    <section
      className={`rounded-none border border-paper-border bg-paper-raised shadow-sm overflow-hidden border-l-4 ${borderClass}`}
    >
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-6 py-4 bg-paper-sunken/80 border-b border-paper-border">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-base font-semibold text-ink-900">{categoryMeta.label}</h3>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${badgeClass}`}
            >
              {totalCount} total {totalCount === 1 ? 'article' : 'articles'}
            </span>
            <span className="text-xs text-ink-400 font-medium">
              (Showing {items.length} on this page)
            </span>
          </div>
          <p className="text-xs text-ink-500 mt-1">{categoryMeta.description}</p>
        </div>
      </header>
      <NewsTable
        items={items}
        activeTab={activeTab}
        onEdit={onEdit}
        onAction={onAction}
        onDelete={onDelete}
      />
    </section>
  )
}

const AdminNewsPage = () => {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isFetching, setIsFetching] = useState(false)
  const [activeTab, setActiveTab] = useState('pending')
  const [cronTime, setCronTime] = useState({ hour: 8, minute: 0 })
  const [isSavingCron, setIsSavingCron] = useState(false)
  const [activeCategory, setActiveCategory] = useState('World News')
  const [autoApprove, setAutoApprove] = useState(false)
  const [isSavingAutoApprove, setIsSavingAutoApprove] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'info') => setToast({ message, type })

  // Pagination & Filtering
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [stats, setStats] = useState({
    pending: { All: 0 },
    approved: { All: 0 },
    rejected: { All: 0 }
  })

  const [editingItem, setEditingItem] = useState(null)
  const [editSummary, setEditSummary] = useState('')
  const [editCategory, setEditCategory] = useState('')

  // Reset page when tab or category changes
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, activeCategory])

  const fetchData = async () => {
    setLoading(true)
    try {
      const endpoint = activeTab === 'pending' ? 'pending' : 'history'
      const statusParam = activeTab === 'pending' ? undefined : (activeTab === 'published' ? 'approved' : 'rejected')
      
      const params = {
        page: currentPage,
        limit: 50,
        category: activeCategory
      }
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      if (statusParam) params.status = statusParam

      const [newsRes, cronRes, statsRes, autoApproveRes] = await Promise.all([
        api.get(`/news/${endpoint}`, { params }),
        api.get('/news/cron-time'),
        api.get('/news/admin/stats'),
        api.get('/settings/news_auto_approve'),
      ])

      setNews(newsRes.data.data)
      setTotalPages(newsRes.data.totalPages || 1)
      setCronTime(cronRes.data)
      setStats(statsRes.data)
      setAutoApprove(autoApproveRes.data.value === true)
      setError(null)
    } catch (err) {
      setError('Failed to load news data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [activeTab, activeCategory, currentPage, startDate, endDate])

  const countByCategory = useMemo(() => {
    const statKey = activeTab === 'published' ? 'approved' : activeTab;
    return stats[statKey] || {}
  }, [stats, activeTab])

  const newsByCategory = useMemo(() => {
    const grouped = {}
    NEWS_CATEGORIES.forEach((cat) => {
      grouped[cat.id] = news.filter((n) => n.category === cat.id)
    })
    return grouped
  }, [news])

  const handleAction = async (id, action) => {
    try {
      await api.post(`/news/${id}/${action}`)
      fetchData()
    } catch (err) {
      showToast('Error executing this action.', 'error')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this article?')) return
    try {
      await api.delete(`/news/${id}`)
      fetchData()
    } catch (err) {
      showToast('Error deleting news.', 'error')
    }
  }

  const handleManualFetch = async () => {
    setIsFetching(true)
    try {
      const res = await api.post('/news/fetch', {}, { timeout: 60000 })
      const stats = res.data?.perCategory
      const summary = stats
        ? NEWS_CATEGORIES.map((c) => `${c.shortLabel}: ${stats[c.id]?.saved ?? 0} saved`).join('\n')
        : ''
      showToast(summary ? `Fetch completed.\n${summary}` : 'News aggregation successful!', 'success')
      fetchData()
    } catch (err) {
      if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        showToast('Aggregation is taking longer than expected and is still running in the background. Please check back in a minute.', 'info')
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
      setAutoApprove(nextValue)
      showToast(`Auto-approve ${nextValue ? 'enabled' : 'disabled'}.`, 'success')
    } catch (err) {
      showToast('Error updating auto-approve setting.', 'error')
    } finally {
      setIsSavingAutoApprove(false)
    }
  }

  const handleSaveCron = async () => {
    setIsSavingCron(true)
    try {
      await api.post('/news/cron-time', cronTime)
      showToast('Automatic aggregation time updated!', 'success')
    } catch (err) {
      showToast('Error updating time.', 'error')
    } finally {
      setIsSavingCron(false)
    }
  }

  const openEditModal = (item) => {
    setEditingItem(item)
    setEditSummary(item.summary)
    setEditCategory(item.category || 'World News')
  }

  const saveEdit = async () => {
    if (!editingItem) return
    try {
      await api.patch(`/news/${editingItem._id}`, {
        summary: editSummary,
        category: editCategory,
      })
      setEditingItem(null)
      fetchData()
    } catch (err) {
      showToast('Failed to update news item', 'error')
    }
  }

  const handleDateFilterChange = (type, value) => {
    if (type === 'start') setStartDate(value)
    if (type === 'end') setEndDate(value)
    setCurrentPage(1)
  }

  if (error) {
    return <ErrorCard message={error} />
  }

  const tableHandlers = {
    onEdit: openEditModal,
    onAction: handleAction,
    onDelete: handleDelete,
  }

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-paper-border pb-4">
        <h2 className="text-2xl font-semibold tracking-tight text-ink-900">Manage AI News System</h2>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 rounded-none border border-paper-border bg-paper-raised px-3 py-1.5 shadow-sm">
            <span className="text-sm text-ink-600">
              Auto-Approve (score ≥ {AUTO_APPROVE_THRESHOLD}):
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={autoApprove}
              onClick={handleToggleAutoApprove}
              disabled={isSavingAutoApprove}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
                autoApprove ? 'bg-signal-ok' : 'bg-ink-300'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-paper-raised transition-transform ${
                  autoApprove ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-none border border-paper-border bg-paper-raised px-3 py-1.5 shadow-sm">
            <span className="text-sm text-ink-600">Auto Fetch:</span>
            <input
              type="number"
              min="0"
              max="23"
              value={cronTime.hour}
              onChange={(e) => setCronTime({ ...cronTime, hour: parseInt(e.target.value) || 0 })}
              className="w-12 rounded border border-ink-300 px-1 py-1 text-center text-sm outline-none focus:border-accent-500"
            />
            <span className="text-sm font-bold">:</span>
            <input
              type="number"
              min="0"
              max="59"
              value={cronTime.minute}
              onChange={(e) => setCronTime({ ...cronTime, minute: parseInt(e.target.value) || 0 })}
              className="w-12 rounded border border-ink-300 px-1 py-1 text-center text-sm outline-none focus:border-accent-500"
            />
            <button
              type="button"
              onClick={handleSaveCron}
              disabled={isSavingCron}
              className="ml-2 rounded bg-ink-900 px-3 py-1 text-xs font-semibold text-paper hover:bg-ink-700 disabled:bg-ink-400"
            >
              Save
            </button>
          </div>
          <button
            type="button"
            onClick={handleManualFetch}
            disabled={isFetching}
            className={`flex items-center gap-2 rounded-none px-4 py-2 text-sm font-semibold text-paper transition-all ${
              isFetching ? 'bg-accent-400 cursor-not-allowed' : 'bg-accent-600 hover:bg-accent-700'
            }`}
          >
            {isFetching ? 'Aggregating AI...' : 'Fetch Sources Now'}
          </button>
        </div>
      </div>

      {/* Date Filter & Status tabs row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex space-x-1 rounded-none bg-ink-100 p-1 w-full max-w-xl">
          {[
            { id: 'pending', label: 'Pending' },
            { id: 'published', label: 'Published' },
            { id: 'rejected', label: 'Rejected' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-none py-2 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-paper-raised text-ink-900 shadow'
                  : 'text-ink-600 hover:text-ink-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-3 bg-paper-raised border border-paper-border rounded-none px-4 py-2 shadow-sm">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-ink-500 uppercase tracking-widest">From</label>
            <input 
              type="date"
              value={startDate}
              onChange={(e) => handleDateFilterChange('start', e.target.value)}
              className="text-sm px-2 py-1 outline-none text-ink-700"
            />
          </div>
          <div className="w-px h-6 bg-paper-border"></div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-ink-500 uppercase tracking-widest">To</label>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => handleDateFilterChange('end', e.target.value)}
              className="text-sm px-2 py-1 outline-none text-ink-700"
            />
          </div>
          {(startDate || endDate) && (
            <button 
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-xs font-bold text-signal-danger hover:text-signal-danger uppercase tracking-widest ml-2"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-500">Category</p>
        <div className="flex flex-wrap gap-2">
          {NEWS_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`inline-flex items-center gap-2 rounded-none border px-4 py-2 text-sm font-medium transition-all ${
                activeCategory === cat.id
                  ? 'border-ink-900 bg-ink-900 text-paper'
                  : 'border-paper-border bg-paper-raised text-ink-700 hover:border-ink-400'
              }`}
            >
              {cat.shortLabel}
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  activeCategory === cat.id
                    ? 'bg-paper-raised/20 text-paper'
                    : 'bg-ink-100 text-ink-600'
                }`}
              >
                {countByCategory[cat.id] || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex h-32 items-center justify-center rounded-none border border-paper-border bg-paper-raised">
          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-ink-900" />
        </div>
      ) : news.length === 0 ? (
        <div className="rounded-none border border-paper-border bg-paper-raised p-8 text-center text-ink-500">
          No news found for this criteria.
        </div>
      ) : (
        <CategorySection
          categoryMeta={NEWS_CATEGORIES.find((c) => c.id === activeCategory)}
          items={news}
          activeTab={activeTab}
          totalCount={countByCategory[activeCategory] || 0}
          {...tableHandlers}
        />
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4 pb-8">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1 || loading}
            className="px-4 py-2 rounded-none border border-paper-border text-sm font-medium text-ink-600 hover:bg-paper-sunken disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-ink-600 font-medium px-4">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages || loading}
            className="px-4 py-2 rounded-none border border-paper-border text-sm font-medium text-ink-600 hover:bg-paper-sunken disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {editingItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-paper-raised rounded-none shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b border-ink-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-ink-900">Edit Article Metadata</h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-ink-400 hover:text-ink-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1">Title</label>
                <input
                  type="text"
                  readOnly
                  value={editingItem.title}
                  className="w-full rounded-none border border-ink-300 bg-paper-sunken px-4 py-2 text-sm text-ink-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full rounded-none border border-ink-300 px-4 py-2 text-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500 outline-none"
                >
                  {NEWS_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1">
                  AI Generated Summary
                </label>
                <textarea
                  rows={6}
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  className="w-full rounded-none border border-ink-300 px-4 py-2 text-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500 outline-none"
                />
              </div>
            </div>
            <div className="p-4 bg-paper-sunken border-t border-ink-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 text-sm font-medium text-ink-600 hover:text-ink-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                className="px-4 py-2 bg-accent-600 text-paper rounded-none text-sm font-medium hover:bg-accent-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}

export default AdminNewsPage
