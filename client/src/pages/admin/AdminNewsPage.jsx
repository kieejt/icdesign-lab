import React, { useState, useEffect, useMemo } from 'react'
import api from '../../lib/api'
import ErrorCard from '../../components/ErrorCard'
import {
  NEWS_CATEGORIES,
  CATEGORY_BADGE_STYLES,
  CATEGORY_SECTION_STYLES,
} from '../../constants/newsCategories'

function NewsTable({ items, activeTab, onEdit, onAction, onDelete }) {
  if (items.length === 0) {
    return (
      <p className="px-6 py-8 text-center text-sm text-slate-500">
        No articles in this category.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-6 py-3 font-medium">Title & AI Summary</th>
            <th className="px-6 py-3 font-medium">Source</th>
            <th className="px-6 py-3 font-medium">AI Score</th>
            <th className="px-6 py-3 font-medium">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {items.map((item) => (
            <tr key={item._id} className="hover:bg-slate-50/80">
              <td className="px-6 py-4 max-w-lg">
                <div className="font-medium text-slate-900 mb-1 flex items-start gap-2">
                  {item.thumbnail && (
                    <img src={item.thumbnail} alt="" className="w-8 h-8 object-cover shrink-0" />
                  )}
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-600 hover:underline"
                  >
                    {item.title}
                  </a>
                </div>
                <div className="text-slate-500 text-xs mt-2 line-clamp-3 bg-slate-50 p-2 border border-slate-100">
                  {item.summary}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="inline-flex items-center bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  {item.source}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="font-semibold text-emerald-600">{item.score}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex flex-col gap-2 min-w-[140px]">
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    className="rounded bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 text-center"
                  >
                    Edit Detail
                  </button>
                  {activeTab === 'pending' ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onAction(item._id, 'approve')}
                        className="flex-1 rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => onAction(item._id, 'reject')}
                        className="flex-1 rounded bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700"
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
                          className="flex-1 rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
                        >
                          Delete
                        </button>
                      )}
                      {activeTab === 'rejected' && (
                        <button
                          type="button"
                          onClick={() => onAction(item._id, 'restore')}
                          className="flex-1 rounded px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100"
                        >
                          Restore
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CategorySection({ categoryMeta, items, activeTab, onEdit, onAction, onDelete }) {
  const badgeClass =
    CATEGORY_BADGE_STYLES[categoryMeta.id] || 'bg-slate-50 text-slate-800 ring-slate-200'
  const borderClass = CATEGORY_SECTION_STYLES[categoryMeta.id] || 'border-l-slate-400'

  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden border-l-4 ${borderClass}`}
    >
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-6 py-4 bg-slate-50/80 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-base font-semibold text-slate-900">{categoryMeta.label}</h3>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${badgeClass}`}
            >
              {items.length} {items.length === 1 ? 'article' : 'articles'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">{categoryMeta.description}</p>
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
  const [activeCategory, setActiveCategory] = useState('All')

  const [editingItem, setEditingItem] = useState(null)
  const [editSummary, setEditSummary] = useState('')
  const [editCategory, setEditCategory] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const endpoint = activeTab === 'pending' ? 'pending' : 'history'
      const [newsRes, cronRes] = await Promise.all([
        api.get(`/news/${endpoint}`),
        api.get('/news/cron-time'),
      ])

      let filteredNews = newsRes.data
      if (activeTab === 'published') {
        filteredNews = newsRes.data.filter((item) => item.status === 'approved')
      } else if (activeTab === 'rejected') {
        filteredNews = newsRes.data.filter((item) => item.status === 'rejected')
      }

      setNews(filteredNews)
      setCronTime(cronRes.data)
      setError(null)
    } catch (err) {
      setError('Failed to load news data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [activeTab])

  const countByCategory = useMemo(() => {
    const counts = { All: news.length }
    NEWS_CATEGORIES.forEach((cat) => {
      counts[cat.id] = news.filter((n) => n.category === cat.id).length
    })
    return counts
  }, [news])

  const newsByCategory = useMemo(() => {
    const grouped = {}
    NEWS_CATEGORIES.forEach((cat) => {
      grouped[cat.id] = news.filter((n) => n.category === cat.id)
    })
    return grouped
  }, [news])

  const displayedNews = useMemo(() => {
    if (activeCategory === 'All') return news
    return news.filter((n) => n.category === activeCategory)
  }, [news, activeCategory])

  const handleAction = async (id, action) => {
    try {
      await api.post(`/news/${id}/${action}`)
      fetchData()
    } catch (err) {
      alert('Error executing this action.')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this article?')) return
    try {
      await api.delete(`/news/${id}`)
      fetchData()
    } catch (err) {
      alert('Error deleting news.')
    }
  }

  const handleManualFetch = async () => {
    setIsFetching(true)
    try {
      const res = await api.post('/news/fetch')
      const stats = res.data?.perCategory
      const summary = stats
        ? NEWS_CATEGORIES.map((c) => `${c.shortLabel}: ${stats[c.id]?.saved ?? 0} saved`).join('\n')
        : ''
      alert(summary ? `Fetch completed.\n${summary}` : 'News aggregation successful!')
      fetchData()
    } catch (err) {
      alert('Error during news aggregation.')
    } finally {
      setIsFetching(false)
    }
  }

  const handleSaveCron = async () => {
    setIsSavingCron(true)
    try {
      await api.post('/news/cron-time', cronTime)
      alert('Automatic aggregation time updated!')
    } catch (err) {
      alert('Error updating time.')
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
      alert('Failed to update news item')
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Manage AI News System</h2>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
            <span className="text-sm text-slate-600">Auto Fetch:</span>
            <input
              type="number"
              min="0"
              max="23"
              value={cronTime.hour}
              onChange={(e) => setCronTime({ ...cronTime, hour: parseInt(e.target.value) || 0 })}
              className="w-12 rounded border border-slate-300 px-1 py-1 text-center text-sm outline-none focus:border-blue-500"
            />
            <span className="text-sm font-bold">:</span>
            <input
              type="number"
              min="0"
              max="59"
              value={cronTime.minute}
              onChange={(e) => setCronTime({ ...cronTime, minute: parseInt(e.target.value) || 0 })}
              className="w-12 rounded border border-slate-300 px-1 py-1 text-center text-sm outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={handleSaveCron}
              disabled={isSavingCron}
              className="ml-2 rounded bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-700 disabled:bg-slate-400"
            >
              Save
            </button>
          </div>
          <button
            type="button"
            onClick={handleManualFetch}
            disabled={isFetching}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all ${
              isFetching ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isFetching ? 'Aggregating AI...' : 'Fetch Sources Now'}
          </button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex space-x-1 rounded-xl bg-slate-100 p-1 max-w-xl">
        {[
          { id: 'pending', label: 'Pending' },
          { id: 'published', label: 'Published' },
          { id: 'rejected', label: 'Rejected' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Category tabs */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Category</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory('All')}
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
              activeCategory === 'All'
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
            }`}
          >
            All
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                activeCategory === 'All' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {countByCategory.All}
            </span>
          </button>
          {NEWS_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                activeCategory === cat.id
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
              }`}
            >
              {cat.shortLabel}
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  activeCategory === cat.id
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {countByCategory[cat.id]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex h-32 items-center justify-center rounded-xl border border-slate-200 bg-white">
          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-slate-900" />
        </div>
      ) : news.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          No news found for this status.
        </div>
      ) : activeCategory === 'All' ? (
        <div className="space-y-8">
          {NEWS_CATEGORIES.map((cat) => (
            <CategorySection
              key={cat.id}
              categoryMeta={cat}
              items={newsByCategory[cat.id]}
              activeTab={activeTab}
              {...tableHandlers}
            />
          ))}
        </div>
      ) : displayedNews.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          No articles in{' '}
          {NEWS_CATEGORIES.find((c) => c.id === activeCategory)?.label || activeCategory}.
        </div>
      ) : (
        <CategorySection
          categoryMeta={NEWS_CATEGORIES.find((c) => c.id === activeCategory)}
          items={displayedNews}
          activeTab={activeTab}
          {...tableHandlers}
        />
      )}

      {editingItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900">Edit Article Metadata</h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  readOnly
                  value={editingItem.title}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm text-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                >
                  {NEWS_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  AI Generated Summary
                </label>
                <textarea
                  rows={6}
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminNewsPage
