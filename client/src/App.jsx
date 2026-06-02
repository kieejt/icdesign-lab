import React, { useState } from 'react'
import { NavLink, Route, Routes, Navigate, useLocation, useNavigate } from 'react-router-dom'
import api from './lib/api'

import { publicNavItems } from './constants/navigation'
import HomePage from './pages/HomePage'
import ProfessorPage from './pages/ProfessorPage'
import StudentsPage from './pages/StudentsPage'
import AlumniPage from './pages/AlumniPage'
import ProjectPage from './pages/ProjectPage'
import PublicationsPage from './pages/PublicationsPage'
import EventPage from './pages/EventPage'
import GalleryPage from './pages/GalleryPage'
import DocumentsPage from './pages/DocumentsPage'
import LecturesPage from './pages/LecturesPage'
import LectureDetailPage from './pages/LectureDetailPage'

import WorldNewsPage from './pages/WorldNewsPage'
import VietnamNewsPage from './pages/VietnamNewsPage'
import JobsInternshipPage from './pages/JobsInternshipPage'
import LabRecruitmentPage from './pages/LabRecruitmentPage'
import ContactPage from './pages/ContactPage'

import Footer from './components/Footer'
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
import AdminRecruitmentPage from './pages/admin/AdminRecruitmentPage'
import AdminContactPage from './pages/admin/AdminContactPage'

const NavItem = ({ item, closeMenu }) => {
  const [isOpen, setIsOpen] = useState(false)

  if (item.children) {
    return (
      <div
        className="relative group"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <button
          className="w-full text-left px-4 py-2 text-base font-semibold tracking-wide text-slate-700 hover:text-slate-900 transition-colors flex items-center justify-between"
          onClick={() => setIsOpen(!isOpen)}
        >
          {item.label}
          <svg className={`w-3 h-3 ml-1.5 transition-transform opacity-50 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isOpen && (
          <div className="md:absolute left-0 md:top-full w-full md:w-56 bg-white md:border border-slate-200 md:shadow-2xl z-50 flex flex-col py-2">
            {item.children.map(child => (
              <NavLink
                key={child.to}
                to={child.to}
                onClick={closeMenu}
                className={({ isActive }) =>
                  `block px-4 py-2.5 text-base transition-colors ${isActive
                    ? 'font-bold text-slate-900 bg-slate-50'
                    : 'font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                {child.label}
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
        `px-4 py-2 text-base tracking-wide transition-colors ${isActive
          ? 'font-bold text-slate-900'
          : 'font-semibold text-slate-700 hover:text-slate-900'
        }`
      }
    >
      {item.label}
    </NavLink>
  )
}

function App() {
  const location = useLocation()
  const navigate = useNavigate()

  const [isMenuOpen, setIsMenuOpen] = React.useState(false)
  const [currentUser, setCurrentUser] = React.useState(null)
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false)

  const token = localStorage.getItem('token')
  const isLoggedIn = !!token
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

  React.useEffect(() => {
    const fetchUser = async () => {
      const storedToken = localStorage.getItem('token')
      if (storedToken) {
        try {
          const { data } = await api.get('/auth/me')
          setCurrentUser(data.user)
        } catch (err) {
          console.error('Failed to validate session token:', err)
          localStorage.removeItem('token')
          setCurrentUser(null)
        }
      } else {
        setCurrentUser(null)
      }
    }
    fetchUser()
  }, [token])

  const handleSignOut = () => {
    localStorage.removeItem('token')
    setCurrentUser(null)
    setIsDropdownOpen(false)
    navigate('/')
  }

  const firstLetter = currentUser && currentUser.email
    ? currentUser.email.charAt(0).toUpperCase()
    : 'U'

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans selection:bg-slate-900 selection:text-white text-slate-900">
      <div className="w-full flex-1">
        <header className="sticky top-0 z-50 w-full px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-4 border-b border-slate-200 bg-white/90 backdrop-blur-md md:flex-row md:items-center md:justify-between transition-all">
          <div className="flex items-center justify-between w-full md:w-auto">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">
                IC design Lab
              </h1>
            </div>
            <button
              className="md:hidden p-2 text-slate-600 hover:text-slate-900"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle Menu"
            >
              {isMenuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

          <nav className={`${isMenuOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 mt-4 md:mt-0 relative`}>
            {navItems.map((item) => (
              <NavItem key={item.label || item.to} item={item} closeMenu={() => setIsMenuOpen(false)} />
            ))}

            {isLoggedIn && currentUser ? (
              <div className="relative ml-2">
                {/* Account circle button */}
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-9 h-9 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center justify-center text-sm shrink-0 uppercase tracking-wider transition-colors shadow-sm select-none animate-fadeIn"
                  title={currentUser.email}
                >
                  {firstLetter}
                </button>

                {/* Google/Youtube style Account dropdown */}
                {isDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 shadow-2xl z-50 flex flex-col p-5 animate-fadeIn">

                    {/* Header info */}
                    <div className="pb-3 border-b border-slate-100 flex flex-col gap-1.5 text-left">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Lab Identity</span>
                      <span className="text-sm font-bold text-slate-900 truncate" title={currentUser.email}>
                        {currentUser.email}
                      </span>
                      <span className="inline-flex w-fit border border-slate-900 bg-slate-900 text-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest mt-0.5">
                        {currentUser.role}
                      </span>
                    </div>

                    {/* Menu Options */}
                    <div className="py-4 flex flex-col gap-3 text-left">
                      {currentUser.role === 'admin' && (
                        <NavLink
                          to="/admin"
                          onClick={() => setIsDropdownOpen(false)}
                          className="text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-slate-950 transition-colors"
                        >
                          Admin Console →
                        </NavLink>
                      )}
                      <NavLink
                        to="/lectures"
                        onClick={() => setIsDropdownOpen(false)}
                        className="text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-slate-950 transition-colors"
                      >
                        Lectures Portal →
                      </NavLink>
                    </div>

                    {/* Sign out */}
                    <div className="pt-3 border-t border-slate-100">
                      <button
                        onClick={handleSignOut}
                        className="w-full text-center px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-red-650 hover:text-red-750 hover:bg-red-50/50 bg-red-50/20 transition-all border border-red-100"
                      >
                        Sign Out
                      </button>
                    </div>

                  </div>
                )}
              </div>
            ) : (
              <NavLink
                to="/login"
                className="px-4 py-2 text-sm font-semibold text-slate-900 border border-slate-200 hover:border-slate-900 transition-colors ml-2"
              >
                Login
              </NavLink>
            )}
          </nav>
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

          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/lectures" element={<LecturesPage />} />
          <Route path="/lectures/:id" element={<LectureDetailPage />} />


          <Route path="/news/world-news" element={<WorldNewsPage />} />
          <Route path="/news/vietnam-news" element={<VietnamNewsPage />} />
          <Route path="/news/jobs" element={<JobsInternshipPage />} />

          <Route path="/lab-recruitment" element={<LabRecruitmentPage />} />
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
              <Route path="recruitment" element={<AdminRecruitmentPage />} />
              <Route path="contact" element={<AdminContactPage />} />
            </Route>
          </Route>
        </Routes>
      </div>
      <Footer />
      <Chatbot />
    </div>
  )
}

export default App
