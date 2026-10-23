import React, { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { adminNavItems } from '../constants/navigation'
import { useAuth } from '../contexts/AuthContext'
import { Icon, cx } from '../components/ui'

/** Sidebar navigation, shared by the desktop rail and the mobile drawer. */
function AdminNav({ onNavigate }) {
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Admin sections">
      {adminNavItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cx(
              'flex items-center gap-3 border-l-2 px-4 py-2.5 text-sm transition-colors',
              isActive
                ? 'border-accent-600 bg-paper-sunken font-semibold text-ink-950'
                : 'border-transparent font-medium text-ink-500 hover:border-ink-200 hover:bg-paper-sunken hover:text-ink-900',
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser, logout } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Adjust during render rather than in an effect, so the drawer is already
  // closed on the first frame of the new page.
  const [lastPath, setLastPath] = useState(location.pathname)
  if (location.pathname !== lastPath) {
    setLastPath(location.pathname)
    if (drawerOpen) setDrawerOpen(false)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const currentSection =
    adminNavItems.find((item) => location.pathname.startsWith(item.to))?.label ?? 'Console'

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-paper lg:flex-row">
      {/* --- Mobile top bar -------------------------------------------- */}
      <div className="flex items-center justify-between border-b border-paper-border bg-paper-raised px-4 py-3 lg:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setDrawerOpen((v) => !v)}
            aria-expanded={drawerOpen}
            aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
            className="border border-ink-200 p-2 text-ink-600 transition-colors hover:border-ink-900 hover:text-ink-950"
          >
            <Icon name={drawerOpen ? 'close' : 'menu'} className="h-5 w-5" />
          </button>
          <span className="font-display text-sm font-semibold text-ink-950">{currentSection}</span>
        </div>
        <Link to="/" className="link-quiet">
          View site
        </Link>
      </div>

      {/* --- Sidebar ---------------------------------------------------- */}
      <aside
        className={cx(
          'z-20 flex w-full shrink-0 flex-col border-b border-paper-border bg-paper-raised lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r',
          drawerOpen ? 'block' : 'hidden lg:flex',
        )}
      >
        <div className="hidden items-center gap-3 border-b border-paper-border px-5 py-5 lg:flex">
          <img
            src="/lab-logo.png"
            alt=""
            width="32"
            height="32"
            className="h-8 w-auto object-contain"
          />
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold leading-tight text-ink-950">
              Lab console
            </p>
            <p className="eyebrow mt-0.5">Administration</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-5">
          <AdminNav onNavigate={() => setDrawerOpen(false)} />
        </div>

        <div className="border-t border-paper-border p-4">
          {currentUser && (
            <p
              className="mb-3 truncate font-mono text-[11px] text-ink-400"
              title={currentUser.email}
            >
              {currentUser.email}
            </p>
          )}

          <Link to="/" className="btn-secondary btn-sm mb-2 hidden w-full lg:inline-flex">
            View public site
          </Link>

          <button type="button" onClick={handleLogout} className="btn-secondary btn-sm w-full">
            <Icon name="logout" className="h-3.5 w-3.5" strokeWidth={2} />
            Sign out
          </button>
        </div>
      </aside>

      {/* --- Content ---------------------------------------------------- */}
      <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
