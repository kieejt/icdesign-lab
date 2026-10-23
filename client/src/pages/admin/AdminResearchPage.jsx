import React, { useMemo, useState } from 'react'

import api from '../../lib/api'
import { invalidateQueries, useApiQuery } from '../../hooks/useApiQuery'
import {
  AdminCard,
  AdminPage,
  AdminTabs,
  AdminThumb,
  EmptyRow,
  FormField,
  InlineNotice,
  RowActions,
} from '../../components/admin'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'
import Toast from '../../components/Toast'
import { Badge, Skeleton, formatDate } from '../../components/ui'
import { bibtexToResearchFields } from '../../utils/bibtex'

const PAGE_SIZE = 10

const TABS = [
  { id: 'Project', label: 'Manage Projects' },
  { id: 'Publications', label: 'Manage Publications' },
]

const EMPTY_PROJECT_FORM = {
  title: '',
  description: '',
  link: '',
  image: '',
  date: '',
}

const EMPTY_PUB_FORM = {
  link: '',
  bibtex: '',
}

const BIBTEX_PLACEHOLDER = '@article{key,\n  title={...},\n  author={Last, First and Last2, First2},\n  journal={...},\n  year={2025}\n}'

function CitationLine({ title, authors, journal, date, link }) {
  return (
    <p className="text-[15px] leading-relaxed text-ink-800">
      {authors && <span>{authors}, </span>}
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className="link">
          &ldquo;{title},&rdquo;
        </a>
      ) : (
        <span>&ldquo;{title},&rdquo;</span>
      )}{' '}
      {journal && <span className="italic">{journal}, </span>}
      {date && new Date(date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.
    </p>
  )
}

/**
 * Reads the first sheet of an Excel file into preview rows.
 * `XLSX` is passed in because the library is loaded on demand, not at module top.
 *
 * @returns {{error: string} | {rows: object[]}}
 */
function parsePublicationSheet(XLSX, buffer) {
  const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' })
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

  if (jsonData.length === 0) return { error: 'The Excel file is empty.' }

  const headers = jsonData[0].map((h) => String(h).trim())
  const findColIndex = (patterns) =>
    headers.findIndex((h) => patterns.some((p) => h.toLowerCase().includes(p.toLowerCase())))

  const linkIdx = findColIndex(['link', 'url'])
  const bibtexIdx = findColIndex(['bibtex', 'bib'])

  if (bibtexIdx === -1) return { error: 'Could not find a "BibTeX" column in the Excel sheet.' }

  const rows = jsonData
    .slice(1)
    .map((row, index) => {
      if (row.length === 0 || row.every((val) => val === undefined || val === null || val === '')) {
        return null
      }

      const link = linkIdx !== -1 && row[linkIdx] ? String(row[linkIdx]).trim() : ''
      const bibtex = row[bibtexIdx] ? String(row[bibtexIdx]).trim() : ''
      const parsed = bibtex ? bibtexToResearchFields(bibtex, link) : null

      return {
        rowIndex: index + 2,
        link,
        bibtex,
        parsedTitle: parsed?.title || '',
        parsedAuthors: parsed?.authors || '',
        parsedJournal: parsed?.journal || '',
        parsedYear: parsed?.date ? new Date(parsed.date).getFullYear() : '',
        isValid: !!parsed,
        error: parsed ? '' : 'Could not extract a title from the BibTeX entry.',
      }
    })
    .filter(Boolean)

  return { rows }
}

function ListSkeleton() {
  return (
    <div className="divide-hairline" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-start gap-4 px-5 py-4">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-8 w-28" />
        </div>
      ))}
    </div>
  )
}

