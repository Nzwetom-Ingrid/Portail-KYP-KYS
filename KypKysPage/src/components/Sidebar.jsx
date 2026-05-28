import Icon from './Icon'
import logo from '../assets/afriland-logo.jpg'

const NAV = [
  { id: 'espace', label: 'Mon espace', icon: 'grid' },
  { id: 'onboarding', label: 'Onboarding KYP / KYS', icon: 'rocket' },
  { id: 'questionnaires', label: 'Mes questionnaires', icon: 'clipboard', badge: '3' },
  { id: 'documents', label: 'Mes documents', icon: 'folder' },
]

export default function Sidebar({ view, onNavigate, isOpen, onClose }) {
  return (
    <aside className={`sidebar ${isOpen ? 'is-open' : ''}`}>
      <div className="brand">
        <div className="brand__logo-wrap">
          <img src={logo} alt="Afriland First Bank" />
        </div>
        <div className="brand__tag">KYP / KYS · Connect</div>
      </div>

      <nav className="nav">
        <div className="nav__label">Navigation</div>
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav__item ${view === item.id ? 'is-active' : ''}`}
            onClick={() => {
              onNavigate(item.id)
              onClose?.()
            }}
          >
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
            {item.badge && <span className="nav__badge">{item.badge}</span>}
          </button>
        ))}

        <div className="nav__label">Compte</div>
        <button type="button" className="nav__item">
          <Icon name="settings" size={20} />
          <span>Paramètres</span>
        </button>
        <button type="button" className="nav__item">
          <Icon name="logout" size={20} />
          <span>Déconnexion</span>
        </button>
      </nav>

      <div className="sidebar__card">
        <h4>Besoin d'aide ?</h4>
        <p>Notre équipe conformité vous accompagne dans votre onboarding.</p>
        <button type="button" className="btn btn--primary btn--sm btn--block">
          <Icon name="phone" size={16} /> Contacter un conseiller
        </button>
      </div>
    </aside>
  )
}
