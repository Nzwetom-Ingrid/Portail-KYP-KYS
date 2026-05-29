// =============================================================
// Composant racine du portail tiers (code site Power Pages)
// =============================================================
// Comporte un « gate » d'authentification : un tiers anonyme voit
// l'écran <SignIn /> (déclenche Azure AD B2C + OTP) ; une fois
// authentifié, il accède à son espace. En mode local (mock, hors
// Power Pages), l'auth est court-circuitée pour le développement.
// =============================================================

import { useCallback, useEffect, useState } from 'react'
import './styles/app.css'
import Icon from './components/Icon'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import SignIn from './components/SignIn'
import MonEspace from './pages/MonEspace'
import Onboarding from './pages/Onboarding'
import Questionnaires from './pages/Questionnaires'
import Documents from './pages/Documents'
import { USE_DATAVERSE } from './config/dataverse'
import { getCurrentUser } from './services/dataverse'

export default function App() {
  const [view, setView] = useState('espace')
  const [menuOpen, setMenuOpen] = useState(false)
  const [toast, setToast] = useState(null)
  // Gate d'auth : 'loading' | 'authenticated' | 'anonymous'.
  // En local (mock), on considère l'utilisateur déjà authentifié.
  const [auth, setAuth] = useState(USE_DATAVERSE ? 'loading' : 'authenticated')

  useEffect(() => {
    if (!USE_DATAVERSE) return // mode local : pas d'authentification Power Pages
    let cancelled = false
    ;(async () => {
      try {
        const user = await getCurrentUser()
        if (!cancelled) setAuth(user?.contactId ? 'authenticated' : 'anonymous')
      } catch {
        if (!cancelled) setAuth('anonymous')
      }
    })()
    return () => { cancelled = true }
  }, [])

  const notify = useCallback((message) => {
    setToast(message)
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(t)
  }, [toast])

  const navigate = (next) => {
    setView(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Pendant la résolution de l'identité Power Pages
  if (auth === 'loading') {
    return (
      <div className="signin">
        <div className="card card--pad signin__card">
          <span className="signin__badge"><Icon name="shield" size={28} /></span>
          <p className="signin__text" style={{ margin: 0 }}>
            Chargement de votre espace sécurisé…
          </p>
        </div>
      </div>
    )
  }

  // Tiers non authentifié → écran de connexion B2C
  if (auth === 'anonymous') return <SignIn />

  return (
    <div className="app">
      {menuOpen && <div className="sidebar-scrim" onClick={() => setMenuOpen(false)} />}

      <Sidebar
        view={view}
        onNavigate={navigate}
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      <div className="main">
        <Topbar view={view} onMenu={() => setMenuOpen((o) => !o)} onNotify={notify} />

        {view === 'espace' && <MonEspace onNavigate={navigate} notify={notify} />}
        {view === 'onboarding' && <Onboarding notify={notify} />}
        {view === 'questionnaires' && <Questionnaires notify={notify} />}
        {view === 'documents' && <Documents notify={notify} />}
      </div>

      {toast && (
        <div className="toast" role="status">
          <span className="toast__icon"><Icon name="check" size={18} /></span>
          {toast}
        </div>
      )}
    </div>
  )
}
