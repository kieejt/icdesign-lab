import React, { useRef, useState } from 'react'

import api from '../../lib/api'
import { invalidateQueries, useApiQuery } from '../../hooks/useApiQuery'
import {
  AdminCard,
  AdminPage,
  AdminSection,
  AdminTabs,
  AdminThumb,
  EmptyRow,
  FormField,
  InlineNotice,
  RowActions,
} from '../../components/admin'
import Pagination from '../../components/Pagination'
import EventsManager from './EventsManager'
import { Badge, Icon, Skeleton, cx } from '../../components/ui'

const TABS = [
  { id: 'events', label: 'Lab Events' },
  { id: 'gallery', label: 'Gallery' },
]

const EMPTY_ALBUM = { title: '', category: '', coverImage: '', images: [] }

export default function AdminLabEventPage() {
  const [activeTab, setActiveTab] = useState('events')

  return (
    <AdminPage
      title="Manage Lab Events & Gallery"
      description="Events listed on the public Events page and the photo albums in the Gallery."
    >
      <div className="space-y-6">
        <AdminTabs label="Lab events sections" tabs={TABS} active={activeTab} onChange={setActiveTab} />
        {activeTab === 'events' ? <EventsManager /> : <GalleryManager />}
      </div>
    </AdminPage>
  )
}

/** Failed list load with a retry, shown in place of the list. */
function LoadError({ message, onRetry }) {
  return (
    <InlineNotice>
      {message}{' '}
      <button type="button" onClick={onRetry} className="font-semibold underline underline-offset-2">
        Retry
      </button>
    </InlineNotice>
  )
}

/** Selectable thumbnail of an album image, with a "Set Cover" shortcut. */
function AlbumImageTile({ url, selected, isCover, onToggle, onSetCover }) {
  return (
    <div className="group relative h-20 w-20 shrink-0">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        aria-label={selected ? 'Deselect image' : 'Select image'}
        className={cx(
          'block h-full w-full outline outline-2 outline-offset-0 transition-opacity',
          selected ? 'opacity-80 outline-accent-600' : 'outline-transparent hover:opacity-90',
        )}
      >
        <AdminThumb src={url} size="h-20 w-20" />
      </button>
      {selected && (
        <span className="pointer-events-none absolute right-1 top-1 flex h-4 w-4 items-center justify-center bg-accent-600 text-paper">
          <Icon name="check" className="h-3 w-3" strokeWidth={2.5} />
        </span>
      )}
      {isCover && !selected && (
        <span className="pointer-events-none absolute left-0 top-0 bg-ink-950 px-1.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-label text-paper">
          Cover
        </span>
      )}
      {!selected && !isCover && (
        <button
          type="button"
          onClick={onSetCover}
          className="absolute inset-x-0 bottom-0 bg-ink-950/75 py-0.5 text-center font-mono text-[11px] font-medium uppercase tracking-label text-paper opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
        >
          Set Cover
        </button>
      )}
    </div>
  )
}

function AlbumCard({ item, onEdit, onDelete }) {
  return (
    <div className="surface flex flex-col">
      <div className="relative">
        <AdminThumb src={item.coverImage} alt={item.title} size="aspect-[4/3] w-full" className="border-0 border-b" />
        <Badge className="absolute bottom-2 right-2 bg-paper-raised">{item.images?.length || 0} photos</Badge>
      </div>
      <div className="flex-1 p-4">
        <p className="truncate font-semibold text-ink-950" title={item.title}>
          {item.title}
        </p>
        <p className="eyebrow mt-1">{item.category}</p>
      </div>
      <div className="px-4 pb-4">
        <RowActions onEdit={onEdit} onDelete={onDelete} />
      </div>
    </div>
  )
}

