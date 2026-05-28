import { useEffect, useMemo, useState } from 'react'
import Icon from '../components/Icon'
import {
  getCurrentTiers,
  loadAssignedQuestionnaires,
  loadQuestionnaireQuestions,
  submitQuestionnaireResponse,
} from '../services/portal'

const STATUS = {
  AFaire:    { label: 'À compléter', cls: 'badge--warning' },
  EnCours:   { label: 'En cours',    cls: 'badge--info' },
  Soumis:    { label: 'Soumis',      cls: 'badge--brand' },
  Valide:    { label: 'Validé',      cls: 'badge--success' },
}

const FILTERS = [
  { id: 'all',     label: 'Tous' },
  { id: 'AFaire',  label: 'À compléter' },
  { id: 'EnCours', label: 'En cours' },
  { id: 'Soumis',  label: 'Soumis' },
  { id: 'Valide',  label: 'Validés' },
]

export default function Questionnaires({ notify }) {
  const [tiers, setTiers] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')

  // Détail ouvert
  const [active, setActive] = useState(null)
  const [activeQuestions, setActiveQuestions] = useState([])
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const t = await getCurrentTiers()
        if (cancelled) return
        setTiers(t)
        if (t?.afb_tiersid) {
          const data = await loadAssignedQuestionnaires(t.afb_tiersid)
          if (!cancelled) setItems(data)
        }
      } catch (e) {
        if (!cancelled) setError(e.message || String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const counts = useMemo(() => {
    const c = { all: items.length }
    for (const d of items) c[d.afb_statut] = (c[d.afb_statut] || 0) + 1
    return c
  }, [items])

  const list = filter === 'all' ? items : items.filter((d) => d.afb_statut === filter)

  const openQ = async (q) => {
    setActive(q)
    setAnswers({})
    setLoadingQuestions(true)
    try {
      const qs = await loadQuestionnaireQuestions(q.afb_questionnaireid)
      setActiveQuestions(qs)
    } catch (e) {
      notify(`Impossible de charger les questions : ${e.message}`)
    } finally {
      setLoadingQuestions(false)
    }
  }

  const submitQ = async () => {
    if (!active?.afb_assignmentid && !active?.afb_questionnaireid) return
    setSubmitting(true)
    try {
      await submitQuestionnaireResponse(active.afb_assignmentid || active.afb_questionnaireid, answers)
      notify(`« ${active.afb_intitule} » enregistré.`)
      setItems((prev) => prev.map((x) =>
        x.afb_assignmentid === active.afb_assignmentid
          ? { ...x, afb_statut: 'Soumis', afb_progression: 100 }
          : x
      ))
      setActive(null)
    } catch (e) {
      notify(`Soumission impossible : ${e.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <div className="section-head">
        <div className="tabs">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={`tab ${filter === f.id ? 'is-active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              <span className="tab__count">{counts[f.id] || 0}</span>
            </button>
          ))}
        </div>
        <button className="btn btn--ghost btn--sm" onClick={() => notify('Export PDF en préparation.')}>
          <Icon name="download" size={16} /> Exporter
        </button>
      </div>

      {loading ? (
        <div className="card empty">
          <div className="empty__icon"><Icon name="clock" size={28} /></div>
          <p>Chargement de vos questionnaires…</p>
        </div>
      ) : error ? (
        <div className="card empty">
          <div className="empty__icon"><Icon name="alert" size={28} /></div>
          <h3 style={{ color: 'var(--ink)' }}>Connexion Dataverse impossible</h3>
          <p style={{ maxWidth: 480, margin: '0 auto' }}>{error}</p>
        </div>
      ) : list.length === 0 ? (
        <div className="card empty">
          <div className="empty__icon"><Icon name="clipboard" size={28} /></div>
          <h3 style={{ color: 'var(--ink)' }}>Aucun questionnaire</h3>
          <p>Aucun questionnaire ne correspond à ce filtre.</p>
        </div>
      ) : (
        <div className="grid grid--cards">
          {list.map((q) => {
            const st = STATUS[q.afb_statut] || STATUS.AFaire
            const deadline = q.afb_echeance
              ? new Date(q.afb_echeance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
              : '—'
            return (
              <div className="card q-card" key={q.afb_assignmentid || q.afb_questionnaireid}>
                <div className="q-card__head">
                  <div style={{ display: 'flex', gap: 12 }}>
                    <span className="q-card__icon"><Icon name="clipboard" size={22} /></span>
                    <div>
                      <h3>{q.afb_intitule}</h3>
                      <div className="q-card__sub">{q.afb_sous_titre}</div>
                    </div>
                  </div>
                  <span className={`badge ${st.cls}`}><span className="dot-i" /> {st.label}</span>
                </div>

                <div className="q-meta">
                  <span><Icon name="fileText" size={15} /> {q.afb_nb_questions || '—'} questions</span>
                  <span><Icon name="calendar" size={15} /> {deadline}</span>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6, color: 'var(--muted)' }}>
                    <span>Progression</span><span>{q.afb_progression || 0}%</span>
                  </div>
                  <div className="bar"><i style={{ width: `${q.afb_progression || 0}%` }} /></div>
                </div>

                <div className="q-card__foot">
                  <small>Échéance : {deadline}</small>
                  {q.afb_statut === 'Valide' ? (
                    <button className="btn btn--soft btn--sm" onClick={() => notify('Questionnaire validé — consultation seule.')}>
                      <Icon name="eye" size={15} /> Consulter
                    </button>
                  ) : q.afb_statut === 'Soumis' ? (
                    <button className="btn btn--ghost btn--sm" onClick={() => openQ(q)}>
                      <Icon name="eye" size={15} /> Voir les réponses
                    </button>
                  ) : (
                    <button className="btn btn--primary btn--sm" onClick={() => openQ(q)}>
                      {q.afb_progression > 0 ? 'Continuer' : 'Commencer'} <Icon name="arrowRight" size={15} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal questionnaire */}
      {active && (
        <div className="modal-overlay" onClick={() => setActive(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__head">
              <div>
                <h3>{active.afb_intitule}</h3>
                <p>{active.afb_sous_titre} · {activeQuestions.length || active.afb_nb_questions || '—'} questions</p>
              </div>
              <button className="icon-btn" onClick={() => setActive(null)} aria-label="Fermer">
                <Icon name="close" size={18} />
              </button>
            </div>
            <div className="modal__body">
              {loadingQuestions ? (
                <div className="empty">
                  <div className="empty__icon"><Icon name="clock" size={24} /></div>
                  <p>Chargement des questions…</p>
                </div>
              ) : activeQuestions.length === 0 ? (
                <div className="empty">
                  <p>Aucune question disponible.</p>
                </div>
              ) : (
                activeQuestions.map((item, i) => (
                  <div className="q-question" key={item.afb_questionid || i}>
                    <div className="q-question__label">{i + 1}. {item.afb_libelle}</div>
                    <div className="q-options">
                      {(item.options || []).map((opt) => (
                        <button
                          key={opt}
                          className={`q-option ${answers[item.afb_questionid] === opt ? 'is-selected' : ''}`}
                          onClick={() => setAnswers((a) => ({ ...a, [item.afb_questionid]: opt }))}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="modal__foot">
              <small style={{ color: 'var(--muted)' }}>
                {Object.keys(answers).length} / {activeQuestions.length} répondues
              </small>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn--ghost btn--sm" onClick={() => { notify('Brouillon enregistré.'); setActive(null) }}>
                  Enregistrer le brouillon
                </button>
                <button
                  className="btn btn--primary btn--sm"
                  onClick={submitQ}
                  disabled={submitting || Object.keys(answers).length === 0}
                >
                  <Icon name="check" size={16} /> {submitting ? 'Envoi…' : 'Soumettre'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
