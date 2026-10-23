import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './fonts.css'
import './index.css'
import './i18n'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext'

/*
 * After a deploy the build's file names change. A visitor holding the previous
 * page asks for a script that no longer exists and the lazy route fails to load.
 * Reload once to pick up the new page; the session flag stops a loop if the file
 * is genuinely missing.
 */
window.addEventListener('vite:preloadError', () => {
  try {
    if (sessionStorage.getItem('reloaded-after-deploy')) return
    sessionStorage.setItem('reloaded-after-deploy', '1')
  } catch {
    return
  }
  window.location.reload()
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
