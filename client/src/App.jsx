import React, { useState } from 'react'
import { NavLink, Route, Routes, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from './lib/api'
import { useAuth } from './contexts/AuthContext'

import { publicNavItems } from './constants/navigation'
import HomePage from './pages/HomePage'
import ProfessorPage from './pages/ProfessorPage'
import StudentsPage from './pages/StudentsPage'
import AlumniPage from './pages/AlumniPage'
import ProjectPage from './pages/ProjectPage'
import PublicationsPage from './pages/PublicationsPage'
import EventPage from './pages/EventPage'
import GalleryPage from './pages/GalleryPage'
import GalleryAlbumPage from './pages/GalleryAlbumPage'
import DocumentsPage from './pages/DocumentsPage'
import LecturesPage from './pages/LecturesPage'
import LectureDetailPage from './pages/LectureDetailPage'

import WorldNewsPage from './pages/WorldNewsPage'
import VietnamNewsPage from './pages/VietnamNewsPage'
import JobsInternshipPage from './pages/JobsInternshipPage'
import ContactPage from './pages/ContactPage'

import Chatbot from './components/Chatbot'

import ProtectedAdminRoute from './routes/ProtectedAdminRoute'
import AdminLayout from './layouts/AdminLayout'
import LoginPage from './pages/admin/LoginPage'
import AdminOverviewPage from './pages/admin/AdminOverviewPage'
import AdminPeoplePage from './pages/admin/AdminPeoplePage'
import AdminResearchPage from './pages/admin/AdminResearchPage'
import AdminLabEventPage from './pages/admin/AdminLabEventPage'
import AdminDocumentsPage from './pages/admin/AdminDocumentsPage'
import AdminLecturesPage from './pages/admin/AdminLecturesPage'
import AdminAccountsPage from './pages/admin/AdminAccountsPage'

import AdminNewsPage from './pages/admin/AdminNewsPage'
import AdminContactPage from './pages/admin/AdminContactPage'

const NavItem = ({ item, closeMenu }) => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)

  if (item.children) {
    return (
      <div
        className="relative group xl:h-full flex items-center"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <button
          className="w-full text-left px-3 py-3 text-lg font-semibold tracking-wide text-slate-700 hover:text-blue-600 transition-colors flex items-center justify-between"
          onClick={() => setIsOpen(!isOpen)}
        >
          {t(`nav.${item.label}`)}
          <svg className={`w-4 h-4 ml-1.5 transition-transform opacity-50 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isOpen && (
          <div className="xl:absolute left-0 xl:top-full w-full xl:w-64 bg-white xl:border border-slate-200 xl:shadow-2xl z-50 flex flex-col py-2">
            {item.children.map(child => (
              <NavLink
                key={child.to}
                to={child.to}
                onClick={closeMenu}
                className={({ isActive }) =>
                  `block px-5 py-3.5 text-base transition-colors ${isActive
                    ? 'font-bold text-blue-600 bg-blue-50/50'
                    : 'font-medium text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                  }`
                }
              >
                {t(`nav.${child.label}`)}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <NavLink
      to={item.to}
      onClick={closeMenu}
      className={({ isActive }) =>
        `flex items-center px-3 py-3 text-lg tracking-wide transition-colors ${isActive
          ? 'font-bold text-blue-600'
          : 'font-semibold text-slate-700 hover:text-blue-600'
        }`
      }
    >
      {t(`nav.${item.label}`)}
    </NavLink>
  )
}

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

  const [isMenuOpen, setIsMenuOpen] = React.useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false)

  const { currentUser, logout } = useAuth()
  const isLoggedIn = !!currentUser
  const navItems = publicNavItems.filter(item => item.to !== '/login')

  React.useEffect(() => {
    setIsMenuOpen(false)
    setIsDropdownOpen(false)
  }, [location.pathname])

  React.useEffect(() => {
    const trackPageView = async () => {
      if (location.pathname.startsWith('/admin')) {
        return
      }
      try {
        await api.post('/analytics/track', { url: location.pathname })
      } catch (err) {
        console.warn('Analytics tracking failed:', err)
      }
    }
    trackPageView()
  }, [location.pathname])

  const handleSignOut = async () => {
    await logout()
    setIsDropdownOpen(false)
    navigate('/')
  }

  const firstLetter = currentUser && currentUser.email
    ? currentUser.email.charAt(0).toUpperCase()
    : 'U'

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans selection:bg-slate-900 selection:text-white text-slate-900">
      <div className="w-full flex-1">
        <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md transition-all shadow-sm">
          {/* Top Row: Logo & Actions */}
          <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between w-full max-w-[90rem] mx-auto">
            <NavLink to="/" className="flex items-center hover:opacity-80 transition-opacity shrink-0">
              <img src="/lab-logo.png" alt="IC Design Lab Logo" className="h-20 w-auto mr-4 object-contain" />
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 whitespace-nowrap">
                IC design Lab
              </h1>
            </NavLink>

            <div className="flex items-center gap-3 md:gap-5 shrink-0">
              <button
                onClick={() => i18n.changeLanguage(i18n.language === 'vi' ? 'en' : 'vi')}
                className="px-4 py-2 text-sm md:text-base font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                title="Toggle Language"
              >
                {i18n.language === 'vi' ? 'EN' : 'VI'}
              </button>

              {isLoggedIn && currentUser ? (
                <div className="relative">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center justify-center text-base shrink-0 uppercase tracking-wider transition-colors shadow-sm select-none animate-fadeIn"
                    title={currentUser.email}
                  >
                    {firstLetter}
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 shadow-2xl z-50 flex flex-col p-5 animate-fadeIn">
                      <div className="pb-3 border-b border-slate-100 flex flex-col gap-1.5 text-left">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Lab Identity</span>
                        <span className="text-sm font-bold text-slate-900 truncate" title={currentUser.email}>
                          {currentUser.email}
                        </span>
                        <span className="inline-flex w-fit border border-slate-900 bg-slate-900 text-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest mt-0.5">
                          {currentUser.role}
                        </span>
                      </div>
                      <div className="py-4 flex flex-col gap-3 text-left">
                        {currentUser.role === 'admin' && (
                          <NavLink to="/admin" onClick={() => setIsDropdownOpen(false)} className="text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-slate-950 transition-colors">
                            Admin Console →
                          </NavLink>
                        )}
                        <NavLink to="/lectures" onClick={() => setIsDropdownOpen(false)} className="text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-slate-950 transition-colors">
                          Lectures Portal →
                        </NavLink>
                      </div>
                      <div className="pt-3 border-t border-slate-100">
                        <button onClick={handleSignOut} className="w-full text-center px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-red-650 hover:text-red-750 hover:bg-red-50/50 bg-red-50/20 transition-all border border-red-100">
                          {t('nav.Sign Out')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <NavLink
                  to="/login"
                  className="px-5 py-2.5 text-sm md:text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm whitespace-nowrap"
                >
                  {t('nav.Login')}
                </NavLink>
              )}

              <button
                className="xl:hidden p-2 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md ml-1"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Toggle Menu"
              >
                {isMenuOpen ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Bottom Row: Navigation Links */}
          <div className={`${isMenuOpen ? 'block' : 'hidden'} xl:block border-t border-slate-100 bg-white`}>
            <nav className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col xl:flex-row xl:items-center xl:gap-6 py-2 xl:py-0">
              {navItems.map((item) => (
                <NavItem key={item.label || item.to} item={item} closeMenu={() => setIsMenuOpen(false)} />
              ))}
            </nav>
          </div>
        </header>

        <Routes>
          <Route path="/" element={<HomePage />} />

          <Route path="/people/professor" element={<ProfessorPage />} />
          <Route path="/people/students" element={<StudentsPage />} />
          <Route path="/people/alumni" element={<AlumniPage />} />

          <Route path="/research/project" element={<ProjectPage />} />
          <Route path="/research/publications" element={<PublicationsPage />} />

          <Route path="/lab-event/event" element={<EventPage />} />
          <Route path="/lab-event/gallery" element={<GalleryPage />} />
          <Route path="/lab-event/gallery/:id" element={<GalleryAlbumPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/lectures" element={<LecturesPage />} />
          <Route path="/lectures/:id" element={<LectureDetailPage />} />


          <Route path="/news/world-news" element={<WorldNewsPage />} />
          <Route path="/news/vietnam-news" element={<VietnamNewsPage />} />
          <Route path="/news/jobs" element={<JobsInternshipPage />} />

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
        </Routes>
      </div>
      <Chatbot />
    </div>
  )
}

export default App
