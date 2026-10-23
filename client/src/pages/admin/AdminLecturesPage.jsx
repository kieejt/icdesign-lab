import React, { useState } from 'react'

import { AdminCard, AdminPage, AdminSection, EmptyRow, FormField, InlineNotice, RowActions } from '../../components/admin'
import { Skeleton } from '../../components/ui'
import { invalidateQueries, useApiQuery } from '../../hooks/useApiQuery'
import api from '../../lib/api'

const EMPTY_FORM = { title: '', description: '', youtubeUrl: '', materialUrl: '' }

function LectureRow({ lecture, onEdit, onDelete }) {
  return (
    <tr>
      <td className="max-w-sm px-5 py-4">
        <p className="truncate text-sm font-medium text-ink-950">{lecture.title}</p>
        {lecture.description && <p className="mt-1 truncate text-xs text-ink-500">{lecture.description}</p>}
      </td>
      <td className="px-5 py-4">
        <span className="block max-w-xs truncate text-xs text-ink-500">{lecture.youtubeUrl || 'None'}</span>
      </td>
      <td className="px-5 py-4">
        <div className="flex justify-end">
          <RowActions onEdit={() => onEdit(lecture)} onDelete={() => onDelete(lecture)} />
        </div>
      </td>
    </tr>
  )
}

function LectureTableSkeleton() {
  return (
    <div className="divide-hairline" aria-hidden="true">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="space-y-2 px-5 py-4">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  )
}

export default function AdminLecturesPage() {
  const { data, loading, error: loadError, refetch } = useApiQuery('/lectures', { staleTime: 0 })
  const lectures = data ?? []

  const [form, setForm] = useState(EMPTY_FORM)
  const [editLectureId, setEditLectureId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const editMode = editLectureId !== null

  const setField = (name) => (e) => setForm((prev) => ({ ...prev, [name]: e.target.value }))

  const reload = () => {
    invalidateQueries('/lectures')
    refetch()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      if (editMode) {
        await api.put(`/lectures/${editLectureId}`, form)
        setSuccess(`Lecture "${form.title}" has been successfully updated.`)
        setEditLectureId(null)
      } else {
        await api.post('/lectures', form)
        setSuccess(`Lecture "${form.title}" has been successfully uploaded.`)
      }
      setForm(EMPTY_FORM)
      reload()
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${editMode ? 'update' : 'create'} lecture`)
    } finally {
      setSaving(false)
    }
  }

  const handleStartEdit = (lec) => {
    setForm({
      title: lec.title || '',
      description: lec.description || '',
      youtubeUrl: lec.youtubeUrl || '',
      materialUrl: lec.materialUrl || '',
    })
    setEditLectureId(lec._id)
    setError('')
    setSuccess('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    setForm(EMPTY_FORM)
    setEditLectureId(null)
    setError('')
    setSuccess('')
  }

  const handleDelete = async (lec) => {
    if (!window.confirm(`Are you sure you want to delete lecture "${lec.title}"? All student questions and answers on this lecture will be lost.`)) {
      return
    }

    setError('')
    setSuccess('')
    try {
      await api.delete(`/lectures/${lec._id}`)
      setSuccess(`Lecture "${lec.title}" deleted.`)
      reload()
      if (editLectureId === lec._id) handleCancelEdit()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete lecture')
    }
  }

  const notice = error || (loadError && !data ? loadError.response?.data?.message || 'Failed to load lectures' : '')

  return (
    <AdminPage
      title="Upload Video Lectures"
      description="Publish learning videos and slides for lab students. Students can watch videos, download materials, and ask questions here."
    >
      {notice && <InlineNotice>{notice}</InlineNotice>}
      {success && <InlineNotice tone="ok">{success}</InlineNotice>}

      <AdminSection title={editMode ? `Edit Lecture: ${form.title}` : 'Publish New Lecture'}>
        <AdminCard>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <FormField label="Lecture Title" htmlFor="lecture-title" required className="sm:col-span-2">
                <input
                  id="lecture-title"
                  type="text"
                  value={form.title}
                  onChange={setField('title')}
                  className="field"
                  placeholder="e.g. CMOS VLSI Lecture 1: MOSFET Physics"
                  required
                />
              </FormField>

              <FormField
                label="YouTube Video Link"
                htmlFor="lecture-youtube"
                hint="Copy and paste the full YouTube browser link or sharing URL."
              >
                <input
                  id="lecture-youtube"
                  type="url"
                  value={form.youtubeUrl}
                  onChange={setField('youtubeUrl')}
                  className="field"
                  placeholder="e.g. https://www.youtube.com/watch?v=..."
                />
              </FormField>

              <FormField
                label="Teaching Material Link (slides/PDFs)"
                htmlFor="lecture-material"
                hint={'Set your Google Drive slide/PDF sharing to "Anyone with the link can view".'}
              >
                <input
                  id="lecture-material"
                  type="url"
                  value={form.materialUrl}
                  onChange={setField('materialUrl')}
                  className="field"
                  placeholder="e.g. https://drive.google.com/file/d/..."
                />
              </FormField>

              <FormField label="Lecture Description" htmlFor="lecture-description" className="sm:col-span-2">
                <textarea
                  id="lecture-description"
                  value={form.description}
                  onChange={setField('description')}
                  rows={4}
                  className="field"
                  placeholder="Provide a brief summary of the topics covered in this lecture..."
                />
              </FormField>
            </div>

            <div className="flex justify-end gap-3">
              {editMode && (
                <button type="button" onClick={handleCancelEdit} className="btn-secondary">
                  Cancel Edit
                </button>
              )}
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : editMode ? 'Update Lecture' : 'Publish Lecture'}
              </button>
            </div>
          </form>
        </AdminCard>
      </AdminSection>

      <AdminSection title="Current Video Lectures" count={lectures.length}>
        {loading ? (
          <AdminCard padded={false}>
            <LectureTableSkeleton />
          </AdminCard>
        ) : lectures.length === 0 ? (
          <EmptyRow>No learning lectures published. Add your first lecture reference above.</EmptyRow>
        ) : (
          <AdminCard padded={false} className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-paper-border">
                  <th scope="col" className="eyebrow px-5 py-3">Lecture Info</th>
                  <th scope="col" className="eyebrow px-5 py-3">YouTube Embed ID</th>
                  <th scope="col" className="eyebrow px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-border">
                {lectures.map((lec) => (
                  <LectureRow key={lec._id} lecture={lec} onEdit={handleStartEdit} onDelete={handleDelete} />
                ))}
              </tbody>
            </table>
          </AdminCard>
        )}
      </AdminSection>
    </AdminPage>
  )
}
