import { useEffect, useState } from 'react'
import Icon from '../components/Icon'
import { useT } from '../i18n/i18n'
import { getCurrentTiers, loadEvaluations } from '../services/portal'

// Décision de partenariat → présentation
const DECISION = {
  Maintenir:          { label: 'Partenariat maintenu', cls: 'badge--success' },
  'Sous surveillance':{ label: 'Sous surveillance',    cls: 'badge--warning' },
  Annuler:            { label: 'Partenariat annulé',   cls: 'badge--danger' },
}

const RISQUE = {
  Faible:   'badge--success',
  Modéré:   'badge--warning',
  Élevé:    'badge--danger',
  Critique: 'badge--danger',
}

const TENDANCE = {
  Amélioration:          { label: 'En amélioration', cls: 'badge--success', icon: 'trendUp' },
  Stable:                { label: 'Stable',          cls: 'badge--info',    icon: 'check' },
  Dégradation:           { label: 'En dégradation',  cls: 'badge--danger',  icon: 'alert' },
  'Première évaluation': { label: '1ʳᵉ évaluation',  cls: 'badge--info',    icon: 'sparkles' },
}

function frDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function frDateShort(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR')
}

export default function Evaluations({ search = '' }) {
  const { t } = useT()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const q = search.trim().toLowerCase()
  const shown = q
    ? items.filter((ev) => `${ev.reference || ''} ${ev.avis || ''} ${ev.risque || ''}`.toLowerCase().includes(q))
    : items

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const t = await getCurrentTiers()
        if (cancelled) return
        if (t?.afb_tiersid) {
          const data = await loadEvaluations(t.afb_tiersid)
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

  return (
    <div className="page">
      <div className="section-head">
        <div>
          <h2 style={{ margin: 0, color: 'var(--ink)', fontSize: 20 }}>{t('Mes évaluations')}</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 13.5, maxWidth: 580 }}>
            {t("Avis des directions d'Afriland First Bank sur la qualité des services de votre relation, et décision de poursuite du partenariat. Seules les évaluations finalisées vous sont communiquées.")}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="card empty">
          <div className="empty__icon"><Icon name="clock" size={28} /></div>
          <p>{t('Chargement de vos évaluations…')}</p>
        </div>
      ) : error ? (
        <div className="card empty">
          <div className="empty__icon"><Icon name="alert" size={28} /></div>
          <h3 style={{ color: 'var(--ink)' }}>{t('Connexion Dataverse impossible')}</h3>
          <p style={{ maxWidth: 480, margin: '0 auto' }}>{error}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="card empty">
          <div className="empty__icon"><Icon name="shield" size={28} /></div>
          <h3 style={{ color: 'var(--ink)' }}>{t('Aucune évaluation')}</h3>
          <p>{t("Vous n'avez pas encore d'évaluation finalisée. Elles apparaîtront ici une fois validées par la conformité.")}</p>
        </div>
      ) : shown.length === 0 ? (
        <div className="card empty">
          <div className="empty__icon"><Icon name="shield" size={28} /></div>
          <h3 style={{ color: 'var(--ink)' }}>{t('Aucun résultat')}</h3>
          <p>{t('Aucune évaluation ne correspond à votre recherche.')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {shown.map((ev) => {
            const dec = DECISION[ev.decision] || null
            const tend = TENDANCE[ev.tendance] || null
            const riskCls = RISQUE[ev.risque] || 'badge'
            return (
              <div className="card card--pad" key={ev.id}>
                {/* En-tête de l'évaluation */}
                <div className="section-head" style={{ marginBottom: 14 }}>
                  <div>
                    <strong style={{ color: 'var(--ink)', fontSize: 15 }}>
                      {t('Évaluation')} {ev.reference}
                    </strong>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                      {t('Période évaluée :')} {frDateShort(ev.periodeDebut)} → {frDateShort(ev.periodeFin)}
                      {' · '}{t('Validée le')} {frDate(ev.dateValidation)}
                    </div>
                  </div>
                  {dec && (
                    <span className={`badge ${dec.cls}`}><span className="dot-i" /> {t(dec.label)}</span>
                  )}
                </div>

                {/* Note globale */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: 'var(--muted)' }}>{t('Note globale')}</span>
                    <strong style={{ color: 'var(--ink)' }}>
                      {ev.note} / {ev.noteMax || '—'} ({ev.pourcentage} %)
                    </strong>
                  </div>
                  <div className="bar"><i style={{ width: `${ev.pourcentage}%` }} /></div>
                </div>

                {/* Badges risque / tendance */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                  <span className={`badge ${riskCls}`}>
                    <Icon name="shield" size={13} /> {t('Niveau de risque :')} {t(ev.risque)}
                  </span>
                  {tend && (
                    <span className={`badge ${tend.cls}`}>
                      <Icon name={tend.icon} size={13} /> {t(tend.label)}
                    </span>
                  )}
                </div>

                {/* Avis des évaluateurs */}
                {ev.avis && (
                  <div style={{ marginBottom: ev.plan ? 14 : 0 }}>
                    <div className="nav__label" style={{ padding: 0, marginBottom: 6 }}>{t('Avis de la Direction')}</div>
                    <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.6 }}>
                      {ev.avis}
                    </p>
                  </div>
                )}

                {/* Plan d'actions */}
                {ev.plan && (
                  <div
                    style={{
                      display: 'flex', gap: 12, padding: '12px 14px',
                      background: 'var(--surface-2, #f7f8fa)', borderRadius: 10,
                    }}
                  >
                    <span style={{ color: 'var(--brand, #c8102e)', flexShrink: 0 }}>
                      <Icon name="clipboard" size={18} />
                    </span>
                    <div>
                      <strong style={{ fontSize: 12.5, color: 'var(--ink)', display: 'block', marginBottom: 2 }}>
                        {t("Plan d'actions attendu")}
                      </strong>
                      <span style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.55 }}>{ev.plan}</span>
                    </div>
                  </div>
                )}

                {/* Rappel si partenariat annulé */}
                {ev.decision === 'Annuler' && (
                  <div
                    style={{
                      marginTop: 14, padding: '12px 14px', borderRadius: 10,
                      background: '#fdecee', border: '1px solid #f6c9cf', fontSize: 13, color: '#a50410',
                    }}
                  >
                    {t("À l'issue de cette évaluation, la relation de partenariat a été clôturée. Pour toute question, contactez votre interlocuteur à la Direction de la Conformité.")}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
