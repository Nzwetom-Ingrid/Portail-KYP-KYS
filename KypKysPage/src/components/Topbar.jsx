import Icon from './Icon'
import logo from '../assets/afriland-logo.jpg'

const TITLES = {
  espace: { title: 'Mon espace', sub: 'Vue d’ensemble de votre dossier de conformité' },
  onboarding: { title: 'Onboarding KYP / KYS', sub: 'Complétez votre dossier en quelques étapes' },
  questionnaires: { title: 'Mes questionnaires', sub: 'Suivez et complétez vos formulaires de conformité' },
  documents: { title: 'Mes documents', sub: 'Déposez et gérez vos pièces justificatives' },
}

export default function Topbar({ view, onMenu, onNotify }) {
  const meta = TITLES[view] ?? TITLES.espace
  return (
    <header className="topbar">
      <button type="button" className="icon-btn menu-toggle" onClick={onMenu} aria-label="Menu">
        <Icon name="menu" />
      </button>

      <img src={logo} alt="Afriland First Bank" className="topbar__logo" />

      <div className="topbar__title">
        <h1>{meta.title}</h1>
        <p>{meta.sub}</p>
      </div>

      <label className="topbar__search">
        <Icon name="search" size={18} />
        <input type="search" placeholder="Rechercher un document, un questionnaire…" />
      </label>

      <button
        type="button"
        className="icon-btn"
        aria-label="Notifications"
        onClick={() => onNotify?.('Vous avez 2 nouvelles notifications.')}
      >
        <Icon name="bell" />
        <span className="dot" />
      </button>

      <button type="button" className="avatar">
        <span className="avatar__img">AE</span>
        <span className="avatar__meta">
          <strong>Alexis Ella</strong>
          <span>Partenaire · KYP</span>
        </span>
      </button>
    </header>
  )
}
