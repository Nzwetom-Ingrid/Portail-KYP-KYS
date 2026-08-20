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
import UBO from './pages/UBO'
import Evaluations from './pages/Evaluations'
import Documents from './pages/Documents'
import DocumentsRecus from './pages/DocumentsRecus'
import { USE_DATAVERSE } from './config/dataverse'
import { getCurrentUser } from './services/dataverse'
import { getCurrentTiers, getCurrentUserProfile, loadAccessibleTiers, setCurrentTiers } from './services/portal'
import { useIdleTimer } from './hooks/useIdleTimer'

export default function App() {
  const [view, setView] = useState('espace')
  const [menuOpen, setMenuOpen] = useState(false)
  const [toast, setToast] = useState(null)
  // Recherche globale (barre du Topbar) : filtre la liste de la page courante.
  const [search, setSearch] = useState('')
  // Gate d'auth : 'loading' | 'authenticated' | 'anonymous'.
  // En local (mock), on considère l'utilisateur déjà authentifié.
  const [auth, setAuth] = useState(USE_DATAVERSE ? 'loading' : 'authenticated')
  const [profile, setProfile] = useState(null)
  // Entreprises accessibles : une meme personne peut suivre plusieurs partenaires.
  const [entreprises, setEntreprises] = useState([])
  const [entrepriseActive, setEntrepriseActive] = useState(null)

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

  // Profil affiché dans l'en-tête (nom réel de la personne connectée).
  useEffect(() => {
    if (auth !== 'authenticated') return
    let cancelled = false
    getCurrentUserProfile()
      .then((p) => { if (!cancelled) setProfile(p) })
      .catch(() => {})
    // Entreprises accessibles + celle actuellement retenue.
    Promise.all([loadAccessibleTiers(), getCurrentTiers()])
      .then(([liste, courant]) => {
        if (cancelled) return
        setEntreprises(liste)
        setEntrepriseActive(courant?.afb_tiersid ?? null)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [auth])

  /**
   * Bascule d'entreprise. On recharge la page plutôt que de propager le
   * changement écran par écran : chaque page charge ses données au montage à
   * partir du tiers courant, et un rechargement garantit qu'aucune donnée de
   * l'entreprise précédente ne subsiste à l'écran.
   */
  const changerEntreprise = useCallback((tiersId) => {
    setCurrentTiers(tiersId)
    window.location.reload()
  }, [])

  const notify = useCallback((message) => {
    setToast(message)
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(t)
  }, [toast])

  // Déconnexion auto après 15 min d'inactivité (poste partagé / non surveillé).
  // En mode Dataverse : logout réel Power Pages → le prochain visiteur retombe
  // sur l'écran de connexion. En local (mock) : on rebascule sur <SignIn />.
  const handleIdle = useCallback(() => {
    if (USE_DATAVERSE) {
      window.location.href = '/Account/Login/LogOff?returnUrl=%2F'
    } else {
      setAuth('anonymous')
    }
  }, [])
  useIdleTimer(15 * 60 * 1000, handleIdle, auth === 'authenticated')

  const navigate = (next) => {
    setView(next)
    setSearch('') // nouvelle page → on repart d'une recherche vide
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
        <Topbar
          view={view}
          onMenu={() => setMenuOpen((o) => !o)}
          onNotify={notify}
          profile={profile}
          search={search}
          onSearch={setSearch}
          entreprises={entreprises}
          entrepriseActive={entrepriseActive}
          onChangerEntreprise={changerEntreprise}
        />

        {view === 'espace' && <MonEspace onNavigate={navigate} notify={notify} />}
        {view === 'onboarding' && <Onboarding notify={notify} />}
        {view === 'questionnaires' && <Questionnaires notify={notify} search={search} />}
        {view === 'ubo' && <UBO notify={notify} search={search} />}
        {view === 'evaluations' && <Evaluations notify={notify} search={search} />}
        {view === 'documents' && <Documents notify={notify} search={search} />}
        {view === 'documents-recus' && <DocumentsRecus notify={notify} search={search} />}
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
