import { useCallback, useEffect, useState } from 'react'
import './styles/app.css'
import Icon from './components/Icon'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import MonEspace from './pages/MonEspace'
import Onboarding from './pages/Onboarding'
import Questionnaires from './pages/Questionnaires'
import Documents from './pages/Documents'

export default function App() {
  const [view, setView] = useState('espace')
  const [menuOpen, setMenuOpen] = useState(false)
  const [toast, setToast] = useState(null)

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
