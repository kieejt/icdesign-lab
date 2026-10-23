import React, { useState } from 'react'

import { AdminCard, AdminPage, AdminSection, EmptyRow, FormField, InlineNotice, RowActions } from '../../components/admin'
import { ErrorState, Skeleton, formatDate } from '../../components/ui'
import { invalidateQueries, useApiQuery } from '../../hooks/useApiQuery'
import api from '../../lib/api'

const ROW_GRID = 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_200px_auto]'

function StudentRow({ student, onRevoke }) {
  return (
    <li className={ROW_GRID}>
      <span className="min-w-0 truncate text-sm font-medium text-ink-950">{student.email}</span>
      <span className="hidden text-sm text-ink-500 sm:block">{formatDate(student.createdAt, 'long')}</span>
      <RowActions onDelete={() => onRevoke(student._id, student.email)} deleteLabel="Revoke" />
    </li>
  )
}

function StudentListSkeleton() {
  return (
    <ul className="divide-hairline" aria-hidden="true">
      {Array.from({ length: 4 }, (_, i) => (
        <li key={i} className={ROW_GRID}>
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="hidden h-4 w-32 sm:block" />
          <Skeleton className="h-8 w-16" />
        </li>
      ))}
    </ul>
  )
}

export default function AdminAccountsPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const { data, loading, error: loadError, refetch } = useApiQuery('/auth/students', { staleTime: 0 })
  const students = data ?? []

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    try {
      await api.post('/auth/students', { email, password })
      setSuccess(`Student account for ${email} created successfully.`)
      setEmail('')
      setPassword('')
      invalidateQueries('/auth/students')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create student account')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRevoke = async (id, studentEmail) => {
    if (!window.confirm(`Are you sure you want to revoke and delete the account for ${studentEmail}? This will immediately terminate their access to learning materials.`)) {
      return
    }

    setError('')
    setSuccess('')
    try {
      await api.delete(`/auth/students/${id}`)
      setSuccess(`Account for ${studentEmail} has been successfully revoked.`)
      invalidateQueries('/auth/students')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to revoke student account')
    }
  }

  return (
    <AdminPage
      title="Manage Student Accounts"
      description="Grant and revoke student access credentials for the lab learning portal. Revoked student accounts lose access immediately."
    >
      {error && <InlineNotice>{error}</InlineNotice>}
      {success && <InlineNotice tone="ok">{success}</InlineNotice>}

      <AdminSection title="Create Student Access">
        <AdminCard>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField label="Student Email" htmlFor="student-email" required>
                <input
                  id="student-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field"
                  placeholder="student@lab.com"
                  required
                />
              </FormField>
              <FormField label="Access Password" htmlFor="student-password" required>
                <input
                  id="student-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field"
                  placeholder="Minimum 6 characters"
                  minLength={6}
                  required
                />
              </FormField>
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Creating...' : 'Grant Access'}
              </button>
            </div>
          </form>
        </AdminCard>
      </AdminSection>

      <AdminSection title="Active Students Directory" count={students.length}>
        {loadError && !data ? (
          <ErrorState
            message={loadError.response?.data?.message || 'Failed to load student accounts'}
            onRetry={refetch}
          />
        ) : !loading && students.length === 0 ? (
          <EmptyRow>No active student accounts. Use the form above to grant access.</EmptyRow>
        ) : (
          <AdminCard padded={false}>
            <div className={`${ROW_GRID} border-b border-paper-border`}>
              <span className="eyebrow">Student Email</span>
              <span className="eyebrow hidden sm:block">Access Granted On</span>
              <span className="eyebrow text-right">Actions</span>
            </div>
            {loading ? (
              <StudentListSkeleton />
            ) : (
              <ul className="divide-hairline">
                {students.map((student) => (
                  <StudentRow key={student._id} student={student} onRevoke={handleRevoke} />
                ))}
              </ul>
            )}
          </AdminCard>
        )}
      </AdminSection>
    </AdminPage>
  )
}
