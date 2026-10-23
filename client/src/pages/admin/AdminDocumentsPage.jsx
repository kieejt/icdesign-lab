import React, { useState } from 'react'

import api from '../../lib/api'
import { invalidateQueries, useApiQuery } from '../../hooks/useApiQuery'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'
import { Badge, ErrorState, Icon, Skeleton } from '../../components/ui'
import {
  AdminCard,
  AdminPage,
  AdminSection,
  AdminTabs,
  EmptyRow,
  FormField,
  InlineNotice,
  RowActions,
} from '../../components/admin'

const PAGE_SIZE = 10

const EMPTY_FORM = {
  title: '',
  subject: '',
  link: '',
  isLabOwned: false,
  downloadUrl: '',
  type: 'Free',
}

const TABS = [
  { id: 'manual', label: 'Manual Entry' },
  { id: 'bulk', label: 'Excel Bulk Import' },
]

const CHECKBOX = 'h-4 w-4 shrink-0 cursor-pointer accent-[theme(colors.accent.600)]'

const errorMessage = (err, fallback) => err.response?.data?.message || fallback

const isValidUrl = (value) => {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

/* -------------------------------------------------------------------------- */
/* Excel import                                                                */
/* -------------------------------------------------------------------------- */

const TEMPLATE_HEADERS = [
  'Title (Tiêu đề)',
  'Subject (Chủ đề)',
  'Reference Link (Link tham khảo)',
  'Access Type (Loại truy cập: Free/Paid)',
  'Is Lab Owned (Tài liệu của Lab: Yes/No)',
  'Download Link (Link tải Google Drive nếu có)',
]

const TEMPLATE_ROWS = [
  [
    'CMOS VLSI Design: A Circuits and Systems Perspective',
    'VLSI Design',
    'https://www.amazon.com/CMOS-VLSI-Design-Circuits-Perspective/dp/0321547748',
    'Free',
    'Yes',
    'https://drive.google.com/file/d/12345sampleGdriveLink/view',
  ],
  [
    'Digital Integrated Circuits: A Design Perspective',
    'Digital ICs',
    'https://www.amazon.com/Digital-Integrated-Circuits-Design-Perspective/dp/0130905509',
    'Paid',
    'No',
    '',
  ],
]

/** Turns spreadsheet rows (header row first) into validated preview rows. */
function parseDocumentRows(jsonData) {
  const headers = jsonData[0].map((h) => String(h).trim())
  const rows = jsonData.slice(1)

  const findColIndex = (patterns) =>
    headers.findIndex((h) => patterns.some((p) => h.toLowerCase().includes(p.toLowerCase())))

  const titleIdx = findColIndex(['title', 'tiêu đề', 'tên sách', 'tên tài liệu'])
  const subjectIdx = findColIndex(['subject', 'topic', 'chủ đề', 'môn học'])
  const linkIdx = findColIndex(['link', 'reference', 'tham khảo', 'nxb', 'publisher'])
  const typeIdx = findColIndex(['type', 'loại', 'truy cập'])
  const ownedIdx = findColIndex(['owned', 'của lab', 'thuộc lab'])
  const downloadIdx = findColIndex(['download', 'gdrive', 'link tải', 'đường dẫn tải'])

  if (titleIdx === -1 || subjectIdx === -1 || linkIdx === -1) {
    return {
      error:
        'Could not find required columns in Excel sheet. Please make sure "Title", "Subject", and "Link" columns are present.',
    }
  }

  const parsed = rows
    .map((row, index) => {
      if (row.length === 0 || row.every((val) => val === undefined || val === null || val === '')) {
        return null
      }

      const title = row[titleIdx] ? String(row[titleIdx]).trim() : ''
      const subject = row[subjectIdx] ? String(row[subjectIdx]).trim() : ''
      const link = row[linkIdx] ? String(row[linkIdx]).trim() : ''

      let type = 'Free'
      if (typeIdx !== -1 && row[typeIdx]) {
        const typeVal = String(row[typeIdx]).toLowerCase()
        if (typeVal.includes('paid') || typeVal.includes('mua') || typeVal.includes('tính phí')) {
          type = 'Paid'
        }
      }

      let isLabOwned = false
      if (ownedIdx !== -1 && row[ownedIdx]) {
        const ownedVal = String(row[ownedIdx]).toLowerCase()
        if (
          ownedVal.includes('yes') ||
          ownedVal.includes('có') ||
          ownedVal.includes('true') ||
          ownedVal === '1'
        ) {
          isLabOwned = true
        }
      }

      const downloadUrl = downloadIdx !== -1 && row[downloadIdx] ? String(row[downloadIdx]).trim() : ''

      let isValid = true
      let rowError = ''

      if (!title) {
        isValid = false
        rowError = 'Title is required. '
      }
      if (!subject) {
        isValid = false
        rowError += 'Subject is required. '
      }
      if (!link) {
        isValid = false
        rowError += 'Reference Link is required. '
      } else if (!isValidUrl(link)) {
        isValid = false
        rowError += 'Reference Link must be a valid URL. '
      }

      if (isLabOwned && !downloadUrl) {
        isValid = false
        rowError += 'Google Drive Download Link is required for Lab Owned materials. '
      } else if (isLabOwned && downloadUrl && !isValidUrl(downloadUrl)) {
        isValid = false
        rowError += 'Google Drive Download Link must be a valid URL. '
      }

      return {
        rowIndex: index + 2,
        title,
        subject,
        link,
        type,
        isLabOwned,
        downloadUrl,
        isValid,
        error: rowError,
      }
    })
    .filter(Boolean)

  return { rows: parsed }
}

/** xlsx is ~400 kB, so it is only fetched when someone actually uses Excel. */
async function downloadSampleTemplate() {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...TEMPLATE_ROWS])
  XLSX.utils.book_append_sheet(wb, ws, 'Documents Template')
  XLSX.writeFile(wb, 'ICDesign_Documents_Template.xlsx')
}