function GalleryManager() {
  const [form, setForm] = useState(EMPTY_ALBUM)
  const [files, setFiles] = useState(null)
  const [editingId, setEditingId] = useState('')
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(null)
  const [selectedImages, setSelectedImages] = useState([])
  const [page, setPage] = useState(1)
  const fileInputRef = useRef(null)

  const { data, loading, error: loadError, refetch } = useApiQuery('/gallery', {
    params: { page, limit: 12 },
    staleTime: 0,
  })
  const refresh = () => invalidateQueries('/gallery')

  const items = data?.data ?? []
  const totalPages = data?.totalPages ?? 1
  const busy = uploadProgress !== null

  const setField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const resetForm = () => {
    setEditingId('')
    setForm(EMPTY_ALBUM)
    setFiles(null)
    setSelectedImages([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setUploadProgress(0)
    try {
      let uploadedUrls = []
      if (files && files.length > 0) {
        const formData = new FormData()
        Array.from(files).forEach((f) => formData.append('images', f))
        const res = await api.post('/upload/batch', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total))
            }
          },
        })
        uploadedUrls = res.data.urls
      }

      setUploadProgress('Saving...')

      const newImages = [...(form.images || []), ...uploadedUrls]
      const payload = {
        title: form.title,
        category: form.category,
        images: newImages,
        coverImage: form.coverImage || newImages[0] || '',
      }

      if (editingId) {
        await api.put(`/gallery/${editingId}`, payload)
      } else {
        await api.post('/gallery', payload)
      }
      resetForm()
      refresh()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save album')
    } finally {
      setUploadProgress(null)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this album and all its images?')) return
    try {
      await api.delete(`/gallery/${id}`)
      refresh()
    } catch {
      setError('Failed to delete album')
    }
  }

  const toggleSelectImage = (index) => {
    setSelectedImages((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]))
  }

  const handleBulkRemove = () => {
    if (!window.confirm(`Remove ${selectedImages.length} selected image(s)?`)) return

    const coverImageRemoved = selectedImages.some((i) => form.images[i] === form.coverImage)
    const remainingImages = form.images.filter((_, i) => !selectedImages.includes(i))

    setForm({
      ...form,
      images: remainingImages,
      coverImage: coverImageRemoved ? remainingImages[0] || '' : form.coverImage,
    })
    setSelectedImages([])
  }

  const handleEditClick = (item) => {
    setEditingId(item._id)
    setForm({
      title: item.title,
      category: item.category,
      coverImage: item.coverImage || '',
      images: item.images || [],
    })
    setSelectedImages([])
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="space-y-8">
      <AdminSection title={editingId ? 'Edit Album' : 'Create New Album'}>
        <AdminCard>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <InlineNotice>{error}</InlineNotice>}

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <FormField label="Album Title" htmlFor="album-title" required className="md:col-span-2">
                <input
                  id="album-title"
                  value={form.title}
                  onChange={setField('title')}
                  className="field"
                  placeholder="Album Title"
                  required
                />
              </FormField>
              <FormField label="Category" htmlFor="album-category" required>
                <input
                  id="album-category"
                  value={form.category}
                  onChange={setField('category')}
                  className="field"
                  placeholder="Category (e.g. 2026, Event)"
                  required
                />
              </FormField>
            </div>

            <FormField
              label="Add Images to Album (Max 50)"
              htmlFor="album-files"
              hint={files?.length ? `${files.length} file(s) selected — uploaded when you save.` : undefined}
            >
              <input
                ref={fileInputRef}
                id="album-files"
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setFiles(e.target.files)}
                className="field file:mr-4 file:border-0 file:bg-ink-100 file:px-3 file:py-1 file:text-xs file:font-medium file:text-ink-800"
              />
            </FormField>

            {editingId && form.images?.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-end justify-between gap-3">
                  <p className="field-label !mb-0">Existing Images in Album</p>
                  {selectedImages.length > 0 && (
                    <button type="button" onClick={handleBulkRemove} className="btn-danger btn-sm">
                      Remove Selected ({selectedImages.length})
                    </button>
                  )}
                </div>
                <div className="flex max-h-60 flex-wrap gap-2 overflow-y-auto border border-paper-border bg-paper-sunken p-3">
                  {form.images.map((imgUrl, i) => (
                    <AlbumImageTile
                      key={`${imgUrl}-${i}`}
                      url={imgUrl}
                      selected={selectedImages.includes(i)}
                      isCover={form.coverImage === imgUrl}
                      onToggle={() => toggleSelectImage(i)}
                      onSetCover={() => setForm((prev) => ({ ...prev, coverImage: imgUrl }))}
                    />
                  ))}
                </div>
                <FormField label="Cover Image URL" htmlFor="album-cover">
                  <input
                    id="album-cover"
                    value={form.coverImage}
                    onChange={setField('coverImage')}
                    className="field"
                    placeholder="Cover Image URL (optional, defaults to first image)"
                  />
                </FormField>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex gap-3">
                <button type="submit" disabled={busy} className="btn-primary">
                  {busy
                    ? typeof uploadProgress === 'number'
                      ? `Uploading... ${uploadProgress}%`
                      : uploadProgress
                    : editingId
                      ? 'Update Album'
                      : 'Create Album'}
                </button>
                {editingId && (
                  <button type="button" onClick={resetForm} disabled={busy} className="btn-secondary">
                    Cancel
                  </button>
                )}
              </div>

              {typeof uploadProgress === 'number' && (
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={uploadProgress}
                  className="h-1.5 w-full max-w-xs bg-paper-border"
                >
                  <div className="h-full bg-accent-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}
            </div>
          </form>
        </AdminCard>
      </AdminSection>

      <AdminSection title="Albums">
        {loadError && !data ? (
          <LoadError message="Failed to load gallery albums" onRetry={refetch} />
        ) : loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="surface">
                <Skeleton className="aspect-[4/3] w-full" />
                <div className="space-y-2 p-4">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyRow>No albums yet.</EmptyRow>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <AlbumCard
                key={item._id}
                item={item}
                onEdit={() => handleEditClick(item)}
                onDelete={() => handleDelete(item._id)}
              />
            ))}
          </div>
        )}
        <div className="pt-6">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} loading={loading} />
        </div>
      </AdminSection>
    </div>
  )
}
