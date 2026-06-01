import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import ErrorText from '../../components/ErrorText';

export default function AdminResearchPage() {
  const [researchItems, setResearchItems] = useState([])
  const [activeTab, setActiveTab] = useState('Project')
  const [form, setForm] = useState({ 
    title: '', 
    description: '', 
    authors: '',
    journal: '',
    link: '',
    image: '',
    date: '' 
  })
  const [editingId, setEditingId] = useState('')
  const [error, setError] = useState('')

  const loadResearch = async () => {
    try {
      const { data } = await api.get('/research')
      setResearchItems(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load research')
    }
  }

  useEffect(() => {
    loadResearch()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const payload = { ...form, category: activeTab }
      if (editingId) {
        await api.put(`/research/${editingId}`, payload)
      } else {
        await api.post('/research', payload)
      }
      resetForm()
      loadResearch()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save research')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this research item?')) return
    try {
      await api.delete(`/research/${id}`)
      loadResearch()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete research')
    }
  }

  const resetForm = () => {
    setForm({ 
      title: '', 
      description: '', 
      authors: '',
      journal: '',
      link: '',
      image: '',
      date: '' 
    })
    setEditingId('')
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    resetForm()
    setError('')
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900 border-b border-slate-200 pb-4">Manage Research & Publications</h2>
      <ErrorText message={error} />
      
      {/* Top Level Tabs */}
      <div className="flex gap-6 border-b border-slate-200">
        <button
          type="button"
          className={`pb-3 px-2 ${activeTab === 'Project' ? 'border-b-2 border-blue-600 font-semibold text-slate-900' : 'text-slate-500 font-medium hover:text-slate-700'}`}
          onClick={() => handleTabChange('Project')}
        >
          Manage Projects
        </button>
        <button
          type="button"
          className={`pb-3 px-2 ${activeTab === 'Publications' ? 'border-b-2 border-blue-600 font-semibold text-slate-900' : 'text-slate-500 font-medium hover:text-slate-700'}`}
          onClick={() => handleTabChange('Publications')}
        >
          Manage Publications
        </button>
      </div>

      {/* Dynamic Form based on Tab */}
      <form onSubmit={handleSubmit} className="space-y-4 bg-slate-50 p-6 rounded-lg border border-slate-200">
        <h3 className="font-semibold text-slate-800 mb-2">{editingId ? `Edit ${activeTab}` : `Add New ${activeTab}`}</h3>
        
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded border px-3 py-2" placeholder={`${activeTab} Title`} required />
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-24 w-full rounded border px-3 py-2" placeholder="Description or Abstract" required />
        
        {/* Conditional Academic Fields */}
        {activeTab === 'Publications' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={form.authors} onChange={(e) => setForm({ ...form, authors: e.target.value })} className="w-full rounded border px-3 py-2" placeholder="Authors (e.g. Dr. A, Student B)" />
            <input value={form.journal} onChange={(e) => setForm({ ...form, journal: e.target.value })} className="w-full rounded border px-3 py-2" placeholder="Journal / Conference Name" />
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input type="url" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} className="w-full rounded border px-3 py-2" placeholder={`Link to ${activeTab} URL`} />
          <input type="url" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} className="w-full rounded border px-3 py-2" placeholder="Cover Image URL (Optional)" />
        </div>
        
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            {activeTab === 'Publications' ? 'Publication Date (Used for Timeline)' : 'Project Date (Optional)'}
          </label>
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full md:w-1/3 rounded border px-3 py-2" required={activeTab === 'Publications'} />
        </div>

        <div className="flex gap-2 pt-2">
          <button type="submit" className="rounded bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
            {editingId ? `Update ${activeTab}` : `Save ${activeTab}`}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="rounded bg-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300 transition-colors">
              Cancel Edit
            </button>
          )}
        </div>
      </form>
      
      {/* Filtered List */}
      <div className="mt-8 space-y-4">
        <h3 className="font-semibold text-slate-800">Existing {activeTab}s</h3>
        {researchItems.filter(i => i.category === activeTab).map((item) => (
          <div key={item._id} className="rounded border border-slate-200 bg-white p-5 hover:shadow-sm transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-slate-900 text-lg">{item.title}</p>
                <div className="flex gap-2 items-center mt-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{item.category}</span>
                  {item.date && <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{new Date(item.date).toLocaleDateString()}</span>}
                </div>
                {item.authors && <p className="text-sm text-slate-600 mt-3"><span className="font-medium">Authors:</span> {item.authors}</p>}
                {item.journal && <p className="text-sm text-slate-600 mt-1"><span className="font-medium">Journal:</span> {item.journal}</p>}
                {item.link && (
                   <p className="text-sm text-slate-600 mt-1"><span className="font-medium">Link:</span> <a href={item.link} className="text-blue-500 hover:underline" target="_blank" rel="noreferrer">{item.link}</a></p>
                )}
              </div>
            </div>
            
            <div className="mt-5 flex gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setEditingId(item._id)
                  setForm({
                    title: item.title,
                    description: item.description,
                    authors: item.authors || '',
                    journal: item.journal || '',
                    link: item.link || '',
                    image: item.image || '',
                    date: item.date ? new Date(item.date).toISOString().split('T')[0] : ''
                  })
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className="rounded bg-amber-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition-colors shadow-sm"
              >
                Edit
              </button>
              <button type="button" onClick={() => handleDelete(item._id)} className="rounded bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition-colors shadow-sm">
                Delete
              </button>
            </div>
          </div>
        ))}
        
        {researchItems.filter(i => i.category === activeTab).length === 0 && (
          <p className="text-slate-500 py-8 text-center bg-slate-50 rounded-lg border border-slate-200 border-dashed">
            No {activeTab.toLowerCase()} records found. Use the form above to add one.
          </p>
        )}
      </div>
    </div>
  )
}
