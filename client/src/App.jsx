import React, { Suspense, lazy, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import ErrorBoundary from './components/ErrorBoundary'
import ScrollToTop from './components/ScrollToTop'
import SiteHeader from './components/SiteHeader'
import { Shell, SkeletonGrid } from './components/ui'
import { trackPageView } from './lib/analytics'
import usePageMeta from './hooks/usePageMeta'
import LegacyPageRedirect from './routes/LegacyPageRedirect'
import { installLinkPrefetch } from './routes/routePrefetch'
import ProtectedAdminRoute from './routes/ProtectedAdminRoute'

/*
 * Routes are code-split.
 *
 * Previously every page — including the nine admin screens and their xlsx/jszip
 * dependencies — was a static import, so a visitor landing on the homepage
 * downloaded and parsed the entire application before seeing anything. Each
 * route now arrives as its own chunk, on demand.
 *
 * The homepage is the one exception: it is eagerly imported because it is the
 * most common entry point and a lazy boundary there would only add a round trip.
 */
import HomePage from './pages/HomePage'

// --- Public ---------------------------------------------------------------
const ProfessorPage = lazy(() => import('./pages/ProfessorPage'))
const MemberDetailPage = lazy(() => import('./pages/MemberDetailPage'))
const StudentsPage = lazy(() => import('./pages/StudentsPage'))
const AlumniPage = lazy(() => import('./pages/AlumniPage'))
const ProjectPage = lazy(() => import('./pages/ProjectPage'))
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage'))
const PublicationsPage = lazy(() => import('./pages/PublicationsPage'))
const PublicationDetailPage = lazy(() => import('./pages/PublicationDetailPage'))
const EventPage = lazy(() => import('./pages/EventPage'))
const EventDetailPage = lazy(() => import('./pages/EventDetailPage'))
const GalleryPage = lazy(() => import('./pages/GalleryPage'))
const GalleryAlbumPage = lazy(() => import('./pages/GalleryAlbumPage'))
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'))
const LecturesPage = lazy(() => import('./pages/LecturesPage'))
const LectureDetailPage = lazy(() => import('./pages/LectureDetailPage'))
const WorldNewsPage = lazy(() => import('./pages/WorldNewsPage'))
const VietnamNewsPage = lazy(() => import('./pages/VietnamNewsPage'))
const JobsInternshipPage = lazy(() => import('./pages/JobsInternshipPage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

/*
 * The assistant is off.
 *
 * It was an experiment; the server route is gated the same way (CHATBOT_ENABLED)
 * and answers 503 while disabled. Lazily imported so that, switched off, none of
 * its code is downloaded at all — set VITE_CHATBOT_ENABLED=true to bring it back.
 */
const CHATBOT_ENABLED = import.meta.env.VITE_CHATBOT_ENABLED === 'true'
const Chatbot = lazy(() => import('./components/Chatbot'))

// --- Admin ----------------------------------------------------------------
const LoginPage = lazy(() => import('./pages/admin/LoginPage'))
const AdminLayout = lazy(() => import('./layouts/AdminLayout'))
const AdminOverviewPage = lazy(() => import('./pages/admin/AdminOverviewPage'))
const AdminPeoplePage = lazy(() => import('./pages/admin/AdminPeoplePage'))
const AdminResearchPage = lazy(() => import('./pages/admin/AdminResearchPage'))
const AdminLabEventPage = lazy(() => import('./pages/admin/AdminLabEventPage'))
const AdminDocumentsPage = lazy(() => import('./pages/admin/AdminDocumentsPage'))
const AdminLecturesPage = lazy(() => import('./pages/admin/AdminLecturesPage'))
const AdminAccountsPage = lazy(() => import('./pages/admin/AdminAccountsPage'))
const AdminNewsPage = lazy(() => import('./pages/admin/AdminNewsPage'))
const AdminContactPage = lazy(() => import('./pages/admin/AdminContactPage'))

/** Placeholder shown while a route chunk downloads. */
function RouteFallback() {
  return (
    <Shell className="py-24">
      <div className="mb-16 space-y-5">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-14 w-2/3 max-w-2xl" />
        <div className="skeleton h-5 w-1/2 max-w-xl" />
      </div>
      <SkeletonGrid count={6} className="grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3" />
    </Shell>
  )
}

/** Records a page view on every public navigation. */
function AnalyticsTracker() {
  const { pathname } = useLocation()

  useEffect(() => {
    if (pathname.startsWith('/admin') || pathname === '/login') return
    trackPageView(pathname)
  }, [pathname])

  return null
}

/** Titles for pages whose title doesn't depend on loaded data. */
const STATIC_TITLES = {
  '/': 'IC Design Lab — Integrated Circuit Design Laboratory, HUST',
  '/people/professor': 'Professors',
  '/people/students': 'Students',
  '/people/alumni': 'Alumni',
  '/research/project': 'Research projects',
  '/research/publications': 'Publications',
  '/lab-event/event': 'Events',
  '/lab-event/gallery': 'Gallery',
  '/documents': 'Documents',
  '/lectures': 'Lectures',
  '/news/world-news': 'World news',
  '/news/vietnam-news': 'Vietnam news',
  '/news/jobs': 'Jobs and internships',
  '/contact': 'Contact',
}

/**
 * What a search engine needs to recognise the lab as an organisation (knowledge
 * panel, brand queries such as "IC Design Lab HUST"). Built once: the origin is
 * the page's own, so it is right on any deployment.
 */
const HOME_JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'ResearchOrganization',
      '@id': `${window.location.origin}/#lab`,
      name: 'IC Design Lab',
      alternateName: ['Integrated Circuit Design Laboratory', 'IC Design Lab HUST', 'Phòng thí nghiệm Thiết kế vi mạch'],
      url: `${window.location.origin}/`,
      logo: `${window.location.origin}/lab-logo.png`,
      description:
        'Integrated Circuit Design Laboratory at Hanoi University of Science and Technology (HUST). Research and training in advanced IC technology, embedded systems and computer engineering.',
      parentOrganization: {
        '@type': 'CollegeOrUniversity',
        name: 'Hanoi University of Science and Technology',
        alternateName: ['HUST', 'Đại học Bách khoa Hà Nội'],
        url: 'https://hust.edu.vn/',
      },
    },
    {
      '@type': 'WebSite',
      name: 'IC Design Lab',
      url: `${window.location.origin}/`,
      inLanguage: ['en', 'vi'],
    },
  ],
}

