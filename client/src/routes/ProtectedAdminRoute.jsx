import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '../contexts/AuthContext'
import { Spinner } from '../components/ui'

/**
 * Gate for the /admin subtree.
 *
 * The redirect carries the attempted path in `state`, so signing in can return
 * the admin to where they were headed instead of dumping them on the dashboard.
 */
export default function ProtectedAdminRoute() {
  const { currentUser, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <Spinner />
        <p className="eyebrow">Checking session</p>
      </div>
    )
  }

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (currentUser.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
