import { useEffect, useMemo, useState } from 'react'
import Icon from '../components/Icon'
import { useT } from '../i18n/i18n'
import { useRafraichissementAuto } from '../hooks/useRafraichissementAuto'
import {
  getCurrentTiers,
  loadAssignedQuestionnaires,
  loadQuestionnaireQuestions,
  submitQuestionnaireResponse,
  saveQuestionnaireDraft,
  loadQuestionnaireDraftAnswers,
} from '../services/portal'
import { filterBySearch } from '../utils/search'

const STATUS = {
  AFaire:    { label: 'À compléter', cls: 'badge--warning' },
  EnCours:   { label: 'En cours',    cls: 'badge--info' },
  Soumis:    { label: 'Soumis',      cls: 'badge--brand' },
  Valide:    { label: 'Validé',      cls: 'badge--success' },
  Rejete:    { label: 'Rejeté',      cls: 'badge--danger' },
}

const FILTERS = [
  { id: 'all',     label: 'Tous' },
  { id: 'AFaire',  label: 'À compléter' },
  { id: 'EnCours', label: 'En cours' },
  { id: 'Soumis',  label: 'Soumis' },
  { id: 'Valide',  label: 'Validés' },
  { id: 'Rejete',  label: 'Rejetés' },
]

// Une réponse est considérée « répondue » si elle a un contenu non vide.
const isAnswered = (v) => v != null && String(v).trim().length > 0

// Question de type liste/tableau → détectée par le type TABLEAU ou un libellé « Liste … ».
const isListQuestion = (item) =>
  item.afb_type === 'TABLEAU' || /\bliste\b/i.test(item.afb_libelle || '')

