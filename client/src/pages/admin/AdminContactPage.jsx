import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import ErrorText from '../../components/ErrorText';

export default function AdminContactPage() {
  const [activeTab, setActiveTab] = useState('contact');

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900 border-b border-slate-200 pb-4">Manage Contact & Recruitment</h2>
      
      <div className="mb-6 flex gap-4 border-b border-slate-200">
        <button
          className={`pb-2 px-2 ${activeTab === 'contact' ? 'border-b-2 border-blue-600 font-semibold text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('contact')}
        >
          Contact Information
        </button>
        <button
          className={`pb-2 px-2 ${activeTab === 'recruitment' ? 'border-b-2 border-blue-600 font-semibold text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('recruitment')}
        >
          Recruitment (Join the Lab)
        </button>
      </div>

      {activeTab === 'contact' ? <ContactManager /> : <RecruitmentManager />}
    </div>
  )
}

function ContactManager() {
  const [form, setForm] = useState({
    headName: '',
    addressEn: '',
    addressVi: '',
    email: '',
    phone: '',
    mapUrl: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadContactInfo = async () => {
      try {
        const { data } = await api.get('/settings/contact_info');
        if (data && data.value) setForm(data.value);
      } catch (err) {
        setError('Failed to load contact info');
      }
    };
    loadContactInfo();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.put('/settings/contact_info', { value: form });
      setSuccess('Contact information updated successfully');
    } catch (err) {
      setError('Failed to save contact information');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl">
      <ErrorText message={error} />
      {success && <p className="text-green-600 font-medium mb-4">{success}</p>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Head of Lab Name</label>
          <input value={form.headName} onChange={e => setForm({...form, headName: e.target.value})} className="w-full rounded border px-3 py-2" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full rounded border px-3 py-2" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
          <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full rounded border px-3 py-2" required />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Address (English)</label>
        <textarea value={form.addressEn} onChange={e => setForm({...form, addressEn: e.target.value})} className="w-full rounded border px-3 py-2" rows="2" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Address (Vietnamese)</label>
        <textarea value={form.addressVi} onChange={e => setForm({...form, addressVi: e.target.value})} className="w-full rounded border px-3 py-2" rows="2" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Google Maps Embed URL</label>
        <textarea value={form.mapUrl} onChange={e => setForm({...form, mapUrl: e.target.value})} className="w-full rounded border px-3 py-2" rows="3" placeholder='https://www.google.com/maps/embed?...' required />
      </div>

      <button type="submit" className="bg-blue-600 text-white px-5 py-2 rounded font-medium mt-2">Save Contact Info</button>
    </form>
  );
}

function RecruitmentManager() {
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
      setForm({ title: '', description: '', googleFormUrl: '', deadline: '', status: 'active' })
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
    <div>
      <ErrorText message={error} />
      <form onSubmit={handleSubmit} className="space-y-3 bg-slate-50 p-4 border border-slate-200 rounded-lg">
        <h3 className="font-semibold text-slate-900">{editingId ? 'Edit Recruitment' : 'Create Recruitment'}</h3>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded border px-3 py-2" placeholder="Title" required />
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-24 w-full rounded border px-3 py-2" placeholder="Description" required />
        <input type="url" value={form.googleFormUrl} onChange={(e) => setForm({ ...form, googleFormUrl: e.target.value })} className="w-full rounded border px-3 py-2" placeholder="Google Form URL" required />
        
        <div className="flex gap-4">
          <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="w-1/2 rounded border px-3 py-2" required />
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-1/2 rounded border px-3 py-2">
            <option value="active">Active</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        
        <div className="flex gap-2">
          <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">{editingId ? 'Update' : 'Create'}</button>
          {editingId && <button type="button" onClick={() => { setEditingId(''); setForm({ title: '', description: '', googleFormUrl: '', deadline: '', status: 'active' }); }} className="rounded bg-slate-500 px-4 py-2 text-white">Cancel</button>}
        </div>
      </form>

      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <div key={item._id} className="rounded-xl border border-slate-200 p-4 shadow-sm relative group bg-white">
            <div className="flex flex-col gap-1 pr-24">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>{item.status}</span>
                <p className="font-bold text-slate-900">{item.title}</p>
              </div>
              <p className="text-sm text-slate-500 font-medium">Deadline: {new Date(item.deadline).toLocaleDateString()}</p>
              <p className="text-sm text-slate-700 mt-2 line-clamp-2">{item.description}</p>
            </div>
            
            <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className="rounded bg-amber-500 p-1.5 text-white shadow hover:bg-amber-600" title="Edit"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
              </button>
              <button onClick={() => handleDelete(item._id)} className="rounded bg-red-600 p-1.5 text-white shadow hover:bg-red-700" title="Delete">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

