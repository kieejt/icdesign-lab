import React, { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { publicNavItems } from '../constants/navigation'
import { useAuth } from '../contexts/AuthContext'
import { Icon, cx } from './ui'

/**
 * Whether the device has a real hover state.
 *
 * Touch browsers fire `mouseenter` on tap, which would make tapping a section
 * label both navigate and pop its menu open. Checked per event rather than once,
 * so a laptop with a touchscreen behaves correctly either way.
 */
const canHover = () => window.matchMedia?.('(hover: hover)').matches ?? false

/**
 * Closes a floating layer on outside pointer-down and on Escape.
 *
 * @param {boolean} active   whether the layer is currently open
 * @param {() => void} onClose
 * @returns {React.RefObject<HTMLElement>} attach to the layer's outer element
 */
function useDismissable(active, onClose) {
  const ref = useRef(null)

  useEffect(() => {
    if (!active) return undefined

    const onPointerDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) onClose()
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [active, onClose])

  return ref
}

/* -------------------------------------------------------------------------- */

/**
 * One top-level nav entry — either a plain link, or a link paired with a
 * dropdown when the section has children.
 *
 * A section is two separate targets on purpose. The label is an ordinary link
 * straight to the section's landing page, because "People" meaning *only* "open
 * a menu" costs everyone an extra step to reach a page they were already headed
 * for. The chevron beside it is a real disclosure button, which is what keeps
 * the other pages reachable by keyboard and by touch — neither of which has a
 * hover state to rely on.
 */
function NavItem({ item, onNavigate }) {
  const { t } = useTranslation()
  const location = useLocation()
  const menuId = useId()

  /*
   * Two independent reasons the menu can be open, not one.
   *
   * With a single `open` flag, hovering set it to true and the chevron's toggle
   * then immediately set it back to false — so on a mouse the button looked
   * dead. Tracking the pointer and the explicit toggle separately lets hover
   * reveal the menu while a click still closes it.
   */
  const [pinned, setPinned] = useState(false)
  const [hovered, setHovered] = useState(false)
  const open = pinned || hovered

  const close = useCallback(() => {
    setPinned(false)
    setHovered(false)
  }, [])

  const ref = useDismissable(open, close)

  const [lastPath, setLastPath] = useState(location.pathname)
  if (location.pathname !== lastPath) {
    setLastPath(location.pathname)
    if (open) {
      setPinned(false)
      setHovered(false)
    }
  }

  if (!item.children) {
    return (
      <NavLink
        to={item.to}
        onClick={onNavigate}
        className={({ isActive }) =>
          cx(
            'relative flex items-center px-3 py-4 text-[15px] transition-colors',
            // The active marker is a hairline under the label rather than a
            // colour change alone, so it still reads at a glance.
            'after:absolute after:inset-x-3 after:bottom-2.5 after:h-px after:origin-left after:scale-x-0 after:bg-accent-600 after:transition-transform after:duration-300',
            isActive
              ? 'font-semibold text-ink-950 after:scale-x-100'
              : 'font-medium text-ink-600 hover:text-ink-950 hover:after:scale-x-100',
          )
        }
      >
        {t(`nav.${item.label}`)}
      </NavLink>
    )
  }

  const isSectionActive = item.children.some((child) => location.pathname.startsWith(child.to))

  // Falls back to the first child so a group that forgets to declare `to` still
  // leads somewhere rather than rendering a dead link.
  const landingPath = item.to ?? item.children[0].to

  const label = t(`nav.${item.label}`)

  const followLink = () => {
    close()
    onNavigate?.()
  }

  return (
    <div
      ref={ref}
      className="relative xl:flex xl:items-center"
      onMouseEnter={() => {
        if (canHover()) setHovered(true)
      }}
      onMouseLeave={close}
    >
      {/* On mobile the chevron is pushed to the far edge to give it a tap target
          clear of the label; on desktop the two sit together. */}
      <div className="flex items-center justify-between xl:justify-start">
        <Link
          to={landingPath}
          onClick={followLink}
          className={cx(
            'relative flex items-center py-4 pl-3 pr-1.5 text-[15px] transition-colors',
            // The active marker is a hairline under the label rather than a
            // colour change alone, so it still reads at a glance. It tracks the
            // whole section, not just the landing page.
            'after:absolute after:bottom-2.5 after:left-3 after:right-1.5 after:h-px after:origin-left after:scale-x-0 after:bg-accent-600 after:transition-transform after:duration-300',
            isSectionActive
              ? 'font-semibold text-ink-950 after:scale-x-100'
              : 'font-medium text-ink-600 hover:text-ink-950 hover:after:scale-x-100',
          )}
        >
          {label}
        </Link>

        <button
          type="button"
          aria-expanded={open}
          aria-controls={menuId}
          aria-haspopup="true"
          aria-label={open ? `Hide ${label} pages` : `Show ${label} pages`}
          onClick={() => (open ? close() : setPinned(true))}
          className="flex items-center py-4 pl-1.5 pr-3 text-ink-400 transition-colors hover:text-ink-900"
        >
          <Icon
            name="chevronDown"
            strokeWidth={2}
            className={cx('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-180')}
          />
        </button>
      </div>

      {open && (
        <div
          id={menuId}
          className={cx(
            'z-50 flex flex-col',
            // Inline accordion on mobile; floating panel from xl up.
            'border-l border-paper-border pl-3 xl:absolute xl:left-0 xl:top-full xl:w-72 xl:animate-scale-in',
            'xl:origin-top-left xl:border xl:border-ink-900 xl:bg-paper-raised xl:p-1.5 xl:pl-1.5 xl:shadow-overlay',
          )}
        >
          {item.children.map((child) => (
            <NavLink
              key={child.to}
              to={child.to}
              onClick={followLink}
              className={({ isActive }) =>
                cx(
                  'group/i flex items-center justify-between px-3.5 py-3 text-sm transition-colors',
                  isActive
                    ? 'bg-ink-950 font-semibold text-paper'
                    : 'font-medium text-ink-600 hover:bg-paper-sunken hover:text-ink-950',
                )
              }
            >
              {t(`nav.${child.label}`)}
              <span
                aria-hidden="true"
                className="translate-x-0 text-ink-300 opacity-0 transition-all duration-200 group-hover/i:translate-x-0.5 group-hover/i:opacity-100"
              >
                →
              </span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */

/** Signed-in avatar with its account menu. */
function AccountMenu({ user, onSignOut }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const ref = useDismissable(open, close)

  const initial = user?.email?.charAt(0).toUpperCase() || 'U'

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        title={user.email}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-950 font-mono text-sm font-medium uppercase text-paper transition-colors hover:bg-accent-600"
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-3 w-72 origin-top-right animate-scale-in border border-ink-900 bg-paper-raised shadow-overlay"
        >
          <div className="flex flex-col gap-2 border-b border-paper-border p-5">
            <span className="eyebrow">Lab identity</span>
            <span className="truncate text-sm font-medium text-ink-900" title={user.email}>
              {user.email}
            </span>
            <span className="badge-neutral w-fit">{user.role}</span>
          </div>

          <div className="flex flex-col p-2">
            {user.role === 'admin' && (
              <Link
                to="/admin"
                role="menuitem"
                onClick={close}
                className="px-3 py-2.5 text-sm font-medium text-ink-600 transition-colors hover:bg-paper-sunken hover:text-ink-950"
              >
                Admin console →
              </Link>
            )}
            <Link
              to="/lectures"
              role="menuitem"
              onClick={close}
              className="px-3 py-2.5 text-sm font-medium text-ink-600 transition-colors hover:bg-paper-sunken hover:text-ink-950"
            >
              Lectures portal →
            </Link>
          </div>

          <div className="border-t border-paper-border p-2">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close()
                onSignOut()
              }}
              className="btn-danger btn-sm w-full"
            >
              {t('nav.Sign Out')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */

export default function SiteHeader() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { currentUser, logout } = useAuth()

  const [menuOpen, setMenuOpen] = useState(false)
  const [condensed, setCondensed] = useState(false)
  const stickyRef = useRef(null)

  const navItems = publicNavItems.filter((item) => item.to !== '/login')

  // Closing the drawer on navigation is a state *adjustment*, not a side
  // effect: comparing against the previous path during render lets React apply
  // it in the same pass instead of painting the open drawer and then closing it.
  const [lastPath, setLastPath] = useState(location.pathname)
  if (location.pathname !== lastPath) {
    setLastPath(location.pathname)
    if (menuOpen) setMenuOpen(false)
  }

  // Shrink the masthead once the page scrolls, so the nav takes less of the
  // viewport while reading. rAF-throttled: scroll fires far more often than the
  // browser can paint, and re-rendering on every event is wasted work.
  useEffect(() => {
    let frame = null
    const onScroll = () => {
      if (frame !== null) return
      frame = requestAnimationFrame(() => {
        setCondensed(window.scrollY > 24)
        frame = null
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame !== null) cancelAnimationFrame(frame)
    }
  }, [])

  /*
   * Publish the height of the part that actually stays on screen, so
   * `scroll-margin-top` can clear it.
   *
   * This measures the masthead and the desktop rail only — deliberately not the
   * mobile drawer. The drawer is inside the same <header>, and its own max-height
   * is derived from this variable: measuring it too made opening it grow the
   * header, which shrank the drawer, which shrank the header… settling with the
   * menu clipped to roughly half its content.
   */
  useEffect(() => {
    const el = stickyRef.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined

    const observer = new ResizeObserver(([entry]) => {
      document.documentElement.style.setProperty('--header-h', `${entry.contentRect.height}px`)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Stop the page behind the mobile drawer from scrolling.
  useEffect(() => {
    if (!menuOpen) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [menuOpen])

  const handleSignOut = async () => {
    await logout()
    navigate('/')
  }

  const toggleLanguage = () => i18n.changeLanguage(i18n.language === 'vi' ? 'en' : 'vi')

  return (
    <header className="sticky top-0 z-50 w-full border-b border-paper-border bg-paper/85 backdrop-blur-xl supports-[backdrop-filter]:bg-paper/75">
      {/* Skip link — the first tab stop, so keyboard users can jump the nav. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:bg-ink-950 focus:px-4 focus:py-2 focus:text-sm focus:text-paper"
      >
        Skip to content
      </a>

      <div ref={stickyRef}>
        {/* Masthead */}
        <div className="shell">
          <div
            className={cx(
              'flex items-center justify-between gap-4 transition-all duration-300 ease-out',
              condensed ? 'py-2.5' : 'py-4',
            )}
          >
            <Link
              to="/"
              className="group flex shrink-0 items-center gap-3.5 transition-opacity hover:opacity-80"
            >
              <img
                src="/lab-logo.png"
                alt=""
                width="56"
                height="56"
                className={cx(
                  'w-auto object-contain transition-all duration-300 ease-out',
                  condensed ? 'h-9' : 'h-14',
                )}
              />
              <span className="flex flex-col leading-none">
                <span
                  className={cx(
                    'font-display font-semibold tracking-tight text-ink-950 transition-all duration-300',
                    condensed ? 'text-base' : 'text-lg sm:text-xl',
                  )}
                >
                  IC Design Lab
                </span>
                <span
                  className={cx(
                    'eyebrow mt-1.5 hidden overflow-hidden transition-all duration-300 sm:block',
                    condensed ? 'max-h-0 opacity-0' : 'max-h-4 opacity-100',
                  )}
                >
                  Hanoi University of Science &amp; Technology
                </span>
              </span>
            </Link>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={toggleLanguage}
                title="Toggle language"
                aria-label={`Switch language to ${i18n.language === 'vi' ? 'English' : 'Vietnamese'}`}
                className="border border-ink-200 px-3 py-2 font-mono text-xs font-medium uppercase tracking-label text-ink-600 transition-colors hover:border-ink-900 hover:text-ink-950"
              >
                {i18n.language === 'vi' ? 'EN' : 'VI'}
              </button>

              {currentUser ? (
                <AccountMenu user={currentUser} onSignOut={handleSignOut} />
              ) : (
                <Link to="/login" className="btn-primary btn-sm hidden sm:inline-flex">
                  {t('nav.Login')}
                </Link>
              )}

              <button
                type="button"
                className="border border-ink-200 p-2 text-ink-600 transition-colors hover:border-ink-900 hover:text-ink-950 xl:hidden"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              >
                <Icon name={menuOpen ? 'close' : 'menu'} className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </div>

        {/* Desktop navigation rail */}
        <nav aria-label="Main" className="hidden border-t border-paper-border xl:block">
          <div className="shell">
            <div className="flex items-center gap-1">
              {navItems.map((item) => (
                <NavItem key={item.label || item.to} item={item} />
              ))}
            </div>
          </div>
        </nav>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <nav
          aria-label="Main"
          className="max-h-[calc(100vh-var(--header-h))] animate-fade-in overflow-y-auto border-t border-paper-border bg-paper-raised xl:hidden"
        >
          <div className="shell flex flex-col py-3">
            {navItems.map((item) => (
              <NavItem
                key={item.label || item.to}
                item={item}
                onNavigate={() => setMenuOpen(false)}
              />
            ))}
            {!currentUser && (
              <Link to="/login" className="btn-primary mt-4 sm:hidden">
                {t('nav.Login')}
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  )
}
