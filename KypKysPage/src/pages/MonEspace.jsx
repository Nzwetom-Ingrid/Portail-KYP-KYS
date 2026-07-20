import { useEffect, useState } from 'react'
import Icon from '../components/Icon'
import { useT } from '../i18n/i18n'
import {
  getCurrentTiers,
  loadAssignedQuestionnaires,
  loadDocuments,
  loadDossier,
} from '../services/portal'

const DEFAULT_STEPS = [
  { label: 'Création du compte', meta: 'Terminé', state: 'done' },
  { label: 'Informations entreprise', meta: '—', state: '' },
  { label: 'Questionnaires', meta: '—', state: '' },
  { label: 'Dépôt des documents', meta: '—', state: '' },
  { label: 'Validation conformité', meta: 'À venir', state: '' },
]

function frDate(value) {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR')
}

export default function MonEspace({ onNavigate, notify }) {
  const { t } = useT()
  const [data, setData] = useState({
    progress: 0,
    docsTotal: 0,
    docsValid: 0,
    docsRecent: 0,
    qInProgress: 0,
    firstName: 'Partenaire',
    steps: DEFAULT_STEPS,
    activity: [],
    decision: null,
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const t = await getCurrentTiers()
        if (!t?.afb_tiersid) return
        const [dossier, docs, qs] = await Promise.all([
          loadDossier(t.afb_tiersid),
          loadDocuments(t.afb_tiersid),
          loadAssignedQuestionnaires(t.afb_tiersid),
        ])
        if (cancelled) return
        const validDocs = docs.filter((d) => d.afb_statutvalidite === 'Valide')
        const recentDocs = docs.filter((d) => {
          if (!d.createdon) return false
          const age = Date.now() - new Date(d.createdon).getTime()
          return age < 1000 * 60 * 60 * 24 * 30 // 30 derniers jours
        })
        // Étapes du parcours, déduites des vraies données.
        const qSubmitted = qs.filter((q) => q.afb_statut === 'Soumis' || q.afb_statut === 'Valide').length
        const infoDone = !!(t.afb_nomdupartenaire && t.afb_numerorccmimmatriculation && t.afb_pays)
        const dossierValide = /valid/i.test(dossier?.afb_statut || '')
        // « Création du compte » n'est « Terminé » que lorsque le TIERS a réellement
        // finalisé son inscription (RCCM/immatriculation renseignée — champ que la
        // banque ne pré-remplit pas à la création). Évite d'afficher « Terminé » sur
        // un compte créé par l'interne mais dont le partenaire n'a pas encore
        // commencé/soumis son onboarding.
        const compteFinalise = !!t.afb_numerorccmimmatriculation
        const steps = [
          { label: 'Création du compte', meta: compteFinalise ? 'Terminé' : 'À finaliser', state: compteFinalise ? 'done' : 'current' },
          { label: 'Informations entreprise', meta: infoDone ? 'Terminé' : 'À compléter', state: infoDone ? 'done' : 'current' },
          { label: 'Questionnaires', meta: qs.length ? `${qSubmitted} / ${qs.length} soumis` : 'Aucun affecté', state: qs.length === 0 ? '' : qSubmitted === qs.length ? 'done' : 'current' },
          { label: 'Dépôt des documents', meta: docs.length ? `${docs.length} déposé${docs.length > 1 ? 's' : ''}` : 'Aucun', state: docs.length ? (validDocs.length ? 'done' : 'current') : '' },
          { label: 'Validation conformité', meta: dossierValide ? 'Validé' : 'À venir', state: dossierValide ? 'done' : '' },
        ]

        // Complétude = part des étapes accomplies (terminée = 1, en cours = 0,5)
        // → reflète compte + infos + questionnaires + documents, pas seulement les questionnaires.
        const progress = Math.round(
          (steps.reduce((s, st) => s + (st.state === 'done' ? 1 : st.state === 'current' ? 0.5 : 0), 0) / steps.length) * 100
        )

        // Activité récente, dérivée des documents + questionnaires réels.
        const docActivity = [...docs]
          .sort((a, b) => new Date(b.createdon || 0) - new Date(a.createdon || 0))
          .slice(0, 5)
          .map((d) => {
            const valide = d.afb_statutvalidite === 'Valide'
            return {
              icon: valide ? 'check' : 'upload',
              tone: valide ? 'success' : 'info',
              title: valide ? 'Document validé' : 'Document déposé',
              text: d.afb_nomfichier || 'Pièce ajoutée à votre dossier.',
              time: frDate(d.createdon),
            }
          })
        const qActivity = qs
          .filter((q) => q.afb_statut === 'Soumis' || q.afb_statut === 'Valide')
          .map((q) => ({
            icon: 'clipboard',
            tone: 'brand',
            title: q.afb_statut === 'Valide' ? 'Questionnaire validé' : 'Questionnaire soumis',
            text: q.afb_intitule || 'Questionnaire',
            time: q.afb_echeance ? `échéance ${frDate(q.afb_echeance)}` : '',
          }))
        const activity = [...docActivity, ...qActivity].slice(0, 6)

        setData({
          progress,
          docsTotal: docs.length,
          docsValid: validDocs.length,
          docsRecent: recentDocs.length,
          qInProgress: qs.filter((q) => q.afb_statut === 'EnCours' || q.afb_statut === 'AFaire').length,
          firstName: (t.afb_nom || 'Partenaire').split(' ')[0],
          steps,
          activity,
          decision: dossier
            ? { code: dossier.afb_statutcode, label: dossier.afb_statut, comment: dossier.afb_commentaire_dconf }
            : null,
        })
      } catch (e) {
        // Silencieux : on garde les valeurs par défaut (0) en cas d'erreur
        console.warn('MonEspace: chargement des compteurs impossible —', e.message)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const STATS = [
    { icon: 'shield',    tone: 'brand',   value: `${data.progress}%`,            label: 'Dossier de conformité',     trend: null },
    { icon: 'clipboard', tone: 'info',    value: String(data.qInProgress),       label: 'Questionnaires en cours',   trend: null },
    { icon: 'folder',    tone: 'gold',    value: String(data.docsTotal),         label: 'Documents déposés',         trend: data.docsRecent ? `+${data.docsRecent} récents` : null },
    { icon: 'check',     tone: 'success', value: String(data.docsValid),         label: 'Pièces validées',           trend: null },
  ]

  return (
    <div className="page">
      {/* Bannière de bienvenue */}
      <div className="hero-banner">
        <div className="hero-banner__text">
          <span className="hero-banner__eyebrow">
            <Icon name="sparkles" size={16} /> {t('Bienvenue')}, {data.firstName}
          </span>
          <h2>{t('Votre dossier KYP est complété à')} {data.progress} %</h2>
          <p>
            {t('Plus que quelques étapes pour finaliser votre conformité. Complétez votre questionnaire en cours et déposez les pièces manquantes.')}
          </p>
        </div>
        <div className="hero-banner__actions">
          <button className="btn btn--light" onClick={() => onNavigate('onboarding')}>
            <Icon name="rocket" size={18} /> {t('Reprendre l’onboarding')}
          </button>
          <button className="btn btn--ghost" onClick={() => onNavigate('documents')}>
            <Icon name="upload" size={18} /> {t('Déposer un document')}
          </button>
        </div>
      </div>

      {/* Décision de la conformité — avis communiqué au tiers */}
      {data.decision && (() => {
        const map = {
          0:         { fg: '#16a34a', bg: 'rgba(22,163,74,.08)',  icon: 'check', title: 'Dossier validé' },
          2:         { fg: '#b45309', bg: 'rgba(180,83,9,.08)',   icon: 'alert', title: 'Complément demandé' },
          747010002: { fg: '#c8102e', bg: 'rgba(200,16,46,.08)',  icon: 'close', title: 'Dossier rejeté' },
        }
        const D = map[data.decision.code]
        if (!D) return null
        return (
          <div className="card" style={{ marginBottom: 24, borderLeft: `4px solid ${D.fg}`, background: D.bg }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <span style={{ color: D.fg, flexShrink: 0, marginTop: 2 }}><Icon name={D.icon} size={22} /></span>
              <div>
                <h3 style={{ margin: '0 0 4px', color: D.fg }}>{t(D.title)}</h3>
                <p style={{ margin: 0, color: 'var(--ink)' }}>
                  {data.decision.comment
                    ? <><b>{t('Avis de la conformité :')}</b> {data.decision.comment}</>
                    : t('La Direction de la Conformité a mis à jour le statut de votre dossier.')}
                </p>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Statistiques */}
      <div className="grid grid--stats" style={{ marginBottom: 24 }}>
        {STATS.map((s) => (
          <div key={s.label} className="card stat">
            <div className="stat__top">
              <div className={`stat__icon stat__icon--${s.tone}`}>
                <Icon name={s.icon} size={22} />
              </div>
              {s.trend && (
                <span className="stat__trend">
                  <Icon name="trendUp" size={14} /> {s.trend}
                </span>
              )}
            </div>
            <div>
              <div className="stat__value">{s.value}</div>
              <div className="stat__label">{t(s.label)}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid--2">
        {/* Progression */}
        <div>
          <div className="card card--pad" style={{ marginBottom: 20 }}>
            <div className="section-head">
              <div>
                <h2>{t('Progression de votre dossier')}</h2>
                <p>{t('Suivi de votre parcours d’onboarding KYP')}</p>
              </div>
              <button className="link-btn" onClick={() => onNavigate('onboarding')}>
                {t('Continuer')} <Icon name="arrowRight" size={16} />
              </button>
            </div>
            <div className="progress-card">
              <div className="ring" style={{ '--val': data.progress }}>
                <div className="ring__inner">
                  <b>{data.progress}%</b>
                  <span>{t('complété')}</span>
                </div>
              </div>
              <div className="progress-steps">
                {data.steps.map((step) => (
                  <div key={step.label} className={`progress-step ${step.state}`}>
                    <span className="progress-step__mark">
                      {step.state === 'done' ? <Icon name="check" size={14} /> : ''}
                    </span>
                    <span>{t(step.label)}</span>
                    <span className="progress-step__meta">{t(step.meta)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions rapides */}
          <div className="card card--pad">
            <div className="section-head">
              <h2>{t('Actions rapides')}</h2>
            </div>
            <div className="quick-actions">
              <button className="quick-action" onClick={() => onNavigate('questionnaires')}>
                <span className="quick-action__icon"><Icon name="clipboard" size={20} /></span>
                <span>
                  <strong>{t('Compléter un questionnaire')}</strong>
                  <span>{data.qInProgress} {t('formulaire(s) en attente')}</span>
                </span>
              </button>
              <button className="quick-action" onClick={() => onNavigate('documents')}>
                <span className="quick-action__icon"><Icon name="upload" size={20} /></span>
                <span>
                  <strong>{t('Déposer un document')}</strong>
                  <span>
                    {data.docsTotal
                      ? `${data.docsValid} / ${data.docsTotal} ${t('validé(s)')}`
                      : t('Ajoutez vos pièces justificatives')}
                  </span>
                </span>
              </button>
              <button className="quick-action" onClick={() => onNavigate('onboarding')}>
                <span className="quick-action__icon"><Icon name="rocket" size={20} /></span>
                <span>
                  <strong>{t('Reprendre l’onboarding')}</strong>
                  <span>
                    {t('Étape')} {Math.min(data.steps.filter((s) => s.state === 'done').length + 1, data.steps.length)} {t('sur')} {data.steps.length}
                  </span>
                </span>
              </button>
              <button className="quick-action" onClick={() => notify(t('Demande envoyée au service conformité.'))}>
                <span className="quick-action__icon"><Icon name="handshake" size={20} /></span>
                <span>
                  <strong>{t('Demander une revue')}</strong>
                  <span>{t('Contacter la conformité')}</span>
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Activité récente */}
        <div className="card card--pad">
          <div className="section-head">
            <div>
              <h2>{t('Activité récente')}</h2>
            </div>
            <button className="link-btn" onClick={() => notify(t('Historique complet bientôt disponible.'))}>
              {t('Tout voir')}
            </button>
          </div>
          <div className="timeline">
            {data.activity.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
                {t('Aucune activité pour le moment. Déposez vos pièces et complétez vos questionnaires.')}
              </p>
            ) : (
              data.activity.map((a, i) => (
                <div className="timeline__item" key={i}>
                  <span className={`timeline__dot stat__icon--${a.tone}`}>
                    <Icon name={a.icon} size={18} />
                  </span>
                  <div className="timeline__body">
                    <strong>{t(a.title)}</strong>
                    <p>{a.text}</p>
                    <div className="timeline__time">{a.time}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
