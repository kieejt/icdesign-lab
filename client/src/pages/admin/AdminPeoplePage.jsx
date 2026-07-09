import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import ErrorText from '../../components/ErrorText';
import Pagination from '../../components/Pagination'

export default function AdminPeoplePage() {
  const [members, setMembers] = useState([])
  const [memberForm, setMemberForm] = useState({
    name: '',
    role: '',
    category: 'Students',
    email: '',
    research: '',
    image: '',
  })
  const [editingId, setEditingId] = useState('')
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [listLoading, setListLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const loadMembers = async (pageToLoad = page) => {
    try {
      setListLoading(true)
      const { data } = await api.get('/members', { params: { page: pageToLoad, limit: 12, search: debouncedSearch } })
      setMembers(data.data)
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load members')
    } finally {
      setListLoading(false)
    }
  }

  // Debounce the free-text search so we don't fire a request on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Jump back to page 1 whenever the search term changes
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  useEffect(() => {
    loadMembers(page)
  }, [page, debouncedSearch])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (editingId) {
        await api.put(`/members/${editingId}`, memberForm)
      } else {
        await api.post('/members', memberForm)
      }
      setMemberForm({ name: '', role: '', category: 'Students', email: '', research: '', image: '' })
      setEditingId('')
      loadMembers(page)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save member')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this member?')) return
    try {
      await api.delete(`/members/${id}`)
      if (members.length === 1 && page > 1) {
        setPage(page - 1)
      } else {
        loadMembers(page)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete member')
    }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('image', file)

    try {
      // Show loading indicator in real implementation, for now just await
      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setMemberForm({ ...memberForm, image: data.url })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload image')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900 border-b border-slate-200 pb-4">Manage People</h2>
      <ErrorText message={error} />
      <form onSubmit={handleSubmit} className="space-y-3">
        <input value={memberForm.name} onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })} className="w-full rounded border px-3 py-2" placeholder="Name" required />
        <input value={memberForm.role} onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })} className="w-full rounded border px-3 py-2" placeholder="Role (e.g. PhD Student, Lecturer)" required />
        <select value={memberForm.category} onChange={(e) => setMemberForm({ ...memberForm, category: e.target.value })} className="w-full rounded border px-3 py-2">
          <option value="Professors">Professors</option>
          <option value="Students">Students</option>
          <option value="Alumni">Alumni</option>
        </select>
        <input type="email" value={memberForm.email} onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })} className="w-full rounded border px-3 py-2" placeholder="Email" required />
        <input value={memberForm.research} onChange={(e) => setMemberForm({ ...memberForm, research: e.target.value })} className="w-full rounded border px-3 py-2" placeholder="Research" />
        
        <div className="flex items-center gap-4 border rounded p-3 bg-slate-50">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Profile Image</label>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            <div className="mt-2 text-xs text-slate-500">Or enter URL manually:</div>
            <input value={memberForm.image} onChange={(e) => setMemberForm({ ...memberForm, image: e.target.value })} className="w-full rounded border px-3 py-1.5 text-sm mt-1" placeholder="Image URL" />
          </div>
          {memberForm.image && (
            <div className="w-16 h-16 rounded overflow-hidden border bg-white shrink-0">
              <img src={memberForm.image.startsWith('/') ? `http://localhost:5000${memberForm.image}` : memberForm.image} alt="Preview" className="w-full h-full object-cover" onError={(e) => { e.target.src = 'https://via.placeholder.com/64?text=Error' }} />
            </div>
          )}
        </div>

        <button className="rounded bg-blue-600 px-4 py-2 text-white">{editingId ? 'Update' : 'Create'}</button>
      </form>
      <div className="flex items-center justify-between gap-4 mt-4">
        <h3 className="text-sm font-medium text-slate-700">Members {total ? `(${total})` : ''}</h3>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name or email..."
          className="rounded border px-3 py-2 text-sm"
        />
      </div>
      <div className="mt-2 space-y-2">
        {members.map((member) => (
          <div key={member._id} className="flex items-center justify-between rounded bg-slate-100 p-3">
            <div>
              <p className="font-medium">{member.name} <span className="text-xs text-slate-500">({member.category || 'Students'})</span></p>
              <p className="text-sm text-slate-600">{member.email}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingId(member._id)
                  setMemberForm({
                    name: member.name,
                    role: member.role,
                    category: member.category || 'Students',
                    email: member.email,
                    research: member.research || '',
                    image: member.image || '',
                  })
                }}
                className="rounded bg-amber-500 px-3 py-1 text-sm text-white"
              >
                Edit
              </button>
              <button onClick={() => handleDelete(member._id)} className="rounded bg-red-600 px-3 py-1 text-sm text-white">Delete</button>
            </div>
          </div>
        ))}
      </div>
      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} loading={listLoading} />
    </div>
  )
}
