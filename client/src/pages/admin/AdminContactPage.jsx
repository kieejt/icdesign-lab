import React, { useState } from 'react'

import { AdminCard, AdminPage, AdminSection, AdminTabs, EmptyRow, FormField, InlineNotice, RowActions } from '../../components/admin'
import { Badge, ErrorState, Skeleton, formatDate } from '../../components/ui'
import { invalidateQueries, useApiQuery } from '../../hooks/useApiQuery'
import api from '../../lib/api'

const TABS = [
  { id: 'contact', label: 'Contact Information' },
  { id: 'recruitment', label: 'Recruitment (Join the Lab)' },
]

const EMPTY_CONTACT = {
  headName: '',
  addressEn: '',
  addressVi: '',
  email: '',
  phone: '',
  mapUrl: '',
}

const EMPTY_RECRUITMENT = {
  title: '',
  description: '',
  googleFormUrl: '',
  deadline: '',
  status: 'active',
}

export default function AdminContactPage() {
  const [activeTab, setActiveTab] = useState('contact')

  return (
    <AdminPage
      title="Manage Contact & Recruitment"
      description="The lab's public contact details and the open positions shown on the Join page."
    >
      <div className="space-y-6">
        <AdminTabs label="Contact sections" tabs={TABS} active={activeTab} onChange={setActiveTab} />
        {activeTab === 'contact' ? <ContactManager /> : <RecruitmentManager />}
      </div>
    </AdminPage>
  )
}

function ContactSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      <div className="grid gap-5 md:grid-cols-2">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
      <Skeleton className="h-20" />
      <Skeleton className="h-20" />
      <Skeleton className="h-24" />
    </div>
  )
}

function ContactManager() {
  const { data, loading, error: loadError, refetch } = useApiQuery('/settings/contact_info', { staleTime: 0 })
  // Edits live in `draft`; until the first keystroke the form shows the fetched
  // value, so there is no effect copying server data into state.
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const form = draft ?? { ...EMPTY_CONTACT, ...data?.value }
  const setField = (field) => (e) => setDraft({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      await api.put('/settings/contact_info', { value: form })
      invalidateQueries('/settings/contact_info')
      setSuccess('Contact information updated successfully')
    } catch {
      setError('Failed to save contact information')
    }
  }

  if (loadError && !data) {
    return <ErrorState message="Failed to load contact info" onRetry={refetch} />
  }

  return (
    <AdminCard>
      {loading ? (
        <ContactSkeleton />
      ) : (
        <form onSubmit={handleSubmit} className="max-w-3xl space-y-5">
          {error && <InlineNotice>{error}</InlineNotice>}
          {success && <InlineNotice tone="ok">{success}</InlineNotice>}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <FormField label="Head of Lab Name" htmlFor="contact-head" required>
              <input id="contact-head" value={form.headName} onChange={setField('headName')} className="field" required />
            </FormField>
            <FormField label="Email" htmlFor="contact-email" required>
              <input id="contact-email" type="email" value={form.email} onChange={setField('email')} className="field" required />
            </FormField>
            <FormField label="Phone" htmlFor="contact-phone" required>
              <input id="contact-phone" value={form.phone} onChange={setField('phone')} className="field" required />
            </FormField>
          </div>
          <FormField label="Address (English)" htmlFor="contact-address-en" required>
            <textarea id="contact-address-en" value={form.addressEn} onChange={setField('addressEn')} className="field" rows="2" required />
          </FormField>
          <FormField label="Address (Vietnamese)" htmlFor="contact-address-vi" required>
            <textarea id="contact-address-vi" value={form.addressVi} onChange={setField('addressVi')} className="field" rows="2" required />
          </FormField>
          <FormField label="Google Maps Embed URL" htmlFor="contact-map" required>
            <textarea
              id="contact-map"
              value={form.mapUrl}
              onChange={setField('mapUrl')}
              className="field"
              rows="3"
              placeholder="https://www.google.com/maps/embed?..."
              required
            />
          </FormField>

          <button type="submit" className="btn-primary">
            Save Contact Info
          </button>
        </form>
      )}
    </AdminCard>
  )
}

