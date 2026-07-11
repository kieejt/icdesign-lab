import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import ErrorText from '../../components/ErrorText';
import Pagination from '../../components/Pagination'
import Modal from '../../components/Modal'
import Toast from '../../components/Toast'

const CATEGORY_TABS = [
  { id: 'Professors', label: 'Professors' },
  { id: 'Students', label: 'Students' },
  { id: 'Alumni', label: 'Alumni' },
]

const EMPTY_FORM = {
  name: '',
  role: '',
  category: 'Professors',
  email: '',
  research: '',
  image: '',
}

export default function AdminPeoplePage() {
  const [members, setMembers] = useState([])
  const [memberForm, setMemberForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [activeCategory, setActiveCategory] = useState('Professors')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [listLoading, setListLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const showToast = (message, type = 'info') => setToast({ message, type })

  const loadMembers = async () => {
    try {
      setListLoading(true)
      const { data } = await api.get('/members', {
        params: { page, limit: 12, search: debouncedSearch, category: activeCategory },
      })
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
    loadMembers()
  }, [page, debouncedSearch, activeCategory])

  const handleTabChange = (category) => {
    setActiveCategory(category)
    setPage(1)
  }

  const openAddModal = () => {
    setEditingId('')
    setMemberForm({ ...EMPTY_FORM, category: activeCategory })
    setError('')
    setIsModalOpen(true)
  }

  const openEditModal = (member) => {
    setEditingId(member._id)
    setMemberForm({
      name: member.name,
      role: member.role,
      category: member.category || 'Students',
      email: member.email,
      research: member.research || '',
      image: member.image || '',
    })
    setError('')
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingId('')
    setMemberForm(EMPTY_FORM)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (editingId) {
        await api.put(`/members/${editingId}`, memberForm)
        showToast('Member updated successfully.', 'success')
      } else {
        await api.post('/members', memberForm)
        showToast('Member added successfully.', 'success')
      }
      closeModal()
      loadMembers()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save member')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this member?')) return
    try {
      await api.delete(`/members/${id}`)
      showToast('Member deleted.', 'success')
      if (members.length === 1 && page > 1) {
        setPage(page - 1)
      } else {
        loadMembers()
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete member', 'error')
    }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('image', file)

    try {
      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setMemberForm((prev) => ({ ...prev, image: data.url }))
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload image')
    }
  }

  const resolveImageSrc = (image) => (image?.startsWith('/') ? `http://localhost:5000${image}` : image)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Manage People</h2>
        <button
          type="button"
          onClick={openAddModal}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          + Add Member
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex space-x-1 rounded-xl bg-slate-100 p-1 w-full max-w-xl">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabChange(tab.id)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
              activeCategory === tab.id
                ? 'bg-white text-slate-900 shadow'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-medium text-slate-700">{activeCategory} {total ? `(${total})` : ''}</h3>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name or email..."
          className="rounded border px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-2">
        {listLoading ? (
          <div className="flex h-24 items-center justify-center rounded-xl border border-slate-200 bg-white">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-slate-900" />
          </div>
        ) : members.length === 0 ? (
          <p className="text-slate-500 py-8 text-center bg-slate-50 rounded-lg border border-slate-200 border-dashed">
            No {activeCategory.toLowerCase()} found. Use "Add Member" to create one.
          </p>
        ) : (
          members.map((member) => (
            <div key={member._id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full overflow-hidden border bg-slate-100 shrink-0">
                  {member.image ? (
                    <img
                      src={resolveImageSrc(member.image)}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">{member.name}</p>
                  <p className="text-sm text-slate-500 truncate">{member.role} · {member.email}</p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => openEditModal(member)}
                  className="rounded bg-amber-500 px-3 py-1 text-sm text-white hover:bg-amber-600"
                >
                  Edit
                </button>
                <button onClick={() => handleDelete(member._id)} className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700">
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} loading={listLoading} />

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingId ? 'Edit Member' : 'Add New Member'}
        footer={
          <>
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="member-form"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              {editingId ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <ErrorText message={error} />
        <form id="member-form" onSubmit={handleSubmit} className="space-y-3">
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
                <img src={resolveImageSrc(memberForm.image)} alt="Preview" className="w-full h-full object-cover" onError={(e) => { e.target.src = 'https://via.placeholder.com/64?text=Error' }} />
              </div>
            )}
          </div>
        </form>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
