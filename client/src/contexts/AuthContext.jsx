import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import api from '../lib/api'
import { invalidateQueries } from '../hooks/useApiQuery'

const AuthContext = createContext(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error('useAuth must be used inside an <AuthProvider>')
  }
  return context
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Resolve the session once at start-up. A 401 here is the normal signed-out
  // case, not an error worth logging.
  useEffect(() => {
    // `cancelled` rather than relying on the abort alone: an aborted request
    // still settles through .catch/.finally, and in StrictMode the first mount's
    // request is aborted instantly. Without this guard it reported "signed out"
    // and "done loading" before the real answer arrived, so a hard reload of any
    // /admin page bounced through /login and landed on the dashboard.
    let cancelled = false
    const controller = new AbortController()

    api
      .get('/auth/me', { signal: controller.signal })
      .then(({ data }) => {
        if (!cancelled) setCurrentUser(data.user)
      })
      .catch(() => {
        if (!cancelled) setCurrentUser(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    // A different account may see different data (lectures, admin lists), so the
    // previous session's cached responses must not carry over.
    invalidateQueries()
    setCurrentUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch (err) {
      // The cookie is cleared server-side on success; if the call fails we still
      // drop local state so the UI cannot keep showing a signed-in session.
      console.warn('Logout request failed', err)
    } finally {
      invalidateQueries()
      setCurrentUser(null)
    }
  }, [])

  // Memoised so consumers don't re-render on every provider render.
  const value = useMemo(
    () => ({ currentUser, loading, login, logout }),
    [currentUser, loading, login, logout],
  )

  /*
   * The tree renders immediately.
   *
   * This provider used to hold back `children` until the session call resolved,
   * which meant every visitor — including anonymous ones who never sign in —
   * stared at a blank page for a full API round trip before any content began
   * to render. Components that need to wait read `loading` themselves; the
   * public pages simply do not care.
   */
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
