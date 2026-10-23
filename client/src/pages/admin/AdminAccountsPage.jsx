import React, { useMemo, useState } from 'react'

import { AdminCard, AdminPage, AdminSection, EmptyRow, FormField, InlineNotice } from '../../components/admin'
import Modal from '../../components/Modal'
import { ErrorState, Skeleton, formatDate } from '../../components/ui'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { invalidateQueries, useApiQuery } from '../../hooks/useApiQuery'
import api from '../../lib/api'

// Fixed trailing columns so the header and every row line up; below `lg` a row
// stacks and its actions wrap under the name.
const ROW_GRID =
  'grid grid-cols-1 gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_110px_150px_130px_352px] lg:items-center lg:gap-4'

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/** "email,name,studentId" per line (or tab-separated, as pasted from a spreadsheet). */
function parseRoster(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/[\t,;]/).map((cell) => cell.trim()))
    .filter(([first]) => !/^e-?mail$/i.test(first)) // a header row
    .map(([email, name, studentId]) => ({ email, name: name || '', studentId: studentId || '' }))
}

/** Lets Excel read the file as UTF-8 (Vietnamese names). */
const BOM = String.fromCharCode(0xfeff)

const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`

/** Downloads credentials as a CSV the admin can hand out. They are not kept anywhere else. */
function downloadCredentials(rows) {
  const lines = [['email', 'name', 'student_id', 'temporary_password'], ...rows.map((r) => [r.email, r.name, r.studentId, r.temporaryPassword])]
  const blob = new Blob([`${BOM}${lines.map((l) => l.map(csvCell).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `student-credentials-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const errorText = (err, fallback) => err.response?.data?.message || fallback

function StatusBadge({ status }) {
  return status === 'suspended' ? <span className="badge-warn">Suspended</span> : <span className="badge-ok">Active</span>
}

/* -------------------------------------------------------------------------- */
/* Credentials panel — the only time a generated password is visible           */
/* -------------------------------------------------------------------------- */

function CredentialsPanel({ title, rows, onDismiss }) {
  const [copied, setCopied] = useState('')

  const copy = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(id)
      setTimeout(() => setCopied(''), 1500)
    } catch {
      /* clipboard blocked: the password is selectable in the field */
    }
  }

  return (
    <AdminCard className="border-signal-warn/30 bg-signal-warnSoft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink-950">{title}</h2>
          <p className="mt-1 text-sm text-ink-600">
            These temporary passwords are shown <strong>once</strong>: they are stored only as a hash. Give each one to its
            student; they must choose their own at the first sign-in.
          </p>
        </div>
        <div className="flex gap-2">
          {rows.length > 1 && (
            <button type="button" onClick={() => downloadCredentials(rows)} className="btn-secondary btn-sm">
              Download CSV
            </button>
          )}
          <button type="button" onClick={onDismiss} className="btn-ghost btn-sm">
            Done
          </button>
        </div>
      </div>

      <ul className="mt-4 divide-hairline border border-paper-border bg-paper-raised">
        {rows.map((row) => (
          <li key={row.email} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink-950">{row.name || row.email}</p>
              {row.name && <p className="truncate text-xs text-ink-500">{row.email}</p>}
            </div>
            <div className="flex items-center gap-2">
              <code className="select-all border border-paper-border bg-paper-sunken px-3 py-1.5 font-mono text-sm text-ink-900">
                {row.temporaryPassword}
              </code>
              <button type="button" onClick={() => copy(row.temporaryPassword, row.email)} className="btn-secondary btn-sm">
                {copied === row.email ? 'Copied' : 'Copy'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </AdminCard>
  )
}

/* -------------------------------------------------------------------------- */
/* Create + import                                                             */
/* -------------------------------------------------------------------------- */

function CreateStudentForm({ onCreated, onError }) {
  const [form, setForm] = useState({ name: '', email: '', studentId: '' })
  const [submitting, setSubmitting] = useState(false)
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    onError('')
    try {
      const { data } = await api.post('/auth/students', {
        email: form.email,
        name: form.name,
        studentId: form.studentId,
      })
      setForm({ name: '', email: '', studentId: '' })
      onCreated([{ ...data.student, temporaryPassword: data.temporaryPassword }], data.student)
    } catch (err) {
      onError(errorText(err, 'Failed to create the student account'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FormField label="Full name" htmlFor="new-name">
          <input id="new-name" value={form.name} onChange={set('name')} className="field" placeholder="Nguyen Van A" maxLength={100} />
        </FormField>
        <FormField label="Student ID" htmlFor="new-sid">
          <input id="new-sid" value={form.studentId} onChange={set('studentId')} className="field" placeholder="20250001" maxLength={30} />
        </FormField>
        <FormField label="Email" htmlFor="new-email" required>
          <input id="new-email" type="email" value={form.email} onChange={set('email')} className="field" placeholder="student@sis.hust.edu.vn" required />
        </FormField>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-500">
          A temporary password is generated and shown once. The student chooses their own when they first sign in.
        </p>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? 'Creating…' : 'Create account'}
        </button>
      </div>
    </form>
  )
}

function ImportForm({ onImported, onError }) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [skipped, setSkipped] = useState([])
  const rows = useMemo(() => parseRoster(text), [text])

  const loadFile = async (e) => {
    const file = e.target.files?.[0]
    if (file) setText(await file.text())
    e.target.value = ''
  }

  const submit = async () => {
    setSubmitting(true)
    onError('')
    setSkipped([])
    try {
      const { data } = await api.post('/auth/students/bulk', { students: rows }, { timeout: 60_000 })
      setSkipped(data.skipped)
      if (data.created.length) {
        setText('')
        onImported(data.created)
      }
    } catch (err) {
      onError(errorText(err, 'The import failed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <FormField
        label="Roster"
        htmlFor="roster"
        hint="One student per line: email, name, student ID. Paste from a spreadsheet or load a CSV. Up to 100 at a time; passwords are generated."
      >
        <textarea
          id="roster"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          className="field font-mono text-sm"
          placeholder={'an@sis.hust.edu.vn, Nguyen Van An, 20250001\nbinh@sis.hust.edu.vn, Tran Thi Binh, 20250002'}
        />
      </FormField>

      {skipped.length > 0 && (
        <InlineNotice tone="info">
          <p className="font-medium">{skipped.length} not imported:</p>
          <ul className="mt-1 list-disc pl-5">
            {skipped.map((s) => (
              <li key={`${s.email}-${s.reason}`}>
                {s.email || '(empty)'} — {s.reason}
              </li>
            ))}
          </ul>
        </InlineNotice>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="btn-secondary btn-sm cursor-pointer">
          Load a CSV file
          <input type="file" accept=".csv,.txt,text/csv,text/plain" className="sr-only" onChange={loadFile} />
        </label>
        <button type="button" onClick={submit} disabled={submitting || rows.length === 0} className="btn-primary">
          {submitting ? 'Importing…' : `Import ${rows.length || ''} ${rows.length === 1 ? 'student' : 'students'}`.trim()}
        </button>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* List                                                                        */
/* -------------------------------------------------------------------------- */

function StudentRow({ student, busy, onEdit, onToggle, onReset, onDelete }) {
  const suspended = student.status === 'suspended'
  return (
    <li className={`${ROW_GRID} ${suspended ? 'bg-paper-sunken/60' : ''}`}>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink-950">{student.name || student.email}</p>
        {student.name && <p className="truncate text-xs text-ink-500">{student.email}</p>}
        <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-ink-400 lg:hidden">
          {student.studentId && <span>ID {student.studentId}</span>}
          <StatusBadge status={student.status} />
        </p>
      </div>
      <span className="hidden font-mono text-sm text-ink-600 lg:block">{student.studentId || '—'}</span>
      <span className="hidden lg:block">
        <StatusBadge status={student.status} />
        {student.mustChangePassword && <span className="mt-1 block text-xs text-ink-400">Password not set yet</span>}
      </span>
      <span className="hidden text-sm text-ink-500 lg:block">
        {student.lastLoginAt ? formatDate(student.lastLoginAt, 'short') : 'Never signed in'}
      </span>
      <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
        <button type="button" onClick={() => onEdit(student)} disabled={busy} className="btn-secondary btn-sm">
          Edit
        </button>
        <button type="button" onClick={() => onReset(student)} disabled={busy} className="btn-secondary btn-sm">
          Reset password
        </button>
        <button type="button" onClick={() => onToggle(student)} disabled={busy} className="btn-secondary btn-sm">
          {suspended ? 'Reactivate' : 'Suspend'}
        </button>
        <button type="button" onClick={() => onDelete(student)} disabled={busy} className="btn-danger btn-sm">
          Delete
        </button>
      </div>
    </li>
  )
}

function ListSkeleton() {
  return (
    <ul className="divide-hairline" aria-hidden="true">
      {Array.from({ length: 4 }, (_, i) => (
        <li key={i} className={ROW_GRID}>
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="hidden h-4 w-20 lg:block" />
          <Skeleton className="hidden h-5 w-16 lg:block" />
          <Skeleton className="hidden h-4 w-24 lg:block" />
          <Skeleton className="h-8 w-40" />
        </li>
      ))}
    </ul>
  )
}

function EditModal({ student, onClose, onSaved }) {
  const [form, setForm] = useState({ name: student.name, email: student.email, studentId: student.studentId })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.patch(`/auth/students/${student._id}`, form)
      onSaved()
    } catch (err) {
      setError(errorText(err, 'Could not save the changes'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Edit student"
      maxWidth="max-w-lg"
      footer={
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" form="edit-student" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      }
    >
      <form id="edit-student" onSubmit={submit} className="space-y-5">
        {error && <InlineNotice>{error}</InlineNotice>}
        <FormField label="Full name" htmlFor="edit-name">
          <input id="edit-name" value={form.name} onChange={set('name')} className="field" maxLength={100} />
        </FormField>
        <FormField label="Student ID" htmlFor="edit-sid">
          <input id="edit-sid" value={form.studentId} onChange={set('studentId')} className="field" maxLength={30} />
        </FormField>
        <FormField label="Email" htmlFor="edit-email" required hint="The student signs in with this address.">
          <input id="edit-email" type="email" value={form.email} onChange={set('email')} className="field" required />
        </FormField>
      </form>
    </Modal>
  )
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default function AdminAccountsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [credentials, setCredentials] = useState(null) // { title, rows }
  const [mode, setMode] = useState('single') // 'single' | 'import'
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const q = useDebouncedValue(search.trim(), 300)
  const { data, loading, error: loadError, refetch } = useApiQuery('/auth/students', {
    params: { q, status },
    staleTime: 0,
  })
  const students = data ?? []

  // Counts for the summary come from an unfiltered list, so they stay put while searching.
  const all = useApiQuery('/auth/students', { staleTime: 0 })
  const totals = useMemo(() => {
    const list = all.data ?? []
    return {
      total: list.length,
      suspended: list.filter((s) => s.status === 'suspended').length,
      pending: list.filter((s) => s.mustChangePassword).length,
    }
  }, [all.data])

  const refresh = () => invalidateQueries('/auth/students')

  const announce = (text) => {
    setSuccess(text)
    setError('')
  }

  const handleCreated = (rows, student) => {
    refresh()
    announce(`Account created for ${student.name || student.email}.`)
    if (rows.length) setCredentials({ title: 'Account created', rows })
  }

  const handleImported = (rows) => {
    refresh()
    announce(`${rows.length} accounts created.`)
    setCredentials({ title: `${rows.length} accounts created`, rows })
  }

  const run = async (action, fallback) => {
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await action()
    } catch (err) {
      setError(errorText(err, fallback))
    } finally {
      setBusy(false)
    }
  }

  const handleToggle = (student) => {
    const suspending = student.status !== 'suspended'
    if (
      suspending &&
      !window.confirm(`Suspend ${student.name || student.email}? They are signed out immediately and cannot sign in until you reactivate the account.`)
    ) {
      return
    }
    run(async () => {
      await api.patch(`/auth/students/${student._id}`, { status: suspending ? 'suspended' : 'active' })
      refresh()
      announce(suspending ? `${student.email} is suspended.` : `${student.email} can sign in again.`)
    }, 'Could not change the account status')
  }

  const handleReset = (student) => {
    if (!window.confirm(`Issue a new temporary password for ${student.name || student.email}? Their current password stops working and they are signed out.`)) return
    run(async () => {
      const { data: result } = await api.post(`/auth/students/${student._id}/reset-password`)
      refresh()
      setSuccess('')
      setCredentials({ title: 'New temporary password', rows: [{ ...student, temporaryPassword: result.temporaryPassword }] })
    }, 'Could not reset the password')
  }

  const handleDelete = (student) => {
    if (!window.confirm(`Delete the account for ${student.name || student.email}? This cannot be undone; they lose access at once.`)) return
    run(async () => {
      await api.delete(`/auth/students/${student._id}`)
      refresh()
      announce(`Account for ${student.email} deleted.`)
    }, 'Could not delete the account')
  }

  const filtered = Boolean(q || status)

  return (
    <AdminPage
      title="Student accounts"
      description="Accounts let students open the lectures portal and ask questions. Suspending, resetting or deleting an account ends its sessions immediately."
    >
      {error && <InlineNotice>{error}</InlineNotice>}
      {success && <InlineNotice tone="ok">{success}</InlineNotice>}

      {credentials && <CredentialsPanel title={credentials.title} rows={credentials.rows} onDismiss={() => setCredentials(null)} />}

      <dl className="grid grid-cols-3 gap-px border border-paper-border bg-paper-border">
        {[
          ['Students', totals.total],
          ['Suspended', totals.suspended],
          ['Password not set', totals.pending],
        ].map(([label, value]) => (
          <div key={label} className="bg-paper-raised px-5 py-4">
            <dt className="eyebrow">{label}</dt>
            <dd className="mt-1 font-display text-2xl font-semibold text-ink-950">{all.loading ? '–' : value}</dd>
          </div>
        ))}
      </dl>

      <AdminSection
        title="Add students"
        action={
          <div className="flex gap-1 border border-paper-border p-0.5" role="tablist" aria-label="How to add students">
            {[
              ['single', 'One student'],
              ['import', 'Import a list'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mode === id}
                onClick={() => setMode(id)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${mode === id ? 'bg-ink-950 text-paper' : 'text-ink-600 hover:bg-paper-sunken'}`}
              >
                {label}
              </button>
            ))}
          </div>
        }
      >
        <AdminCard>
          {mode === 'single' ? (
            <CreateStudentForm onCreated={handleCreated} onError={setError} />
          ) : (
            <ImportForm onImported={handleImported} onError={setError} />
          )}
        </AdminCard>
      </AdminSection>

      <AdminSection title="Students" count={filtered ? `${students.length} found` : students.length}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <label htmlFor="student-search" className="sr-only">
              Search students
            </label>
            <input
              id="student-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="field"
              placeholder="Search by name, email or student ID"
            />
          </div>
          <div>
            <label htmlFor="student-status" className="sr-only">
              Filter by status
            </label>
            <select id="student-status" value={status} onChange={(e) => setStatus(e.target.value)} className="field sm:w-44">
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        {loadError && !data ? (
          <ErrorState message={errorText(loadError, 'Failed to load student accounts')} onRetry={refetch} />
        ) : !loading && students.length === 0 ? (
          <EmptyRow>{filtered ? 'No student matches this search.' : 'No student accounts yet. Add one above.'}</EmptyRow>
        ) : (
          <AdminCard padded={false}>
            <div className={`${ROW_GRID} hidden border-b border-paper-border lg:grid`}>
              <span className="eyebrow">Student</span>
              <span className="eyebrow">Student ID</span>
              <span className="eyebrow">Status</span>
              <span className="eyebrow">Last sign-in</span>
              <span className="eyebrow text-right">Actions</span>
            </div>
            {loading ? (
              <ListSkeleton />
            ) : (
              <ul className="divide-hairline">
                {students.map((student) => (
                  <StudentRow
                    key={student._id}
                    student={student}
                    busy={busy}
                    onEdit={setEditing}
                    onToggle={handleToggle}
                    onReset={handleReset}
                    onDelete={handleDelete}
                  />
                ))}
              </ul>
            )}
          </AdminCard>
        )}
      </AdminSection>

      {editing && (
        <EditModal
          key={editing._id}
          student={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            refresh()
            announce('Changes saved.')
          }}
        />
      )}
    </AdminPage>
  )
}
