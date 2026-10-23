import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { FormField, InlineNotice } from '../../components/admin'
import { useAuth } from '../../contexts/AuthContext'
import { Icon, Shell } from '../../components/ui'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const { currentUser, login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Already signed in — send admins to the console, everyone else to the lectures
  // portal, which is the only member-gated area they can use.
  useEffect(() => {
    if (!currentUser) return
    // Return to the page that sent them here (ProtectedAdminRoute records it) so
    // a session that expired mid-task resumes where it stopped.
    if (currentUser.mustChangePassword) {
      navigate('/account', { replace: true })
      return
    }
    const from = location.state?.from
    const fallback = currentUser.role === 'admin' ? '/admin/dashboard' : '/lectures'
    navigate(typeof from === 'string' && from.startsWith('/admin') && currentUser.role === 'admin' ? from : fallback, {
      replace: true,
    })
  }, [currentUser, navigate, location.state])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err.response?.data?.message || 'Sign-in failed. Check your email and password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Shell className="flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img
            src="/lab-logo.png"
            alt=""
            width="48"
            height="48"
            className="mx-auto h-12 w-auto object-contain"
          />
          <h1 className="mt-5 font-display text-2xl font-semibold text-ink-950">Lab sign-in</h1>
          <p className="mt-2 text-sm text-ink-500">
            Members and administrators of the IC design Lab.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="surface space-y-5 p-7">
          <FormField label="Email" htmlFor="email">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
              placeholder="you@hust.edu.vn"
              autoComplete="username"
              autoFocus
              required
            />
          </FormField>

          <FormField label="Password" htmlFor="password">
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field pr-20"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="btn-ghost btn-sm absolute right-1 top-1/2 -translate-y-1/2 font-mono text-[12px] uppercase tracking-label"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </FormField>

          {error && <InlineNotice>{error}</InlineNotice>}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Signing in…' : t('nav.Login')}
          </button>
        </form>

        <p className="mt-6 text-center">
          <Link to="/" className="link-quiet">
            <span aria-hidden="true">←</span> Back to the lab site
          </Link>
        </p>

        <p className="mt-8 flex items-start justify-center gap-2 text-center text-[12.5px] leading-relaxed text-ink-400">
          <Icon name="mail" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Accounts are issued by the lab. Need one, or forgot your password? Contact{' '}
            <a href="mailto:thang.nguyenvu@hust.edu.vn" className="link">
              thang.nguyenvu@hust.edu.vn
            </a>
          </span>
        </p>
      </div>
    </Shell>
  )
}