function RecruitmentRow({ item, onEdit, onDelete }) {
  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={item.status === 'active' ? 'ok' : 'danger'}>{item.status}</Badge>
          <p className="font-medium text-ink-950">{item.title}</p>
        </div>
        <p className="text-sm text-ink-500">Deadline: {formatDate(item.deadline)}</p>
        <p className="line-clamp-2 pt-1 text-sm text-ink-700">{item.description}</p>
      </div>
      <RowActions onEdit={() => onEdit(item)} onDelete={() => onDelete(item._id)} />
    </li>
  )
}

function RecruitmentSkeleton() {
  return (
    <ul className="divide-hairline" aria-hidden="true">
      {Array.from({ length: 3 }, (_, i) => (
        <li key={i} className="space-y-2 px-5 py-4">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
          <Skeleton className="h-3 w-2/3" />
        </li>
      ))}
    </ul>
  )
}

function RecruitmentManager() {
  const { data, loading, error: loadError, refetch } = useApiQuery('/recruitment', { staleTime: 0 })
  const items = data ?? []
  const [form, setForm] = useState(EMPTY_RECRUITMENT)
  const [editingId, setEditingId] = useState('')
  const [error, setError] = useState('')

  const setField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const resetForm = () => {
    setForm(EMPTY_RECRUITMENT)
    setEditingId('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (editingId) {
        await api.put(`/recruitment/${editingId}`, form)
      } else {
        await api.post('/recruitment', form)
      }
      resetForm()
      invalidateQueries('/recruitment')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save recruitment')
    }
  }

  const handleEdit = (item) => {
    setEditingId(item._id)
    setForm({
      title: item.title,
      description: item.description,
      googleFormUrl: item.googleFormUrl,
      deadline: new Date(item.deadline).toISOString().slice(0, 10),
      status: item.status,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this recruitment?')) return
    try {
      await api.delete(`/recruitment/${id}`)
      invalidateQueries('/recruitment')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete recruitment')
    }
  }

  return (
    <div className="space-y-8">
      <AdminSection title={editingId ? 'Edit Recruitment' : 'Create Recruitment'}>
        <AdminCard>
          <form onSubmit={handleSubmit} className="max-w-3xl space-y-5">
            {error && <InlineNotice>{error}</InlineNotice>}
            <FormField label="Title" htmlFor="rec-title" required>
              <input id="rec-title" value={form.title} onChange={setField('title')} className="field" required />
            </FormField>
            <FormField label="Description" htmlFor="rec-description" required>
              <textarea id="rec-description" value={form.description} onChange={setField('description')} className="field min-h-24" required />
            </FormField>
            <FormField label="Google Form URL" htmlFor="rec-url" required>
              <input id="rec-url" type="url" value={form.googleFormUrl} onChange={setField('googleFormUrl')} className="field" required />
            </FormField>

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Deadline" htmlFor="rec-deadline" required>
                <input id="rec-deadline" type="date" value={form.deadline} onChange={setField('deadline')} className="field" required />
              </FormField>
              <FormField label="Status" htmlFor="rec-status">
                <select id="rec-status" value={form.status} onChange={setField('status')} className="field">
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                </select>
              </FormField>
            </div>

            <div className="flex gap-3">
              <button type="submit" className="btn-primary">
                {editingId ? 'Update' : 'Create'}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className="btn-secondary">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </AdminCard>
      </AdminSection>

      <AdminSection title="Open Positions" count={items.length}>
        {loadError && !data ? (
          <ErrorState message={loadError.response?.data?.message || 'Failed to load recruitment'} onRetry={refetch} />
        ) : !loading && items.length === 0 ? (
          <EmptyRow>No recruitment posts yet.</EmptyRow>
        ) : (
          <AdminCard padded={false}>
            {loading ? (
              <RecruitmentSkeleton />
            ) : (
              <ul className="divide-hairline">
                {items.map((item) => (
                  <RecruitmentRow key={item._id} item={item} onEdit={handleEdit} onDelete={handleDelete} />
                ))}
              </ul>
            )}
          </AdminCard>
        )}
      </AdminSection>
    </div>
  )
}
