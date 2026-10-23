/*
 * Starts downloading a page's code before the visitor clicks.
 *
 * Every route is its own chunk, so the first click on a link pays a network
 * round trip before anything can render. Hovering, focusing or touching a link
 * is a strong enough signal to begin that download early; by the time the click
 * lands the chunk is usually already in the module cache.
 *
 * These import() calls resolve to the same modules as the lazy() calls in
 * App.jsx, so the bundler emits one chunk and the browser fetches it once.
 */

const routes = [
  [/^\/people\/professor$/, () => import('../pages/ProfessorPage')],
  [/^\/people\/students$/, () => import('../pages/StudentsPage')],
  [/^\/people\/alumni$/, () => import('../pages/AlumniPage')],
  [/^\/people\/[^/]+\/[^/]+$/, () => import('../pages/MemberDetailPage')],
  [/^\/research\/project$/, () => import('../pages/ProjectPage')],
  [/^\/research\/project\/[^/]+$/, () => import('../pages/ProjectDetailPage')],
  [/^\/research\/publications$/, () => import('../pages/PublicationsPage')],
  [/^\/research\/publications\/[^/]+$/, () => import('../pages/PublicationDetailPage')],
  [/^\/lab-event\/event$/, () => import('../pages/EventPage')],
  [/^\/lab-event\/event\/[^/]+$/, () => import('../pages/EventDetailPage')],
  [/^\/lab-event\/gallery$/, () => import('../pages/GalleryPage')],
  [/^\/lab-event\/gallery\/[^/]+/, () => import('../pages/GalleryAlbumPage')],
  [/^\/documents$/, () => import('../pages/DocumentsPage')],
  [/^\/lectures$/, () => import('../pages/LecturesPage')],
  [/^\/lectures\/[^/]+$/, () => import('../pages/LectureDetailPage')],
  [/^\/news\/world-news$/, () => import('../pages/WorldNewsPage')],
  [/^\/news\/vietnam-news$/, () => import('../pages/VietnamNewsPage')],
  [/^\/news\/jobs$/, () => import('../pages/JobsInternshipPage')],
  [/^\/contact$/, () => import('../pages/ContactPage')],
]

const started = new Set()

/** Begin loading the chunk for `pathname`, once. Never throws. */
export function prefetchRoute(pathname) {
  if (started.has(pathname)) return
  const match = routes.find(([pattern]) => pattern.test(pathname))
  if (!match) return

  started.add(pathname)
  match[1]().catch(() => started.delete(pathname))
}

/** Wires prefetching to every internal link on the page. Returns an unsubscribe. */
export function installLinkPrefetch() {
  const handler = (event) => {
    const link = event.target instanceof Element ? event.target.closest('a[href^="/"]') : null
    if (!link) return
    // Skip links that open elsewhere or download — they never route client-side.
    if (link.target === '_blank' || link.hasAttribute('download')) return
    prefetchRoute(new URL(link.href).pathname)
  }

  const events = ['pointerover', 'focusin', 'touchstart']
  events.forEach((name) => document.addEventListener(name, handler, { passive: true }))
  return () => events.forEach((name) => document.removeEventListener(name, handler))
}
