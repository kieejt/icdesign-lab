import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import api from '../../lib/api';
import ErrorText from '../../components/ErrorText';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import Toast from '../../components/Toast';
import { bibtexToResearchFields } from '../../utils/bibtex';

const EMPTY_PROJECT_FORM = {
  title: '',
  description: '',
  link: '',
  image: '',
  date: ''
}

const EMPTY_PUB_FORM = {
  link: '',
  bibtex: '',
}

function CitationLine({ title, authors, journal, date, link }) {
  return (
    <p className="text-[15px] leading-relaxed text-slate-800">
      {authors && <span>{authors}, </span>}
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-900 underline decoration-slate-300 underline-offset-2 hover:text-blue-700 hover:decoration-blue-400"
        >
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

export default function AdminResearchPage() {
  const [researchItems, setResearchItems] = useState([])
  const [activeTab, setActiveTab] = useState('Project')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [projectForm, setProjectForm] = useState(EMPTY_PROJECT_FORM)
  const [pubForm, setPubForm] = useState(EMPTY_PUB_FORM)
  const [editingId, setEditingId] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [expandedBibtexIds, setExpandedBibtexIds] = useState(new Set())

  // Excel bulk import (Publications only)
  const [showBulkSection, setShowBulkSection] = useState(false)
  const [bulkData, setBulkData] = useState([])
  const [bulkLoading, setBulkLoading] = useState(false)

  const showToast = (message, type = 'info') => setToast({ message, type })

  const loadResearch = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/research', { params: { category: activeTab, page, limit: 10 } })
      setResearchItems(data.data)
      setTotalPages(data.totalPages)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load research')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadResearch()
  }, [activeTab, page])

  const pubPreview = useMemo(() => {
    if (activeTab !== 'Publications') return null
    if (!pubForm.bibtex.trim()) return { parsed: null, attempted: false }
    return { parsed: bibtexToResearchFields(pubForm.bibtex, pubForm.link), attempted: true }
  }, [activeTab, pubForm.bibtex, pubForm.link])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (activeTab === 'Publications') {
        const payload = { link: pubForm.link, bibtex: pubForm.bibtex, category: 'Publications' }
        if (editingId) {
          await api.put(`/research/${editingId}`, payload)
          showToast('Publication updated successfully.', 'success')
        } else {
          await api.post('/research', payload)
          showToast('Publication added successfully.', 'success')
        }
      } else {
        const payload = { ...projectForm, category: activeTab }
        if (editingId) {
          await api.put(`/research/${editingId}`, payload)
          showToast('Project updated successfully.', 'success')
        } else {
          await api.post('/research', payload)
          showToast('Project added successfully.', 'success')
        }
      }
      closeModal()
      loadResearch()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save research')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this research item?')) return
    try {
      await api.delete(`/research/${id}`)
      showToast('Item deleted.', 'success')
      loadResearch()
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete research', 'error')
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setProjectForm(EMPTY_PROJECT_FORM)
    setPubForm(EMPTY_PUB_FORM)
    setEditingId('')
    setError('')
  }

  const openAddModal = () => {
    setEditingId('')
    setProjectForm(EMPTY_PROJECT_FORM)
    setPubForm(EMPTY_PUB_FORM)
    setError('')
    setIsModalOpen(true)
  }

  const openEditModal = (item) => {
    setEditingId(item._id)
    if (activeTab === 'Publications') {
      setPubForm({ link: item.link || '', bibtex: item.bibtex || '' })
    } else {
      setProjectForm({
        title: item.title,
        description: item.description,
        link: item.link || '',
        image: item.image || '',
        date: item.date ? new Date(item.date).toISOString().split('T')[0] : ''
      })
    }
    setError('')
    setIsModalOpen(true)
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setPage(1)
    setShowBulkSection(false)
    setBulkData([])
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
      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setProjectForm((prev) => ({ ...prev, image: data.url }))
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload image')
    }
  }

  const resolveImageSrc = (image) => (image?.startsWith('/') ? `http://localhost:5000${image}` : image)

  // ---- Excel bulk import (Publications: Link + BibTeX columns only) ----

  const downloadSampleTemplate = () => {
    const headers = ['Link', 'BibTeX']
    const sampleRows = [
      [
        'https://ieeexplore.ieee.org/document/example',
        '@article{example2025, title={Sample Paper Title}, author={Nguyen, Van A and Tran, Thi B}, journal={IEEE Transactions on Example}, year={2025}}'
      ],
    ]
    const wsData = [headers, ...sampleRows]
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    XLSX.utils.book_append_sheet(wb, ws, 'Publications Template')
    XLSX.writeFile(wb, 'ICDesign_Publications_Template.xlsx')
  }

  const handleExcelUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

        if (jsonData.length === 0) {
          setError('The Excel file is empty.')
          return
        }

        const headers = jsonData[0].map((h) => String(h).trim())
        const rows = jsonData.slice(1)

        const findColIndex = (patterns) =>
          headers.findIndex((h) => patterns.some((p) => h.toLowerCase().includes(p.toLowerCase())))

        const linkIdx = findColIndex(['link', 'url'])
        const bibtexIdx = findColIndex(['bibtex', 'bib'])

        if (bibtexIdx === -1) {
          setError('Could not find a "BibTeX" column in the Excel sheet.')
          return
        }

        const parsedRows = rows.map((row, index) => {
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
            error: parsed ? '' : "Could not extract a title from the BibTeX entry.",
          }
        }).filter(Boolean)

        setBulkData(parsedRows)
        setError('')
      } catch (err) {
        console.error(err)
        setError('Error reading Excel file. Please ensure it is a valid format.')
      }
    }

    reader.readAsArrayBuffer(file)
  }

  const handleConfirmBulkImport = async () => {
    const validItems = bulkData.filter((item) => item.isValid)
    if (validItems.length === 0) {
      setError('No valid publications to import.')
      return
    }

    setBulkLoading(true)
    setError('')
    try {
      await api.post('/research/bulk', validItems.map(({ link, bibtex }) => ({ link, bibtex })))
      showToast(`Imported ${validItems.length} publication(s) successfully.`, 'success')
      setBulkData([])
      setShowBulkSection(false)
      loadResearch()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to bulk import publications.')
    } finally {
      setBulkLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Manage Research & Publications</h2>
        <div className="flex items-center gap-2">
          {activeTab === 'Publications' && (
            <button
              type="button"
              onClick={() => { setShowBulkSection((prev) => !prev); setError('') }}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {showBulkSection ? 'Hide Bulk Import' : 'Excel Bulk Import'}
            </button>
          )}
          <button
            type="button"
            onClick={openAddModal}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            + Add New {activeTab}
          </button>
        </div>
      </div>

      <ErrorText message={error && !isModalOpen ? error : ''} />

      {/* Top Level Tabs */}
      <div className="flex gap-6 border-b border-slate-200">
        <button
          type="button"
          className={`pb-3 px-2 ${activeTab === 'Project' ? 'border-b-2 border-blue-600 font-semibold text-slate-900' : 'text-slate-500 font-medium hover:text-slate-700'}`}
          onClick={() => handleTabChange('Project')}
        >
          Manage Projects
        </button>
        <button
          type="button"
          className={`pb-3 px-2 ${activeTab === 'Publications' ? 'border-b-2 border-blue-600 font-semibold text-slate-900' : 'text-slate-500 font-medium hover:text-slate-700'}`}
          onClick={() => handleTabChange('Publications')}
        >
          Manage Publications
        </button>
      </div>

      {/* Excel Bulk Import (Publications only) */}
      {activeTab === 'Publications' && showBulkSection && (
        <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 border border-indigo-50 bg-indigo-50/20 rounded-2xl p-5 space-y-4">
              <h4 className="text-sm font-bold text-indigo-700">Excel Template</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Just 2 columns: Link and BibTeX. Paste one full BibTeX entry per row.
              </p>
              <button
                onClick={downloadSampleTemplate}
                className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors"
              >
                Download Template
              </button>
            </div>

            <div className="md:col-span-2">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-8 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-all text-center h-full">
                <p className="text-sm font-bold text-slate-800">Upload Excel spreadsheet</p>
                <p className="text-xs text-slate-500 mt-1">Drag and drop or click to choose .xlsx or .xls files</p>
                <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelUpload} />
              </label>
            </div>
          </div>

          {bulkData.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-sm text-slate-900">Preview ({bulkData.length} rows parsed)</h4>
                <div className="flex gap-2">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                    {bulkData.filter((d) => d.isValid).length} Valid
                  </span>
                  {bulkData.some((d) => !d.isValid) && (
                    <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                      {bulkData.filter((d) => !d.isValid).length} Errors
                    </span>
                  )}
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-slate-100 text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase sticky top-0">
                    <tr>
                      <th className="px-4 py-3">Row</th>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Authors</th>
                      <th className="px-4 py-3">Journal</th>
                      <th className="px-4 py-3">Year</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {bulkData.map((row) => (
                      <tr key={row.rowIndex} className={!row.isValid ? 'bg-red-50/20' : ''}>
                        <td className="px-4 py-3 font-bold text-slate-500">#{row.rowIndex}</td>
                        <td className="px-4 py-3 max-w-xs truncate font-semibold text-slate-800" title={row.parsedTitle}>{row.parsedTitle || '-'}</td>
                        <td className="px-4 py-3 max-w-xs truncate text-slate-600" title={row.parsedAuthors}>{row.parsedAuthors || '-'}</td>
                        <td className="px-4 py-3 max-w-xs truncate text-slate-600 italic" title={row.parsedJournal}>{row.parsedJournal || '-'}</td>
                        <td className="px-4 py-3 text-slate-600">{row.parsedYear || '-'}</td>
                        <td className="px-4 py-3">
                          {row.isValid ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Ready</span>
                          ) : (
                            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 cursor-help" title={row.error}>Error</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setBulkData([])}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Clear File
                </button>
                <button
                  onClick={handleConfirmBulkImport}
                  disabled={bulkLoading || bulkData.filter((d) => d.isValid).length === 0}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {bulkLoading ? 'Importing...' : `Import ${bulkData.filter((d) => d.isValid).length} Valid Publications`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filtered List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex h-24 items-center justify-center rounded-xl border border-slate-200 bg-white">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-slate-900" />
          </div>
        ) : researchItems.length === 0 ? (
          <p className="text-slate-500 py-8 text-center bg-slate-50 rounded-lg border border-slate-200 border-dashed">
            No {activeTab.toLowerCase()} records found. Use "Add New {activeTab}" to create one.
          </p>
        ) : activeTab === 'Publications' ? (
          researchItems.map((item) => (
            <div key={item._id} className="rounded border border-slate-200 bg-white p-5 hover:shadow-sm transition-shadow">
              <CitationLine title={item.title} authors={item.authors} journal={item.journal} date={item.date} link={item.link} />

              {item.bibtex ? (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => toggleBibtexView(item._id)}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    {expandedBibtexIds.has(item._id) ? 'Hide BibTeX' : 'View BibTeX'}
                  </button>
                  {expandedBibtexIds.has(item._id) && (
                    <pre className="mt-2 whitespace-pre-wrap break-words rounded bg-slate-50 border border-slate-100 p-3 text-xs font-mono text-slate-600">
                      {item.bibtex}
                    </pre>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-xs italic text-slate-400">Legacy entry — no BibTeX stored.</p>
              )}

              <div className="mt-5 flex gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => openEditModal(item)}
                  className="rounded bg-amber-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition-colors shadow-sm"
                >
                  Edit
                </button>
                <button type="button" onClick={() => handleDelete(item._id)} className="rounded bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition-colors shadow-sm">
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          researchItems.map((item) => (
            <div key={item._id} className="rounded border border-slate-200 bg-white p-5 hover:shadow-sm transition-shadow">
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 text-lg">{item.title}</p>
                  <div className="flex gap-2 items-center mt-2 flex-wrap">
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{item.category}</span>
                    {item.date && <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{new Date(item.date).toLocaleDateString()}</span>}
                  </div>
                  {item.link && (
                     <p className="text-sm text-slate-600 mt-3 truncate"><span className="font-medium">Link:</span> <a href={item.link} className="text-blue-500 hover:underline" target="_blank" rel="noreferrer">{item.link}</a></p>
                  )}
                </div>
                {item.image && (
                  <div className="w-16 h-16 rounded overflow-hidden border bg-white shrink-0">
                    <img src={resolveImageSrc(item.image)} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none' }} />
                  </div>
                )}
              </div>

              <div className="mt-5 flex gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => openEditModal(item)}
                  className="rounded bg-amber-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition-colors shadow-sm"
                >
                  Edit
                </button>
                <button type="button" onClick={() => handleDelete(item._id)} className="rounded bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition-colors shadow-sm">
                  Delete
                </button>
              </div>
            </div>
          ))
        )}

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} loading={loading} />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingId ? `Edit ${activeTab}` : `Add New ${activeTab}`}
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
              form="research-form"
              disabled={activeTab === 'Publications' && pubPreview?.attempted && !pubPreview.parsed}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingId ? `Update ${activeTab}` : `Save ${activeTab}`}
            </button>
          </>
        }
      >
        <ErrorText message={error} />
        {activeTab === 'Publications' ? (
          <form id="research-form" onSubmit={handleSubmit} className="space-y-4">
            <input
              type="url"
              value={pubForm.link}
              onChange={(e) => setPubForm({ ...pubForm, link: e.target.value })}
              className="w-full rounded border px-3 py-2"
              placeholder="Link to publication (optional — falls back to BibTeX url/doi)"
            />
            <textarea
              value={pubForm.bibtex}
              onChange={(e) => setPubForm({ ...pubForm, bibtex: e.target.value })}
              className="min-h-40 w-full rounded border px-3 py-2 font-mono text-xs"
              placeholder={'@article{key,\n  title={...},\n  author={Last, First and Last2, First2},\n  journal={...},\n  year={2025}\n}'}
              required={!editingId}
            />
            <p className="text-xs text-slate-500">
              Paste the full BibTeX entry (not <code>@string</code> macro abbreviations). Only the first entry is used if multiple are pasted.
              {editingId && ' Leave blank to keep this publication\'s current citation unchanged (only the link will update).'}
            </p>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Parsed Preview</p>
              {!pubPreview?.attempted ? (
                <p className="text-sm text-slate-400 italic">Paste a BibTeX entry to see the compiled citation here.</p>
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
                    <p className="mt-2 text-xs font-medium text-amber-600">
                      Only the first BibTeX entry was used — extra content after it was ignored.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm font-medium text-rose-600">
                  Could not detect a 'title' field yet — check the BibTeX syntax.
                </p>
              )}
            </div>
          </form>
        ) : (
          <form id="research-form" onSubmit={handleSubmit} className="space-y-4">
            <input value={projectForm.title} onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })} className="w-full rounded border px-3 py-2" placeholder="Project Title" required />
            <textarea value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} className="min-h-24 w-full rounded border px-3 py-2" placeholder="Description" required />

            <input type="url" value={projectForm.link} onChange={(e) => setProjectForm({ ...projectForm, link: e.target.value })} className="w-full rounded border px-3 py-2" placeholder="Link to Project URL" />

            <div className="flex items-center gap-4 border rounded p-3 bg-slate-50">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Cover Image (Optional)</label>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                <div className="mt-2 text-xs text-slate-500">Or enter URL manually:</div>
                <input value={projectForm.image} onChange={(e) => setProjectForm({ ...projectForm, image: e.target.value })} className="w-full rounded border px-3 py-1.5 text-sm mt-1" placeholder="Image URL" />
              </div>
              {projectForm.image && (
                <div className="w-20 h-20 rounded overflow-hidden border bg-white shrink-0">
                  <img src={resolveImageSrc(projectForm.image)} alt="Preview" className="w-full h-full object-cover" onError={(e) => { e.target.src = 'https://via.placeholder.com/80?text=Error' }} />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Project Date (Optional)</label>
              <input type="date" value={projectForm.date} onChange={(e) => setProjectForm({ ...projectForm, date: e.target.value })} className="w-full md:w-1/2 rounded border px-3 py-2" />
            </div>
          </form>
        )}
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
