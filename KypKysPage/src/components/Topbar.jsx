import Icon from './Icon'
import logo from '../assets/afriland-logo.jpg'
import { useT } from '../i18n/i18n'

const TITLES = {
  espace: { title: 'Mon espace', sub: 'Vue d’ensemble de votre dossier de conformité' },
  onboarding: { title: 'Onboarding KYP / KYS', sub: 'Complétez votre dossier en quelques étapes' },
  questionnaires: { title: 'Mes questionnaires', sub: 'Suivez et complétez vos formulaires de conformité' },
  ubo: { title: 'Mes bénéficiaires', sub: 'Déclarez les bénéficiaires effectifs de votre entité' },
  evaluations: { title: 'Mes évaluations', sub: 'Consultez les évaluations publiées par la conformité' },
  documents: { title: 'Mes documents', sub: 'Déposez et gérez vos pièces justificatives' },
  'documents-recus': { title: 'Documents reçus', sub: 'Documents partagés avec vous par Afriland First Bank' },
}

// Vues portant une liste filtrable par la recherche globale.
const SEARCHABLE_VIEWS = ['documents', 'documents-recus', 'ubo', 'evaluations', 'questionnaires']

export default function Topbar({
  view,
  onMenu,
  onNotify,
  profile,
  search = '',
  onSearch,
  entreprises = [],
  entrepriseActive = null,
  onChangerEntreprise,
}) {
  const { t, lang, setLang } = useT()
  const meta = TITLES[view] ?? TITLES.espace
  const searchable = SEARCHABLE_VIEWS.includes(view)
  const name = profile?.name || t('Partenaire')
  const subtitle = profile?.subtitle || t('Partenaire')
  const initials = profile?.initials || 'P'
  return (
    <header className="topbar">
      <button type="button" className="icon-btn menu-toggle" onClick={onMenu} aria-label="Menu">
        <Icon name="menu" />
      </button>

      <img src={logo} alt="Afriland First Bank" className="topbar__logo" />

      <div className="topbar__title">
        <h1>{t(meta.title)}</h1>
        <p>{t(meta.sub)}</p>
      </div>

      {searchable && (
        <label className="topbar__search">
          <Icon name="search" size={18} />
          <input
            type="search"
            placeholder={t('Rechercher dans cette page…')}
            value={search}
            onChange={(e) => onSearch?.(e.target.value)}
          />
        </label>
      )}

      {/* Groupe d'actions : toujours collé à droite (même quand la recherche
          est masquée sur Mon espace / Onboarding — sans ça, ces éléments
          se recollaient au titre). */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>

      {/* Sélecteur d'entreprise — n'apparaît que si l'utilisateur en suit
          plusieurs. Pour l'immense majorité des partenaires, rattachés à une
          seule société, l'en-tête reste inchangé. */}
      {entreprises.length > 1 && (
        <label className="field" style={{ margin: 0, minWidth: 190 }}>
          <select
            value={entrepriseActive ?? ''}
            onChange={(e) => onChangerEntreprise?.(e.target.value)}
            aria-label={t('Entreprise active')}
            style={{ height: 36, fontSize: 13 }}
          >
            {entreprises.map((e) => (
              <option key={e.afb_tiersid} value={e.afb_tiersid}>
                {e.afb_nom} · {e.afb_type}
              </option>
            ))}
          </select>
        </label>
      )}


      {/* Sélecteur de langue FR / EN */}
      <div
        style={{
          display: 'inline-flex',
          border: '1px solid var(--line, #d4d8de)',
          borderRadius: 8,
          overflow: 'hidden',
          fontSize: 12.5,
          fontWeight: 700,
        }}
      >
        {['fr', 'en'].map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            aria-pressed={lang === l}
            style={{
              padding: '6px 10px',
              border: 'none',
              cursor: 'pointer',
              background: lang === l ? 'var(--brand-600, #c8102e)' : 'transparent',
              color: lang === l ? '#fff' : 'var(--muted, #6b7280)',
            }}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="icon-btn"
        aria-label="Notifications"
        onClick={() => onNotify?.(t('Vous avez 2 nouvelles notifications.'))}
      >
        <Icon name="bell" />
        <span className="dot" />
      </button>

      <button type="button" className="avatar">
        <span className="avatar__img">{initials}</span>
        <span className="avatar__meta">
          <strong>{name}</strong>
          <span>{subtitle}</span>
        </span>
      </button>

      </div>
    </header>
  )
}