// Saisie multi-lignes pour les réponses de type liste (une ligne = un élément).
// La valeur est stockée en texte (lignes jointes par des sauts de ligne).
function ListAnswer({ value, onChange, inputStyle }) {
  const { t } = useT()
  const rows = value ? String(value).split('\n') : ['']
  const safe = rows.length ? rows : ['']
  const update = (arr) => onChange((arr.length ? arr : ['']).join('\n'))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {safe.map((r, idx) => (
        <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ minWidth: 22, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>{idx + 1}.</span>
          <input
            style={{ ...inputStyle, flex: 1 }}
            value={r}
            onChange={(e) => { const a = [...safe]; a[idx] = e.target.value; update(a) }}
            placeholder={`${t('Élément')} ${idx + 1}`}
          />
          {safe.length > 1 && (
            <button
              type="button"
              className="icon-btn"
              title="Retirer"
              onClick={() => update(safe.filter((_, i) => i !== idx))}
            >
              <Icon name="close" size={15} />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        className="btn btn--soft btn--sm"
        style={{ width: 'auto', alignSelf: 'flex-start' }}
        onClick={() => update([...safe, ''])}
      >
        <Icon name="plus" size={14} /> {t('Ajouter une ligne')}
      </button>
    </div>
  )
}

export default function Questionnaires({ notify, search = '' }) {
  const { t } = useT()
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

  // Rafraîchissement automatique : l'écran se remet à jour au retour sur
  // l'onglet et tant qu'il reste visible, au lieu d'attendre un rechargement
  // manuel. Rejouer l'effet de chargement suffit — sa fonction de nettoyage
  // gère déjà les lectures qui se croisent.
  // Suspendu tant qu'un questionnaire est ouvert : recharger la liste sous
  // quelqu'un en train de répondre lui ferait perdre le fil.
  const [tickRafraichissement, setTickRafraichissement] = useState(0)
  useRafraichissementAuto(() => setTickRafraichissement((v) => v + 1), { actif: !active })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // Seul le premier chargement affiche l'écran d'attente : une relecture
      // automatique doit passer inaperçue, sinon l'écran clignote chaque minute.
      if (tickRafraichissement === 0) setLoading(true)
      try {
        const t = await getCurrentTiers()
        if (cancelled) return
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
  }, [tickRafraichissement])

  const counts = useMemo(() => {
    const c = { all: items.length }
    for (const d of items) c[d.afb_statut] = (c[d.afb_statut] || 0) + 1
    return c
  }, [items])

  const byStatus = filter === 'all' ? items : items.filter((d) => d.afb_statut === filter)
  // Recherche sur tout ce qui est visible sur la carte : on cherche aussi un
  // questionnaire par son code ou par son statut (« à compléter »).
  const list = filterBySearch(byStatus, search, (d) => [
    d.afb_intitule,
    d.afb_sous_titre,
    d.afb_code,
    STATUS[d.afb_statut]?.label,
  ])

  const openQ = async (q) => {
    setActive(q)
    setAnswers({})
    setLoadingQuestions(true)
    try {
      const [qs, draft] = await Promise.all([
        loadQuestionnaireQuestions(q.afb_questionnaireid),
        q.afb_assignmentid ? loadQuestionnaireDraftAnswers(q.afb_assignmentid).catch(() => ({})) : Promise.resolve({}),
      ])
      setActiveQuestions(qs)
      if (draft && Object.keys(draft).length) setAnswers(draft)
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

  // Enregistre les réponses en brouillon (persistées) + met à jour la progression.
  const saveDraft = async () => {
    if (!active?.afb_assignmentid) { notify('Le brouillon sera disponible une fois le questionnaire affecté.'); return }
    setSubmitting(true)
    try {
      const { progression } = await saveQuestionnaireDraft(active.afb_assignmentid, answers, activeQuestions.length)
      setItems((prev) => prev.map((x) =>
        x.afb_assignmentid === active.afb_assignmentid
          ? { ...x, afb_statut: x.afb_statut === 'Soumis' ? x.afb_statut : 'EnCours', afb_progression: progression }
          : x
      ))
      notify(`Brouillon enregistré — progression ${progression}%.`)
      setActive(null)
    } catch (e) {
      notify(`Enregistrement du brouillon impossible : ${e.message}`)
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
              {t(f.label)}
              <span className="tab__count">{counts[f.id] || 0}</span>
            </button>
          ))}
        </div>
        <button className="btn btn--ghost btn--sm" onClick={() => notify(t('Export PDF en préparation.'))}>
          <Icon name="download" size={16} /> {t('Exporter')}
        </button>
      </div>

      {loading ? (
        <div className="card empty">
          <div className="empty__icon"><Icon name="clock" size={28} /></div>
          <p>{t('Chargement de vos questionnaires…')}</p>
        </div>
      ) : error ? (
        <div className="card empty">
          <div className="empty__icon"><Icon name="alert" size={28} /></div>
          <h3 style={{ color: 'var(--ink)' }}>{t('Connexion Dataverse impossible')}</h3>
          <p style={{ maxWidth: 480, margin: '0 auto' }}>{error}</p>
        </div>
      ) : list.length === 0 ? (
        <div className="card empty">
          <div className="empty__icon"><Icon name="clipboard" size={28} /></div>
          <h3 style={{ color: 'var(--ink)' }}>{t('Aucun questionnaire')}</h3>
          <p>{t('Aucun questionnaire ne correspond à ce filtre.')}</p>
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
                  <span className={`badge ${st.cls}`}><span className="dot-i" /> {t(st.label)}</span>
                </div>

                <div className="q-meta">
                  <span><Icon name="fileText" size={15} /> {q.afb_nb_questions || '—'} {t('questions')}</span>
                  <span><Icon name="calendar" size={15} /> {deadline}</span>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6, color: 'var(--muted)' }}>
                    <span>{t('Progression')}</span><span>{q.afb_progression || 0}%</span>
                  </div>
                  <div className="bar">
                    <i
                      style={{
                        width: `${q.afb_progression || 0}%`,
                        ...(q.afb_progression >= 100 || q.afb_statut === 'Soumis' || q.afb_statut === 'Valide'
                          ? { background: 'var(--success, #1d9d6f)' }
                          : {}),
                      }}
                    />
                  </div>
                </div>

                <div className="q-card__foot">
                  <small>{t('Échéance :')} {deadline}</small>
                  {q.afb_statut === 'Valide' ? (
                    <button className="btn btn--soft btn--sm" onClick={() => notify(t('Questionnaire validé — consultation seule.'))}>
                      <Icon name="eye" size={15} /> {t('Consulter')}
                    </button>
                  ) : q.afb_statut === 'Soumis' ? (
                    <button className="btn btn--ghost btn--sm" onClick={() => openQ(q)}>
                      <Icon name="eye" size={15} /> {t('Voir les réponses')}
                    </button>
                  ) : (
                    <button className="btn btn--primary btn--sm" onClick={() => openQ(q)}>
                      {q.afb_progression > 0 ? t('Continuer') : t('Commencer')} <Icon name="arrowRight" size={15} />
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
                <p>{active.afb_sous_titre} · {activeQuestions.length || active.afb_nb_questions || '—'} {t('questions')}</p>
              </div>
              <button className="icon-btn" onClick={() => setActive(null)} aria-label="Fermer">
                <Icon name="close" size={18} />
              </button>
            </div>
            <div className="modal__body">
              {loadingQuestions ? (
                <div className="empty">
                  <div className="empty__icon"><Icon name="clock" size={24} /></div>
                  <p>{t('Chargement des questions…')}</p>
                </div>
              ) : activeQuestions.length === 0 ? (
                <div className="empty">
                  <p>{t('Aucune question disponible.')}</p>
                </div>
              ) : (
                activeQuestions.map((item, i) => {
                  const qid = item.afb_questionid
                  const val = answers[qid] ?? ''
                  const setVal = (v) => setAnswers((a) => ({ ...a, [qid]: v }))
                  const type = item.afb_type
                  // Options depuis la base ; à défaut, options intégrées pour Oui/Non et Statut.
                  const opts =
                    item.options && item.options.length
                      ? item.options
                      : type === 'OUI_NON'
                        ? ['Oui', 'Non']
                        : type === 'STATUT'
                          ? ['C', 'PC', 'NC', 'NA']
                          : null
                  const inputStyle = {
                    width: '100%', padding: '9px 12px', borderRadius: 8, font: 'inherit',
                    border: '1px solid var(--line, #d4d8de)', background: 'var(--surface, #fff)', color: 'inherit',
                  }
                  return (
                    <div className="q-question" key={qid || i}>
                      <div className="q-question__label">
                        {i + 1}. {item.afb_libelle}
                        {item.afb_obligatoire ? <span style={{ color: 'var(--danger, #c8102e)' }}> *</span> : null}
                      </div>
                      {opts ? (
                        <div className="q-options">
                          {opts.map((opt) => (
                            <button
                              key={opt}
                              className={`q-option ${val === opt ? 'is-selected' : ''}`}
                              onClick={() => setVal(opt)}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      ) : isListQuestion(item) ? (
                        <ListAnswer value={val} onChange={setVal} inputStyle={inputStyle} />
                      ) : type === 'TEXTE_LONG' ? (
                        <textarea
                          style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
                          value={val}
                          onChange={(e) => setVal(e.target.value)}
                          placeholder={t('Votre réponse…')}
                        />
                      ) : type === 'NUMERIQUE' ? (
                        <input style={inputStyle} type="number" value={val} onChange={(e) => setVal(e.target.value)} placeholder="0" />
                      ) : type === 'DATE' ? (
                        <input style={inputStyle} type="date" value={val} onChange={(e) => setVal(e.target.value)} />
                      ) : (
                        <input style={inputStyle} type="text" value={val} onChange={(e) => setVal(e.target.value)} placeholder={t('Votre réponse…')} />
                      )}
                    </div>
                  )
                })
              )}
            </div>
            {(() => {
              const answeredCount = activeQuestions.filter((q) => isAnswered(answers[q.afb_questionid])).length
              const allAnswered = activeQuestions.length > 0 && answeredCount === activeQuestions.length
              return (
                <div className="modal__foot">
                  <small style={{ color: allAnswered ? 'var(--success, #1d9d6f)' : 'var(--muted)' }}>
                    {answeredCount} / {activeQuestions.length} {t('répondues')}
                    {!allAnswered && activeQuestions.length > 0
                      ? ` — ${t('répondez à toutes les questions pour soumettre')}`
                      : ''}
                  </small>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn--ghost btn--sm" onClick={saveDraft} disabled={submitting}>
                      {t('Enregistrer le brouillon')}
                    </button>
                    <button
                      className="btn btn--primary btn--sm"
                      onClick={submitQ}
                      disabled={submitting || !allAnswered}
                      title={!allAnswered ? t('Toutes les questions doivent être répondues') : undefined}
                    >
                      <Icon name="check" size={16} /> {submitting ? t('Envoi…') : t('Soumettre')}
                    </button>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
