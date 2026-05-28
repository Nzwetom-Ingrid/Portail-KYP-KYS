import { useEffect, useState } from 'react'
import Icon from '../components/Icon'
import {
  getCurrentTiers,
  loadAssignedQuestionnaires,
  loadDocuments,
  loadDossier,
} from '../services/portal'

const STEPS = [
  { label: 'Création du compte', meta: 'Terminé', state: 'done' },
  { label: 'Informations entreprise', meta: 'Terminé', state: 'done' },
  { label: 'Questionnaire KYP', meta: 'En cours', state: 'current' },
  { label: 'Dépôt des documents', meta: '3 / 7', state: 'current' },
  { label: 'Validation conformité', meta: 'À venir', state: '' },
]

const ACTIVITY = [
  { icon: 'check', tone: 'success', title: 'Document validé', text: 'Registre de commerce approuvé par la conformité.', time: 'Il y a 2 h' },
  { icon: 'upload', tone: 'info', title: 'Document déposé', text: 'Attestation fiscale 2025 ajoutée à votre dossier.', time: 'Hier, 16:40' },
  { icon: 'clipboard', tone: 'brand', title: 'Questionnaire mis à jour', text: 'Lutte anti-blanchiment — 8 réponses enregistrées.', time: 'Hier, 11:12' },
  { icon: 'alert', tone: 'warning', title: 'Action requise', text: 'Pièce d’identité du représentant à renouveler.', time: '20 mai 2026' },
]

export default function MonEspace({ onNavigate, notify }) {
  const [data, setData] = useState({
    progress: 0,
    docsTotal: 0,
    docsValid: 0,
    docsRecent: 0,
    qInProgress: 0,
    firstName: 'Alexis',
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
        setData({
          progress: dossier?.afb_taux_complet ?? 0,
          docsTotal: docs.length,
          docsValid: validDocs.length,
          docsRecent: recentDocs.length,
          qInProgress: qs.filter((q) => q.afb_statut === 'EnCours' || q.afb_statut === 'AFaire').length,
          firstName: (t.afb_nom || 'Partenaire').split(' ')[0],
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
            <Icon name="sparkles" size={16} /> Bienvenue, {data.firstName}
          </span>
          <h2>Votre dossier KYP est complété à {data.progress} %</h2>
          <p>
            Plus que quelques étapes pour finaliser votre conformité. Complétez votre
            questionnaire en cours et déposez les pièces manquantes.
          </p>
        </div>
        <div className="hero-banner__actions">
          <button className="btn btn--light" onClick={() => onNavigate('onboarding')}>
            <Icon name="rocket" size={18} /> Reprendre l’onboarding
          </button>
          <button className="btn btn--ghost" onClick={() => onNavigate('documents')}>
            <Icon name="upload" size={18} /> Déposer un document
          </button>
        </div>
      </div>

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
              <div className="stat__label">{s.label}</div>
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
                <h2>Progression de votre dossier</h2>
                <p>Suivi de votre parcours d’onboarding KYP</p>
              </div>
              <button className="link-btn" onClick={() => onNavigate('onboarding')}>
                Continuer <Icon name="arrowRight" size={16} />
              </button>
            </div>
            <div className="progress-card">
              <div className="ring" style={{ '--val': data.progress }}>
                <div className="ring__inner">
                  <b>{data.progress}%</b>
                  <span>complété</span>
                </div>
              </div>
              <div className="progress-steps">
                {STEPS.map((step) => (
                  <div key={step.label} className={`progress-step ${step.state}`}>
                    <span className="progress-step__mark">
                      {step.state === 'done' ? <Icon name="check" size={14} /> : ''}
                    </span>
                    <span>{step.label}</span>
                    <span className="progress-step__meta">{step.meta}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions rapides */}
          <div className="card card--pad">
            <div className="section-head">
              <h2>Actions rapides</h2>
            </div>
            <div className="quick-actions">
              <button className="quick-action" onClick={() => onNavigate('questionnaires')}>
                <span className="quick-action__icon"><Icon name="clipboard" size={20} /></span>
                <span>
                  <strong>Compléter un questionnaire</strong>
                  <span>3 formulaires en attente</span>
                </span>
              </button>
              <button className="quick-action" onClick={() => onNavigate('documents')}>
                <span className="quick-action__icon"><Icon name="upload" size={20} /></span>
                <span>
                  <strong>Déposer un document</strong>
                  <span>4 pièces manquantes</span>
                </span>
              </button>
              <button className="quick-action" onClick={() => onNavigate('onboarding')}>
                <span className="quick-action__icon"><Icon name="rocket" size={20} /></span>
                <span>
                  <strong>Reprendre l’onboarding</strong>
                  <span>Étape 3 sur 5</span>
                </span>
              </button>
              <button className="quick-action" onClick={() => notify('Demande envoyée au service conformité.')}>
                <span className="quick-action__icon"><Icon name="handshake" size={20} /></span>
                <span>
                  <strong>Demander une revue</strong>
                  <span>Contacter la conformité</span>
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Activité récente */}
        <div className="card card--pad">
          <div className="section-head">
            <div>
              <h2>Activité récente</h2>
            </div>
            <button className="link-btn" onClick={() => notify('Historique complet bientôt disponible.')}>
              Tout voir
            </button>
          </div>
          <div className="timeline">
            {ACTIVITY.map((a, i) => (
              <div className="timeline__item" key={i}>
                <span className={`timeline__dot stat__icon--${a.tone}`}>
                  <Icon name={a.icon} size={18} />
                </span>
                <div className="timeline__body">
                  <strong>{a.title}</strong>
                  <p>{a.text}</p>
                  <div className="timeline__time">{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
