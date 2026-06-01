import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import ErrorText from '../../components/ErrorText';

export default function AdminRecruitmentPage() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({
    title: '',
    description: '',
    googleFormUrl: '',
    deadline: '',
    status: 'active',
  })
  const [editingId, setEditingId] = useState('')
  const [error, setError] = useState('')

  const loadRecruitment = async () => {
    try {
      const { data } = await api.get('/recruitment')
      setItems(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load recruitment')
    }
  }

  useEffect(() => {
    loadRecruitment()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (editingId) {
        await api.put(`/recruitment/${editingId}`, form)
      } else {
        await api.post('/recruitment', form)
      }
      setForm({
        title: '',
        description: '',
        googleFormUrl: '',
        deadline: '',
        status: 'active',
      })
      setEditingId('')
      loadRecruitment()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save recruitment')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this recruitment?')) return
    try {
      await api.delete(`/recruitment/${id}`)
      loadRecruitment()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete recruitment')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900 border-b border-slate-200 pb-4">Manage Recruitment</h2>
      <ErrorText message={error} />
      <form onSubmit={handleSubmit} className="space-y-3">
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded border px-3 py-2" placeholder="Title" required />
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-24 w-full rounded border px-3 py-2" placeholder="Description" required />
        <input type="url" value={form.googleFormUrl} onChange={(e) => setForm({ ...form, googleFormUrl: e.target.value })} className="w-full rounded border px-3 py-2" placeholder="Google Form URL" required />
        <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="w-full rounded border px-3 py-2" required />
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full rounded border px-3 py-2">
          <option value="active">active</option>
          <option value="closed">closed</option>
        </select>
        <button className="rounded bg-blue-600 px-4 py-2 text-white">{editingId ? 'Update' : 'Create'}</button>
      </form>
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <div key={item._id} className="rounded bg-slate-100 p-3">
            <div className="flex items-center justify-between">
              <p className="font-medium">{item.title}</p>
              <span className="text-xs uppercase text-slate-600">{item.status}</span>
            </div>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => {
                  setEditingId(item._id)
                  setForm({
                    title: item.title,
                    description: item.description,
                    googleFormUrl: item.googleFormUrl,
                    deadline: new Date(item.deadline).toISOString().slice(0, 10),
                    status: item.status,
                  })
                }}
                className="rounded bg-amber-500 px-3 py-1 text-sm text-white"
              >
                Edit
              </button>
              <button onClick={() => handleDelete(item._id)} className="rounded bg-red-600 px-3 py-1 text-sm text-white">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
