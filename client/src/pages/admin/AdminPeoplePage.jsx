import React, { useCallback, useState } from 'react'

import { AdminCard, AdminPage, AdminTabs, AdminThumb, EmptyRow, FormField, InlineNotice, RowActions } from '../../components/admin'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'
import Toast from '../../components/Toast'
import { ErrorState, Skeleton } from '../../components/ui'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { invalidateQueries, useApiQuery } from '../../hooks/useApiQuery'
import api from '../../lib/api'
import { responsiveImage } from '../../lib/image'

const PAGE_SIZE = 12

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

function MemberRow({ member, onEdit, onDelete }) {
  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex min-w-0 items-center gap-4">
        <AdminThumb src={member.image} icon="user" size="h-12 w-12" />
        <div className="min-w-0">
          <p className="truncate font-medium text-ink-950">{member.name}</p>
          <p className="truncate text-sm text-ink-500">
            {member.role} · {member.email}
          </p>
        </div>
      </div>
      <RowActions onEdit={() => onEdit(member)} onDelete={() => onDelete(member._id)} />
    </li>
  )
}

function MemberListSkeleton() {
  return (
    <ul className="divide-hairline" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="h-12 w-12 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function AdminPeoplePage() {
  const [memberForm, setMemberForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [toast, setToast] = useState(null)
  const [activeCategory, setActiveCategory] = useState('Professors')
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const search = useDebouncedValue(searchTerm, 400)

  const { data, loading, error, isValidating, refetch } = useApiQuery('/members', {
    params: { page, limit: PAGE_SIZE, search, category: activeCategory },
    staleTime: 0,
  })

  const members = data?.data ?? []
  const totalPages = data?.totalPages || 1
  const total = data?.total || 0

  const showToast = (message, type = 'info') => setToast({ message, type })
  const dismissToast = useCallback(() => setToast(null), [])
  const setField = (field) => (e) => setMemberForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleTabChange = (category) => {
    setActiveCategory(category)
    setPage(1)
  }

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
    setPage(1)
  }

  const openAddModal = () => {
    setEditingId('')
    setMemberForm({ ...EMPTY_FORM, category: activeCategory })
    setFormError('')
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
    setFormError('')
    setIsModalOpen(true)
  }

  // Stable identity: Modal re-runs its focus effect whenever `onClose` changes,
  // which would pull focus out of the field being typed in.
  const closeModal = useCallback(() => {
    setIsModalOpen(false)
    setEditingId('')
    setMemberForm(EMPTY_FORM)
    setFormError('')
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    try {
      if (editingId) {
        await api.put(`/members/${editingId}`, memberForm)
        showToast('Member updated successfully.', 'success')
      } else {
        await api.post('/members', memberForm)
        showToast('Member added successfully.', 'success')
      }
      closeModal()
      invalidateQueries('/members')
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save member')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this member?')) return
    try {
      await api.delete(`/members/${id}`)
      showToast('Member deleted.', 'success')
      // Deleting the last row of a later page would otherwise leave an empty page.
      if (members.length === 1 && page > 1) setPage(page - 1)
      invalidateQueries('/members')
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
      const { data: uploaded } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setMemberForm((prev) => ({ ...prev, image: uploaded.url }))
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to upload image')
    }
  }

  const listError = error && !data
  const empty = !loading && !listError && members.length === 0

  return (
    <AdminPage
      title="Manage People"
      description="Professors, students and alumni shown on the public People pages."
      actions={
        <button type="button" onClick={openAddModal} className="btn-primary">
          Add Member
        </button>
      }
    >
      <div className="space-y-5">
        <AdminTabs
          label="Member categories"
          tabs={CATEGORY_TABS.map((tab) => (tab.id === activeCategory && total ? { ...tab, count: total } : tab))}
          active={activeCategory}
          onChange={handleTabChange}
        />

        <div className="max-w-md">
          <label htmlFor="people-search" className="sr-only">
            Search members
          </label>
          <input
            id="people-search"
            type="search"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search by name or email..."
            className="field"
          />
        </div>

        {listError ? (
          <ErrorState
            message={error.response?.data?.message || 'Failed to load members'}
            onRetry={refetch}
          />
        ) : empty ? (
          <EmptyRow>
            {search ? 'No members match your search.' : `No ${activeCategory.toLowerCase()} found. Use "Add Member" to create one.`}
          </EmptyRow>
        ) : (
          <AdminCard padded={false} aria-busy={isValidating}>
            {loading ? (
              <MemberListSkeleton />
            ) : (
              <ul className="divide-hairline">
                {members.map((member) => (
                  <MemberRow key={member._id} member={member} onEdit={openEditModal} onDelete={handleDelete} />
                ))}
              </ul>
            )}
          </AdminCard>
        )}

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} loading={isValidating} />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingId ? 'Edit Member' : 'Add New Member'}
        footer={
          <>
            <button type="button" onClick={closeModal} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" form="member-form" className="btn-primary">
              {editingId ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        {formError && <InlineNotice>{formError}</InlineNotice>}
        <form id="member-form" onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Name" htmlFor="member-name" required>
            <input id="member-name" value={memberForm.name} onChange={setField('name')} className="field" required />
          </FormField>
          <FormField label="Role" htmlFor="member-role" required>
            <input
              id="member-role"
              value={memberForm.role}
              onChange={setField('role')}
              className="field"
              placeholder="e.g. PhD Student, Lecturer"
              required
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Category" htmlFor="member-category">
              <select id="member-category" value={memberForm.category} onChange={setField('category')} className="field">
                {CATEGORY_TABS.map((tab) => (
                  <option key={tab.id} value={tab.id}>
                    {tab.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Email" htmlFor="member-email" required>
              <input id="member-email" type="email" value={memberForm.email} onChange={setField('email')} className="field" required />
            </FormField>
          </div>
          <FormField label="Research" htmlFor="member-research">
            <input id="member-research" value={memberForm.research} onChange={setField('research')} className="field" />
          </FormField>

          <div className="flex items-start gap-4 border border-paper-border bg-paper-sunken p-4">
            <div className="min-w-0 flex-1 space-y-3">
              <FormField label="Profile Image" htmlFor="member-image-file">
                <input
                  id="member-image-file"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full text-sm text-ink-500 file:mr-4 file:cursor-pointer file:border file:border-ink-200 file:bg-paper-raised file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink-800"
                />
              </FormField>
              <FormField label="Or image URL" htmlFor="member-image-url">
                <input
                  id="member-image-url"
                  value={memberForm.image}
                  onChange={setField('image')}
                  className="field"
                  placeholder="/uploads/photo.webp"
                />
              </FormField>
            </div>
            {memberForm.image && (
              <img
                {...responsiveImage(memberForm.image)}
                sizes="96px"
                alt="Preview"
                className="h-24 w-24 shrink-0 border border-paper-border bg-paper-raised object-cover"
              />
            )}
          </div>
        </form>
      </Modal>

      <Toast toast={toast} onDismiss={dismissToast} />
    </AdminPage>
  )
}
