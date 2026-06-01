import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import ErrorText from '../../components/ErrorText';

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

  const loadMembers = async () => {
    try {
      const { data } = await api.get('/members')
      setMembers(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load members')
    }
  }

  useEffect(() => {
    loadMembers()
  }, [])

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
      loadMembers()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save member')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this member?')) return
    try {
      await api.delete(`/members/${id}`)
      loadMembers()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete member')
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
        <input value={memberForm.image} onChange={(e) => setMemberForm({ ...memberForm, image: e.target.value })} className="w-full rounded border px-3 py-2" placeholder="Image URL" />
        <button className="rounded bg-blue-600 px-4 py-2 text-white">{editingId ? 'Update' : 'Create'}</button>
      </form>
      <div className="mt-4 space-y-2">
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
    </div>
  )
}