function ProjectRow({ item, onEdit, onDelete }) {
  return (
    <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <AdminThumb src={item.image} alt="" icon="document" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink-950">{item.title}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge tone="accent">{item.category}</Badge>
            {item.date && <span className="font-mono text-[11px] text-ink-400">{formatDate(item.date)}</span>}
          </div>
          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noreferrer"
              className="mt-1.5 block truncate text-sm text-ink-500 hover:text-accent-600"
            >
              {item.link}
            </a>
          )}
        </div>
      </div>
      <RowActions onEdit={onEdit} onDelete={onDelete} />
    </div>
  )
}

function PublicationRow({ item, expanded, onToggleBibtex, onEdit, onDelete }) {
  return (
    <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-start">
      <div className="min-w-0 flex-1">
        <CitationLine title={item.title} authors={item.authors} journal={item.journal} date={item.date} link={item.link} />
        {item.bibtex ? (
          <div className="mt-2">
            <button
              type="button"
              onClick={onToggleBibtex}
              aria-expanded={expanded}
              className="font-mono text-[11px] font-medium uppercase tracking-label text-ink-400 hover:text-accent-600"
            >
              {expanded ? 'Hide BibTeX' : 'View BibTeX'}
            </button>
            {expanded && (
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words border border-paper-border bg-paper-sunken p-3 font-mono text-xs text-ink-600">
                {item.bibtex}
              </pre>
            )}
          </div>
        ) : (
          <p className="mt-2 text-xs italic text-ink-400">Legacy entry — no BibTeX stored.</p>
        )}
      </div>
      <RowActions onEdit={onEdit} onDelete={onDelete} />
    </div>
  )
}

