import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Trailing URL segments that open an overlay on top of the current page rather
 * than navigating to a new one.
 *
 * The gallery lightbox is addressable (`/lab-event/gallery/:id/photo/3`) so a
 * single photo can be linked to. Opening or paging through it must not scroll
 * the album underneath back to the top, because closing the overlay would then
 * drop the visitor somewhere they never were.
 */
const OVERLAY_SEGMENT = /\/photo\/\d+$/

/** The page a URL belongs to, ignoring any overlay opened on top of it. */
const basePathOf = (pathname) => pathname.replace(OVERLAY_SEGMENT, '')

/**
 * Resets scroll position on navigation.
 *
 * A client-side router keeps the scroll offset across route changes, so moving
 * from halfway down one page to another landed the visitor halfway down the new
 * one. Hash links and overlay routes are left alone.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation()
  const previousBase = useRef(basePathOf(pathname))

  useEffect(() => {
    const base = basePathOf(pathname)
    const samePage = base === previousBase.current
    previousBase.current = base

    if (hash || samePage) return

    // 'instant' rather than the CSS `scroll-behavior: smooth`: animating a
    // full-page jump on every navigation just delays the new content.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname, hash])

  return null
}