async function readWorkbookRows(file) {
  const XLSX = await import('xlsx')
  const data = new Uint8Array(await file.arrayBuffer())
  const workbook = XLSX.read(data, { type: 'array' })
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]
  return XLSX.utils.sheet_to_json(worksheet, { header: 1 })
}

/* -------------------------------------------------------------------------- */
/* Presentational pieces                                                       */
/* -------------------------------------------------------------------------- */

/** Shared by the add card and the edit modal; the caller owns the submit button. */
function DocumentForm({ id, form, onChange, onSubmit }) {
  const set = (key) => (e) => onChange({ ...form, [key]: e.target.value })

  return (
    <form id={id} onSubmit={onSubmit} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <FormField label="Book Title" required htmlFor={`${id}-title`} className="sm:col-span-2">
        <input
          id={`${id}-title`}
          type="text"
          value={form.title}
          onChange={set('title')}
          className="field"
          placeholder="e.g. CMOS VLSI Design: A Circuits and Systems Perspective"
          required
        />
      </FormField>

      <FormField label="Subject/Topic" required htmlFor={`${id}-subject`}>
        <input
          id={`${id}-subject`}
          type="text"
          value={form.subject}
          onChange={set('subject')}
          className="field"
          placeholder="e.g. VLSI Design"
          required
        />
      </FormField>

      <FormField label="Access Type" required htmlFor={`${id}-type`}>
        <select id={`${id}-type`} value={form.type} onChange={set('type')} className="field" required>
          <option value="Free">Free Access</option>
          <option value="Paid">Purchase Required (Paid)</option>
        </select>
      </FormField>

      <FormField label="Reference URL / Publisher Link" required htmlFor={`${id}-link`} className="sm:col-span-2">
        <input
          id={`${id}-link`}
          type="url"
          value={form.link}
          onChange={set('link')}
          className="field"
          placeholder="e.g. https://www.amazon.com/... or publisher page"
          required
        />
      </FormField>

      <label htmlFor={`${id}-owned`} className="flex cursor-pointer items-center gap-3 sm:col-span-2">
        <input
          id={`${id}-owned`}
          type="checkbox"
          checked={form.isLabOwned}
          onChange={(e) => onChange({ ...form, isLabOwned: e.target.checked })}
          className={CHECKBOX}
        />
        <span className="select-none text-sm text-ink-800">
          This book is owned by the Lab (Include Google Drive download link)
        </span>
      </label>

      {form.isLabOwned && (
        <FormField
          label="Google Drive Download Link"
          required
          htmlFor={`${id}-download`}
          hint='Ensure the sharing settings on Google Drive are set to "Anyone with the link can view".'
          className="sm:col-span-2"
        >
          <input
            id={`${id}-download`}
            type="url"
            value={form.downloadUrl}
            onChange={set('downloadUrl')}
            className="field"
            placeholder="e.g. https://drive.google.com/file/d/..."
            required
          />
        </FormField>
      )}
    </form>
  )
}