function BulkImport({ onImported, onToast }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const validCount = rows.filter((r) => r.isValid).length
  const errorCount = rows.length - validCount

  const downloadTemplate = async () => {
    const XLSX = await import('xlsx')
    const sample = [
      'https://ieeexplore.ieee.org/document/example',
      '@article{example2025, title={Sample Paper Title}, author={Nguyen, Van A and Tran, Thi B}, journal={IEEE Transactions on Example}, year={2025}}',
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Link', 'BibTeX'], sample]), 'Publications Template')
    XLSX.writeFile(wb, 'ICDesign_Publications_Template.xlsx')
  }

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      const [XLSX, buffer] = await Promise.all([import('xlsx'), file.arrayBuffer()])
      const result = parsePublicationSheet(XLSX, buffer)
      if (result.error) {
        setError(result.error)
        return
      }
      setRows(result.rows)
      setError('')
    } catch (err) {
      console.error(err)
      setError('Error reading Excel file. Please ensure it is a valid format.')
    }
  }

  const confirmImport = async () => {
    const valid = rows.filter((r) => r.isValid)
    if (valid.length === 0) {
      setError('No valid publications to import.')
      return
    }

    setLoading(true)
    setError('')
    try {
      await api.post('/research/bulk', valid.map(({ link, bibtex }) => ({ link, bibtex })))
      onToast(`Imported ${valid.length} publication(s) successfully.`, 'success')
      setRows([])
      onImported()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to bulk import publications.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminCard className="space-y-6">
      {error && <InlineNotice>{error}</InlineNotice>}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-3 border border-paper-border bg-paper-sunken p-5">
          <p className="eyebrow">Excel template</p>
          <p className="text-sm leading-relaxed text-ink-600">
            Just 2 columns: Link and BibTeX. Paste one full BibTeX entry per row.
          </p>
          <button type="button" onClick={downloadTemplate} className="btn-secondary btn-sm">
            Download Template
          </button>
        </div>

        <label className="flex cursor-pointer flex-col items-center justify-center border border-dashed border-ink-200 bg-paper-sunken/50 p-8 text-center transition-colors focus-within:border-ink-900 hover:border-ink-900 md:col-span-2">
          <span className="text-sm font-semibold text-ink-900">Upload Excel spreadsheet</span>
          <span className="mt-1 text-xs text-ink-500">Click to choose a .xlsx or .xls file</span>
          <input type="file" accept=".xlsx, .xls" className="sr-only" onChange={handleFile} />
        </label>
      </div>

      {rows.length > 0 && (
        <div className="space-y-4 border-t border-paper-border pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-ink-950">Preview ({rows.length} rows parsed)</h3>
            <div className="flex gap-2">
              <Badge tone="ok">{validCount} Valid</Badge>
              {errorCount > 0 && <Badge tone="danger">{errorCount} Errors</Badge>}
            </div>
          </div>

          <div className="max-h-96 overflow-auto border border-paper-border">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 bg-paper-sunken">
                <tr className="border-b border-paper-border">
                  {['Row', 'Title', 'Authors', 'Journal', 'Year', 'Status'].map((col) => (
                    <th key={col} scope="col" className="eyebrow px-4 py-3 font-medium">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-border bg-paper-raised">
                {rows.map((row) => (
                  <tr key={row.rowIndex} className={row.isValid ? '' : 'bg-signal-dangerSoft/30'}>
                    <td className="px-4 py-3 font-mono text-xs text-ink-400">#{row.rowIndex}</td>
                    <td className="max-w-xs truncate px-4 py-3 font-medium text-ink-900" title={row.parsedTitle}>
                      {row.parsedTitle || '-'}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-ink-600" title={row.parsedAuthors}>
                      {row.parsedAuthors || '-'}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 italic text-ink-600" title={row.parsedJournal}>
                      {row.parsedJournal || '-'}
                    </td>
                    <td className="px-4 py-3 text-ink-600">{row.parsedYear || '-'}</td>
                    <td className="px-4 py-3">
                      {row.isValid ? (
                        <Badge tone="ok">Ready</Badge>
                      ) : (
                        <Badge tone="danger" className="cursor-help">
                          <span title={row.error}>Error</span>
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setRows([])} className="btn-secondary btn-sm">
              Clear File
            </button>
            <button
              type="button"
              onClick={confirmImport}
              disabled={loading || validCount === 0}
              className="btn-primary btn-sm"
            >
              {loading ? 'Importing...' : `Import ${validCount} Valid Publications`}
            </button>
          </div>
        </div>
      )}
    </AdminCard>
  )
}

export default function AdminResearchPage() {
  const [activeTab, setActiveTab] = useState('Project')
  const [page, setPage] = useState(1)
  const [projectForm, setProjectForm] = useState(EMPTY_PROJECT_FORM)
  const [pubForm, setPubForm] = useState(EMPTY_PUB_FORM)
  const [editingId, setEditingId] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [toast, setToast] = useState(null)
  const [expandedBibtexIds, setExpandedBibtexIds] = useState(new Set())
  const [showBulk, setShowBulk] = useState(false)
  const { data, loading, error, refetch } = useApiQuery('/research', {
    params: { category: activeTab, page, limit: PAGE_SIZE },
    staleTime: 0,
  })
  const refresh = () => invalidateQueries('/research')

  const items = data?.data ?? []
  const totalPages = data?.totalPages ?? 1
  const isPublications = activeTab === 'Publications'
  const listError = error && !data
  const label = isPublications ? 'Publication' : 'Project'

  const showToast = (message, type = 'info') => setToast({ message, type })

  const pubPreview = useMemo(() => {
    if (!pubForm.bibtex.trim()) return { parsed: null, attempted: false }
    return { parsed: bibtexToResearchFields(pubForm.bibtex, pubForm.link), attempted: true }
  }, [pubForm.bibtex, pubForm.link])

  const closeModal = () => {
    setIsModalOpen(false)
    setProjectForm(EMPTY_PROJECT_FORM)
    setPubForm(EMPTY_PUB_FORM)
    setEditingId('')
    setFormError('')
  }

  const openAddModal = () => {
    setEditingId('')
    setProjectForm(EMPTY_PROJECT_FORM)
    setPubForm(EMPTY_PUB_FORM)
    setFormError('')
    setIsModalOpen(true)
  }

  const openEditModal = (item) => {
    setEditingId(item._id)
    if (isPublications) {
      setPubForm({ link: item.link || '', bibtex: item.bibtex || '' })
    } else {
      setProjectForm({
        title: item.title,
        description: item.description,
        link: item.link || '',
        image: item.image || '',
        date: item.date ? new Date(item.date).toISOString().split('T')[0] : '',
      })
    }
    setFormError('')
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    try {
      const payload = isPublications
        ? { link: pubForm.link, bibtex: pubForm.bibtex, category: 'Publications' }
        : { ...projectForm, category: activeTab }

      if (editingId) {
        await api.put(`/research/${editingId}`, payload)
        showToast(`${label} updated successfully.`, 'success')
      } else {
        await api.post('/research', payload)
        showToast(`${label} added successfully.`, 'success')
      }
      closeModal()
      refresh()
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save research')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this research item?')) return
    try {
      await api.delete(`/research/${id}`)
      showToast('Item deleted.', 'success')
      refresh()
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete research', 'error')
    }
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setPage(1)
    setShowBulk(false)
  }

  const toggleBibtexView = (id) => {
    setExpandedBibtexIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
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
      setProjectForm((prev) => ({ ...prev, image: uploaded.url }))
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to upload image')
    }
  }

  const setProject = (field) => (e) => setProjectForm((prev) => ({ ...prev, [field]: e.target.value }))
  const setPub = (field) => (e) => setPubForm((prev) => ({ ...prev, [field]: e.target.value }))

  return (
    <AdminPage
      title="Manage Research & Publications"
      description="Projects and publications shown on the public Research pages."
      actions={
        <>
          {isPublications && (
            <button type="button" onClick={() => setShowBulk((prev) => !prev)} className="btn-secondary">
              {showBulk ? 'Hide Bulk Import' : 'Excel Bulk Import'}
            </button>
          )}
          <button type="button" onClick={openAddModal} className="btn-primary">
            Add {label}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <AdminTabs label="Research sections" tabs={TABS} active={activeTab} onChange={handleTabChange} />

        {isPublications && showBulk && (
          <BulkImport
            onImported={() => {
              setShowBulk(false)
              refresh()
            }}
            onToast={showToast}
          />
        )}

        {listError ? (
          <InlineNotice>
            {error.response?.data?.message || 'Failed to load research'}{' '}
            <button type="button" onClick={refetch} className="font-semibold underline underline-offset-2">
              Retry
            </button>
          </InlineNotice>
        ) : loading ? (
          <AdminCard padded={false}>
            <ListSkeleton />
          </AdminCard>
        ) : items.length === 0 ? (
          <EmptyRow>
            No {activeTab.toLowerCase()} records found. Use &ldquo;Add {label}&rdquo; to create one.
          </EmptyRow>
        ) : (
          <AdminCard padded={false} className="divide-hairline">
            {items.map((item) =>
              isPublications ? (
                <PublicationRow
                  key={item._id}
                  item={item}
                  expanded={expandedBibtexIds.has(item._id)}
                  onToggleBibtex={() => toggleBibtexView(item._id)}
                  onEdit={() => openEditModal(item)}
                  onDelete={() => handleDelete(item._id)}
                />
              ) : (
                <ProjectRow
                  key={item._id}
                  item={item}
                  onEdit={() => openEditModal(item)}
                  onDelete={() => handleDelete(item._id)}
                />
              ),
            )}
          </AdminCard>
        )}

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} loading={loading} />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingId ? `Edit ${label}` : `Add New ${label}`}
        footer={
          <>
            <button type="button" onClick={closeModal} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              form="research-form"
              disabled={isPublications && pubPreview.attempted && !pubPreview.parsed}
              className="btn-primary"
            >
              {editingId ? `Update ${label}` : `Save ${label}`}
            </button>
          </>
        }
      >
        {formError && <InlineNotice className="mb-4">{formError}</InlineNotice>}

        {isPublications ? (
          <form id="research-form" onSubmit={handleSubmit} className="space-y-5">
            <FormField
              label="Link"
              htmlFor="pub-link"
              hint="Optional — falls back to the BibTeX url/doi."
            >
              <input
                id="pub-link"
                type="url"
                value={pubForm.link}
                onChange={setPub('link')}
                className="field"
                placeholder="Link to publication"
              />
            </FormField>

            <FormField
              label="BibTeX"
              htmlFor="pub-bibtex"
              required={!editingId}
              hint={
                <>
                  Paste the full BibTeX entry (not <code>@string</code> macro abbreviations). Only the first entry is
                  used if multiple are pasted.
                  {editingId && " Leave blank to keep this publication's current citation unchanged (only the link will update)."}
                </>
              }
            >
              <textarea
                id="pub-bibtex"
                value={pubForm.bibtex}
                onChange={setPub('bibtex')}
                className="field min-h-40 font-mono text-xs"
                placeholder={BIBTEX_PLACEHOLDER}
                required={!editingId}
              />
            </FormField>

            <div className="border border-paper-border bg-paper-sunken p-4">
              <p className="eyebrow mb-2">Parsed preview</p>
              {!pubPreview.attempted ? (
                <p className="text-sm italic text-ink-400">Paste a BibTeX entry to see the compiled citation here.</p>
              ) : pubPreview.parsed ? (
                <>
                  <CitationLine
                    title={pubPreview.parsed.title}
                    authors={pubPreview.parsed.authors}
                    journal={pubPreview.parsed.journal}
                    date={pubPreview.parsed.date}
                    link={pubPreview.parsed.link}
                  />
                  {pubPreview.parsed.extraContentIgnored && (
                    <p className="mt-2 text-xs font-medium text-signal-warn">
                      Only the first BibTeX entry was used — extra content after it was ignored.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm font-medium text-signal-danger">
                  Could not detect a &lsquo;title&rsquo; field yet — check the BibTeX syntax.
                </p>
              )}
            </div>
          </form>
        ) : (
          <form id="research-form" onSubmit={handleSubmit} className="space-y-5">
            <FormField label="Project Title" htmlFor="project-title" required>
              <input
                id="project-title"
                value={projectForm.title}
                onChange={setProject('title')}
                className="field"
                placeholder="Project Title"
                required
              />
            </FormField>

            <FormField label="Description" htmlFor="project-description" required>
              <textarea
                id="project-description"
                value={projectForm.description}
                onChange={setProject('description')}
                className="field min-h-24"
                placeholder="Description"
                required
              />
            </FormField>

            <FormField label="Project URL" htmlFor="project-link">
              <input
                id="project-link"
                type="url"
                value={projectForm.link}
                onChange={setProject('link')}
                className="field"
                placeholder="Link to Project URL"
              />
            </FormField>

            <div className="flex items-start gap-4 border border-paper-border bg-paper-sunken p-4">
              <div className="min-w-0 flex-1 space-y-3">
                <FormField label="Cover Image (Optional)" htmlFor="project-image-file">
                  <input
                    id="project-image-file"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="field file:mr-4 file:border-0 file:bg-ink-100 file:px-3 file:py-1 file:text-xs file:font-medium file:text-ink-800"
                  />
                </FormField>
                <FormField label="Or enter URL manually" htmlFor="project-image-url">
                  <input
                    id="project-image-url"
                    value={projectForm.image}
                    onChange={setProject('image')}
                    className="field"
                    placeholder="Image URL"
                  />
                </FormField>
              </div>
              {projectForm.image && <AdminThumb key={projectForm.image} src={projectForm.image} alt="Cover preview" size="h-20 w-20" />}
            </div>

            <FormField label="Project Date (Optional)" htmlFor="project-date" className="md:w-1/2">
              <input
                id="project-date"
                type="date"
                value={projectForm.date}
                onChange={setProject('date')}
                className="field"
              />
            </FormField>
          </form>
        )}
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </AdminPage>
  )
}