/** Gives list pages their own <title>; detail pages set theirs from loaded data. */
function StaticPageMeta() {
  const { pathname } = useLocation()
  const path = pathname.replace(/(.)\/$/, '$1')
  usePageMeta({
    title: STATIC_TITLES[path],
    jsonLd: path === '/' ? HOME_JSON_LD : undefined,
  })
  return null
}

export default function App() {
  const { pathname } = useLocation()
  const isAdminArea = pathname.startsWith('/admin')

  useEffect(() => installLinkPrefetch(), [])

  /*
   * The error boundary is re-keyed per page so a crash on one route doesn't
   * leave the next one stuck behind the fallback.
   *
   * Overlay segments are stripped first: opening a gallery photo changes the
   * URL but not the page, and re-keying there would unmount and rebuild the
   * whole album underneath the lightbox.
   */
  const pageKey = pathname.replace(/\/photo\/\d+$/, '')

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink-800">
      <ScrollToTop />
      <AnalyticsTracker />
      <StaticPageMeta />

      {/* The admin console has its own chrome, so the public shell is skipped there. */}
      {!isAdminArea && <SiteHeader />}

      <main id="main" className="flex flex-1 flex-col">
        <ErrorBoundary key={pageKey}>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />

              <Route path="/people/professor" element={<ProfessorPage />} />
              <Route path="/people/students" element={<StudentsPage />} />
              <Route path="/people/alumni" element={<AlumniPage />} />
              {/* One detail route serves all three groups; `:category` decides
                  which list the back link returns to. A static segment always
                  out-ranks a dynamic one, so the lists above still win. */}
              <Route path="/people/:category/:id" element={<MemberDetailPage />} />

              <Route path="/research/project" element={<ProjectPage />} />
              <Route path="/research/project/:id" element={<ProjectDetailPage />} />
              <Route path="/research/publications" element={<PublicationsPage />} />
              <Route path="/research/publications/:id" element={<PublicationDetailPage />} />

              <Route path="/lab-event/event" element={<EventPage />} />
              <Route path="/lab-event/event/:id" element={<EventDetailPage />} />
              <Route path="/lab-event/gallery" element={<GalleryPage />} />
              <Route path="/lab-event/gallery/:id" element={<GalleryAlbumPage />} />
              {/* Each photo in an album is its own address, so a single image
                  can be linked to directly. */}
              <Route path="/lab-event/gallery/:id/photo/:photoIndex" element={<GalleryAlbumPage />} />

              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/lectures" element={<LecturesPage />} />
              <Route path="/lectures/:id" element={<LectureDetailPage />} />

              <Route path="/news/world-news" element={<WorldNewsPage />} />
              <Route path="/news/vietnam-news" element={<VietnamNewsPage />} />
              <Route path="/news/jobs" element={<JobsInternshipPage />} />

              {/* Pagination moved from a path segment to `?page=`, matching
                  every other list on the site. These keep the previously
                  published URLs alive. */}
              <Route
                path="/news/world-news/page/:page"
                element={<LegacyPageRedirect to="/news/world-news" />}
              />
              <Route
                path="/news/vietnam-news/page/:page"
                element={<LegacyPageRedirect to="/news/vietnam-news" />}
              />
              <Route
                path="/news/jobs/page/:page"
                element={<LegacyPageRedirect to="/news/jobs" />}
              />

              <Route path="/contact" element={<ContactPage />} />
              <Route path="/login" element={<LoginPage />} />

              <Route element={<ProtectedAdminRoute />}>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<AdminOverviewPage />} />
                  <Route path="people" element={<AdminPeoplePage />} />
                  <Route path="research" element={<AdminResearchPage />} />
                  <Route path="lab-event" element={<AdminLabEventPage />} />
                  <Route path="documents" element={<AdminDocumentsPage />} />
                  <Route path="lectures" element={<AdminLecturesPage />} />
                  <Route path="accounts" element={<AdminAccountsPage />} />
                  <Route path="news" element={<AdminNewsPage />} />
                  <Route path="contact" element={<AdminContactPage />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>

      {!isAdminArea && CHATBOT_ENABLED && (
        <Suspense fallback={null}>
          <Chatbot />
        </Suspense>
      )}
    </div>
  )
}
