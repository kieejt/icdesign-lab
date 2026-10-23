import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { FormField, InlineNotice } from '../components/admin'
import { PageHeader, Section, Shell, Spinner } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'

const MIN_LENGTH = 6

/** Rough guide for the new-password field: length first, then variety. */
function strengthOf(password) {
  if (!password) return 0
  let score = 0
  if (password.length >= MIN_LENGTH) score += 1
  if (password.length >= 10) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1
  return score
}

function StrengthBar({ password, t }) {
  const score = strengthOf(password)
  if (!password) return null
  const tone = score <= 1 ? 'bg-signal-danger' : score <= 2 ? 'bg-signal-warn' : 'bg-signal-ok'
  const label = [t('account.strengthWeak'), t('account.strengthWeak'), t('account.strengthOk'), t('account.strengthGood'), t('account.strengthStrong')][score]
  return (
    <div className="mt-2 flex items-center gap-3" aria-live="polite">
      <div className="flex h-1 flex-1 gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((step) => (
          <span key={step} className={`h-full flex-1 ${step <= score ? tone : 'bg-ink-100'}`} />
        ))}
      </div>
      <span className="font-mono text-xs uppercase tracking-label text-ink-500">{label}</span>
    </div>
  )
}

function ProfileCard({ user, onSaved, t }) {
  const [name, setName] = useState(user.name || '')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null)

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    setNotice(null)
    try {
      const { data } = await api.patch('/auth/profile', { name })
      onSaved(data.user)
      setNotice({ tone: 'ok', text: t('account.profileSaved') })
    } catch (err) {
      setNotice({ tone: 'danger', text: err.response?.data?.message || t('account.genericError') })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="surface space-y-5 p-6 sm:p-7">
      <div>
        <h2 className="font-display text-lg font-semibold text-ink-950">{t('account.profileTitle')}</h2>
        <p className="mt-1 text-sm text-ink-500">{t('account.profileHint')}</p>
      </div>

      <FormField label={t('account.name')} htmlFor="account-name" hint={t('account.nameHint')}>
        <input
          id="account-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          autoComplete="name"
          className="field"
        />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label={t('account.email')} htmlFor="account-email">
          <input id="account-email" value={user.email} readOnly className="field bg-paper-sunken text-ink-500" />
        </FormField>
        {user.studentId && (
          <FormField label={t('account.studentId')} htmlFor="account-sid">
            <input id="account-sid" value={user.studentId} readOnly className="field bg-paper-sunken text-ink-500" />
          </FormField>
        )}
      </div>

      {notice && <InlineNotice tone={notice.tone}>{notice.text}</InlineNotice>}

      <div className="flex justify-end">
        <button type="submit" disabled={saving || name === (user.name || '')} className="btn-primary">
          {saving ? t('account.saving') : t('account.save')}
        </button>
      </div>
    </form>
  )
}

function PasswordCard({ user, onChanged, t }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null)

  const mismatch = confirm !== '' && next !== confirm
  const submit = async (event) => {
    event.preventDefault()
    setNotice(null)
    if (next.length < MIN_LENGTH) {
      setNotice({ tone: 'danger', text: t('account.tooShort', { count: MIN_LENGTH }) })
      return
    }
    if (next !== confirm) {
      setNotice({ tone: 'danger', text: t('account.mismatch') })
      return
    }

    setSaving(true)
    try {
      const { data } = await api.post('/auth/change-password', { currentPassword: current, newPassword: next })
      setCurrent('')
      setNext('')
      setConfirm('')
      onChanged(data.user)
      setNotice({ tone: 'ok', text: t('account.passwordChanged') })
    } catch (err) {
      setNotice({ tone: 'danger', text: err.response?.data?.message || t('account.genericError') })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="surface space-y-5 p-6 sm:p-7">
      <div>
        <h2 className="font-display text-lg font-semibold text-ink-950">{t('account.passwordTitle')}</h2>
        <p className="mt-1 text-sm text-ink-500">{t('account.passwordHint', { count: MIN_LENGTH })}</p>
      </div>

      {/* Lets a password manager tie the new password to this account. */}
      <input type="text" value={user.email} autoComplete="username" readOnly hidden />

      <FormField label={user.mustChangePassword ? t('account.temporaryPassword') : t('account.currentPassword')} htmlFor="current-password" required>
        <input
          id="current-password"
          type={show ? 'text' : 'password'}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
          className="field"
          required
        />
      </FormField>

      <FormField label={t('account.newPassword')} htmlFor="new-password" required>
        <input
          id="new-password"
          type={show ? 'text' : 'password'}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
          minLength={MIN_LENGTH}
          className="field"
          required
        />
        <StrengthBar password={next} t={t} />
      </FormField>

      <FormField label={t('account.confirmPassword')} htmlFor="confirm-password" required error={mismatch ? t('account.mismatch') : undefined}>
        <input
          id="confirm-password"
          type={show ? 'text' : 'password'}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          className="field"
          required
        />
      </FormField>

      <label className="flex items-center gap-2 text-sm text-ink-600">
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
        {t('account.showPasswords')}
      </label>

      {notice && <InlineNotice tone={notice.tone}>{notice.text}</InlineNotice>}

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-ink-400">{t('account.signedOutElsewhere')}</p>
        <button type="submit" disabled={saving} className="btn-primary shrink-0">
          {saving ? t('account.saving') : t('account.changePassword')}
        </button>
      </div>
    </form>
  )
}

export default function AccountPage() {
  const { t } = useTranslation()
  const { currentUser, loading, updateUser } = useAuth()

  // Dropped on arrival from a forced redirect: the notice below explains why.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (!currentUser) return <Navigate to="/login" replace state={{ from: '/account' }} />

  return (
    <>
      <PageHeader eyebrow={t('account.eyebrow')} title={t('account.title')} subtitle={currentUser.email} />

      <Section>
        <Shell narrow="max-w-3xl">
          {currentUser.mustChangePassword && (
            <InlineNotice tone="info" className="mb-8">
              <strong className="font-medium">{t('account.mustChangeTitle')}</strong> {t('account.mustChangeBody')}
            </InlineNotice>
          )}

          <div className="space-y-8">
            <PasswordCard user={currentUser} onChanged={updateUser} t={t} />
            {!currentUser.mustChangePassword && <ProfileCard user={currentUser} onSaved={updateUser} t={t} />}
          </div>
        </Shell>
      </Section>
    </>
  )
}
