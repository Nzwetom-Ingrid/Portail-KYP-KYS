import Icon from './Icon'
import logo from '../assets/afriland-logo.jpg'
import { useT } from '../i18n/i18n'

const NAV = [
  { id: 'espace', label: 'Mon espace', icon: 'grid' },
  { id: 'onboarding', label: 'Onboarding KYP / KYS', icon: 'rocket' },
  { id: 'questionnaires', label: 'Mes questionnaires', icon: 'clipboard' },
  { id: 'ubo', label: 'Mes bénéficiaires', icon: 'user' },
  { id: 'evaluations', label: 'Mes évaluations', icon: 'trendUp' },
  { id: 'documents', label: 'Mes documents', icon: 'folder' },
  { id: 'documents-recus', label: 'Documents reçus', icon: 'download' },
]

export default function Sidebar({ view, onNavigate, isOpen, onClose }) {
  const { t } = useT()
  return (
    <aside className={`sidebar ${isOpen ? 'is-open' : ''}`}>
      <div className="brand">
        <div className="brand__logo-wrap">
          <img src={logo} alt="Afriland First Bank" />
        </div>
        <div className="brand__tag">{t('KYP / KYS · Connect')}</div>
      </div>

      <nav className="nav">
        <div className="nav__label">{t('Navigation')}</div>
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
            <span>{t(item.label)}</span>
            {item.badge && <span className="nav__badge">{item.badge}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar__card">
        <h4>{t("Besoin d'aide ?")}</h4>
        <p>{t('Notre équipe conformité vous accompagne dans votre onboarding.')}</p>
        <button type="button" className="btn btn--primary btn--sm btn--block">
          <Icon name="phone" size={16} /> {t('Contacter un conseiller')}
        </button>
      </div>
    </aside>
  )
}