function ImportPanel({ rows, importing, onFile, onClear, onConfirm }) {
  const validCount = rows.filter((r) => r.isValid).length
  const errorCount = rows.length - validCount

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="surface space-y-4 bg-paper-sunken p-5 md:col-span-1">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-950">
            <Icon name="document" className="h-5 w-5 text-accent-600" />
            Excel Template
          </h3>
          <p className="text-xs leading-relaxed text-ink-500">
            Use our standardized template to format your book references list. Supports both English and
            Vietnamese column headers.
          </p>
          <button type="button" onClick={downloadSampleTemplate} className="btn-secondary w-full">
            <Icon name="download" />
            Download Template
          </button>
        </div>

        <label className="flex cursor-pointer flex-col items-center justify-center gap-3 border border-dashed border-paper-border bg-paper-sunken/50 p-8 text-center transition-colors focus-within:border-ink-900 hover:border-ink-900 md:col-span-2">
          <Icon name="document" className="h-8 w-8 text-ink-300" strokeWidth={1} />
          <span className="text-sm font-semibold text-ink-800">Upload Excel spreadsheet</span>
          <span className="text-xs text-ink-500">Click to choose .xlsx or .xls files</span>
          <input type="file" accept=".xlsx, .xls" className="sr-only" onChange={onFile} />
        </label>
      </div>

      {rows.length > 0 && (
        <div className="space-y-4 border-t border-paper-border pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-ink-950">
              Preview Data ({rows.length} records parsed)
            </h3>
            <div className="flex gap-2">
              <Badge tone="ok">{validCount} Valid</Badge>
              {errorCount > 0 && <Badge tone="danger">{errorCount} Errors</Badge>}
            </div>
          </div>

          <div className="surface max-h-96 overflow-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="sticky top-0 border-b border-paper-border bg-paper-sunken">
                <tr className="eyebrow">
                  {['Row', 'Title', 'Subject', 'Reference URL', 'Type', 'Lab Owned', 'GDrive Link', 'Status'].map(
                    (col) => (
                      <th key={col} className="px-4 py-3 font-medium">
                        {col}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-hairline">
                {rows.map((row) => (
                  <tr key={row.rowIndex} className={row.isValid ? undefined : 'bg-signal-dangerSoft/40'}>
                    <td className="px-4 py-3 font-mono text-ink-500">#{row.rowIndex}</td>
                    <td className="max-w-xs truncate px-4 py-3 font-medium text-ink-900" title={row.title}>
                      {row.title}
                    </td>
                    <td className="px-4 py-3 text-ink-600">{row.subject}</td>
                    <td className="max-w-xs truncate px-4 py-3" title={row.link}>
                      <a href={row.link} target="_blank" rel="noopener noreferrer" className="link">
                        {row.link}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-ink-600">{row.type}</td>
                    <td className="px-4 py-3 text-ink-600">{row.isLabOwned ? 'Yes' : 'No'}</td>
                    <td className="max-w-xs truncate px-4 py-3" title={row.downloadUrl}>
                      {row.isLabOwned ? (
                        <a href={row.downloadUrl} target="_blank" rel="noopener noreferrer" className="link">
                          {row.downloadUrl}
                        </a>
                      ) : (
                        <span className="text-ink-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.isValid ? (
                        <Badge tone="ok">Ready</Badge>
                      ) : (
                        <span title={row.error} className="cursor-help">
                          <Badge tone="danger">Error</Badge>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" onClick={onClear} className="btn-secondary">
              Clear File
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={importing || validCount === 0}
              className="btn-primary"
            >
              {importing ? 'Importing...' : `Import ${validCount} Valid References`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function DocumentRow({ doc, selected, disabled, onToggle, onEdit, onDelete }) {
  const checkId = `doc-select-${doc._id}`

  return (
    <li className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:gap-4 ${selected ? 'bg-accent-50/40' : ''}`}>
      <input
        id={checkId}
        type="checkbox"
        checked={selected}
        onChange={() => onToggle(doc._id)}
        aria-label={`Select ${doc.title}`}
        className={`${CHECKBOX} sm:mt-1`}
      />

      <div className="min-w-0 flex-1 space-y-2">
        <label htmlFor={checkId} className="line-clamp-2 cursor-pointer text-base font-medium leading-snug text-ink-950">
          {doc.title}
        </label>

        <div className="flex flex-wrap gap-2">
          <Badge>{doc.subject}</Badge>
          {doc.type === 'Free' ? <Badge tone="ok">Free Access</Badge> : <Badge tone="warn">Paid Reference</Badge>}
          {doc.isLabOwned && <Badge tone="accent">Lab Owned (GDrive)</Badge>}
        </div>

        <div className="space-y-1 text-xs text-ink-500">
          <p className="truncate">
            <span className="eyebrow mr-2">Ref</span>
            <a href={doc.link} target="_blank" rel="noopener noreferrer" className="link">
              {doc.link}
            </a>
          </p>
          {doc.isLabOwned && doc.downloadUrl && (
            <p className="truncate">
              <span className="eyebrow mr-2">GDrive</span>
              <a href={doc.downloadUrl} target="_blank" rel="noopener noreferrer" className="link">
                {doc.downloadUrl}
              </a>
            </p>
          )}
        </div>
      </div>

      <RowActions onEdit={() => onEdit(doc)} onDelete={() => onDelete(doc._id)} disabled={disabled} />
    </li>
  )
}

function CatalogSkeleton() {
  return (
    <ul className="divide-hairline" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <li key={i} className="flex items-start gap-4 px-5 py-4">
          <Skeleton className="mt-1 h-4 w-4" />
          <div className="flex-1 space-y-2.5">
            <Skeleton className="h-5 w-3/5" />
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-4/5" />
          </div>
          <Skeleton className="h-8 w-28" />
        </li>
      ))}
    </ul>
  )
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default function AdminDocumentsPage() {
  const [page, setPage] = useState(1)
  const { data, loading, error: loadError, refetch } = useApiQuery('/documents', {
    params: { page, limit: PAGE_SIZE },
    staleTime: 0,
  })
  const documents = data?.data ?? []
  const totalPages = data?.totalPages || 1
  const total = data?.total || 0

  const [tab, setTab] = useState('manual')
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [editError, setEditError] = useState('')

  const [selectedIds, setSelectedIds] = useState([])
  const [busy, setBusy] = useState(false)

  const [bulkData, setBulkData] = useState([])
  const [bulkError, setBulkError] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)

  // A different page is a different cache key, so changing it is enough to
  // refetch; only the page we are already on needs an explicit refetch.
  const refresh = (nextPage = page) => {
    invalidateQueries('/documents')
    if (nextPage === page) refetch()
    else setPage(nextPage)
  }

  const switchTab = (id) => {
    setTab(id)
    setFormError('')
    setBulkError('')
  }

  const toPayload = (values) => ({
    ...values,
    downloadUrl: values.isLabOwned ? values.downloadUrl : '',
  })

  const validate = (values) =>
    values.isLabOwned && !values.downloadUrl.trim()
      ? 'Google Drive download URL is required for lab-owned books.'
      : ''

  const handleAdd = async (e) => {
    e.preventDefault()
    setFormError('')

    const problem = validate(form)
    if (problem) {
      setFormError(problem)
      return
    }

    setSaving(true)
    try {
      await api.post('/documents', toPayload(form))
      setForm(EMPTY_FORM)
      refresh(1)
    } catch (err) {
      setFormError(errorMessage(err, 'Failed to save document'))
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (doc) => {
    setEditing(doc)
    setEditError('')
    setEditForm({
      title: doc.title,
      subject: doc.subject,
      link: doc.link,
      isLabOwned: !!doc.isLabOwned,
      downloadUrl: doc.downloadUrl || '',
      type: doc.type || 'Free',
    })
  }

  const closeEdit = () => setEditing(null)

  const handleEditSave = async (e) => {
    e.preventDefault()
    setEditError('')

    const problem = validate(editForm)
    if (problem) {
      setEditError(problem)
      return
    }

    setSaving(true)
    try {
      await api.put(`/documents/${editing._id}`, toPayload(editForm))
      closeEdit()
      refresh()
    } catch (err) {
      setEditError(errorMessage(err, 'Failed to save document'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this book reference?')) return
    try {
      await api.delete(`/documents/${id}`)
      setSelectedIds((prev) => prev.filter((item) => item !== id))
      refresh(documents.length === 1 && page > 1 ? page - 1 : page)
    } catch (err) {
      setError(errorMessage(err, 'Failed to delete document'))
    }
  }

  const toggleSelected = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const allSelected = documents.length > 0 && documents.every((doc) => selectedIds.includes(doc._id))

  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : documents.map((doc) => doc._id))
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (
      !window.confirm(
        `Are you sure you want to delete the ${selectedIds.length} selected books? This action cannot be undone.`,
      )
    ) {
      return
    }

    setBusy(true)
    setError('')
    try {
      await api.post('/documents/bulk-delete', { ids: selectedIds })
      const remaining = documents.filter((doc) => !selectedIds.includes(doc._id)).length
      setSelectedIds([])
      refresh(remaining === 0 && page > 1 ? page - 1 : page)
    } catch (err) {
      setError(errorMessage(err, 'Failed to delete selected documents'))
    } finally {
      setBusy(false)
    }
  }

  const handleExcelUpload = async (e) => {
    const input = e.target
    const file = input.files[0]
    if (!file) return

    try {
      const jsonData = await readWorkbookRows(file)

      if (jsonData.length === 0) {
        setBulkError('The Excel file is empty.')
        return
      }

      const result = parseDocumentRows(jsonData)
      if (result.error) {
        setBulkError(result.error)
        return
      }

      setBulkData(result.rows)
      setBulkError('')
    } catch (err) {
      console.error(err)
      setBulkError('Error reading Excel file. Please ensure it is a valid format.')
    } finally {
      // Lets the same file be picked again after "Clear File".
      input.value = ''
    }
  }

  const handleConfirmBulkImport = async () => {
    const validItems = bulkData.filter((item) => item.isValid)
    if (validItems.length === 0) {
      setBulkError('No valid documents to import.')
      return
    }

    setBulkLoading(true)
    setBulkError('')
    try {
      await api.post(
        '/documents/bulk',
        validItems.map(({ title, subject, link, isLabOwned, downloadUrl, type }) => ({
          title,
          subject,
          link,
          isLabOwned,
          downloadUrl,
          type,
        })),
      )

      setBulkData([])
      setTab('manual')
      refresh(1)
    } catch (err) {
      setBulkError(errorMessage(err, 'Failed to bulk import documents.'))
    } finally {
      setBulkLoading(false)
    }
  }

  return (
    <AdminPage
      title="Manage Books & Documents"
      description="Add, list, and delete textbook references and digital learning guides for the IC design Lab."
    >
      {error && <InlineNotice>{error}</InlineNotice>}

      <AdminSection
        title="Add Book & Reference"
        description="Add book references manually or upload in bulk from an Excel file."
      >
        <AdminCard padded={false}>
          <AdminTabs tabs={TABS} active={tab} onChange={switchTab} label="Entry method" className="px-5 sm:px-6" />
          <div className="space-y-5 p-5 sm:p-6">
            {tab === 'manual' ? (
              <>
                {formError && <InlineNotice>{formError}</InlineNotice>}
                <DocumentForm id="doc-add" form={form} onChange={setForm} onSubmit={handleAdd} />
                <div className="flex justify-end">
                  <button type="submit" form="doc-add" disabled={saving} className="btn-primary">
                    {saving ? 'Creating...' : 'Add Book Reference'}
                  </button>
                </div>
              </>
            ) : (
              <>
                {bulkError && <InlineNotice>{bulkError}</InlineNotice>}
                <ImportPanel
                  rows={bulkData}
                  importing={bulkLoading}
                  onFile={handleExcelUpload}
                  onClear={() => {
                    setBulkData([])
                    setBulkError('')
                  }}
                  onConfirm={handleConfirmBulkImport}
                />
              </>
            )}
          </div>
        </AdminCard>
      </AdminSection>

      <AdminSection
        title="Current Catalog"
        count={total}
        action={
          documents.length > 0 && (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-600">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} className={CHECKBOX} />
              {allSelected ? 'Deselect All' : 'Select All'}
            </label>
          )
        }
      >
        {loadError && documents.length === 0 ? (
          <ErrorState message={errorMessage(loadError, 'Failed to load documents')} onRetry={refetch} />
        ) : loading ? (
          <AdminCard padded={false}>
            <CatalogSkeleton />
          </AdminCard>
        ) : documents.length === 0 ? (
          <EmptyRow>No books found in the database catalog. Add a new book reference to get started.</EmptyRow>
        ) : (
          <AdminCard padded={false}>
            <ul className="divide-hairline">
              {documents.map((doc) => (
                <DocumentRow
                  key={doc._id}
                  doc={doc}
                  selected={selectedIds.includes(doc._id)}
                  disabled={busy}
                  onToggle={toggleSelected}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              ))}
            </ul>
          </AdminCard>
        )}

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} className="mt-6" />
      </AdminSection>

      {selectedIds.length > 0 && (
        // Fixed, not sticky: the layout's <main> clips overflow, which stops sticky from pinning to the viewport.
        <div className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 items-center justify-between gap-4 border border-ink-900 bg-ink-950 px-5 py-3 text-paper">
          <p className="text-sm font-medium">
            <span className="mr-2 font-mono">{selectedIds.length}</span>
            {selectedIds.length === 1 ? 'Book selected' : 'Books selected'}
          </p>
          <div className="flex shrink-0 items-center gap-3">
            <button type="button" onClick={() => setSelectedIds([])} className="btn-secondary btn-sm">
              Clear
            </button>
            <button type="button" onClick={handleBulkDelete} disabled={busy} className="btn-danger btn-sm">
              Delete Selected
            </button>
          </div>
        </div>
      )}

      <Modal
        isOpen={editing !== null}
        onClose={closeEdit}
        title="Edit Book & Reference"
        footer={
          <>
            <button type="button" onClick={closeEdit} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" form="doc-edit" disabled={saving} className="btn-primary">
              {saving ? 'Updating...' : 'Update Book Reference'}
            </button>
          </>
        }
      >
        {editError && <InlineNotice>{editError}</InlineNotice>}
        <DocumentForm id="doc-edit" form={editForm} onChange={setEditForm} onSubmit={handleEditSave} />
      </Modal>
    </AdminPage>
  )
}
