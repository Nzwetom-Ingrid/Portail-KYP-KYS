import { useEffect, useMemo, useState } from 'react'
import Icon from '../components/Icon'
import { useT } from '../i18n/i18n'
import { getCurrentTiers, loadUbos, submitUbo } from '../services/portal'
import { COUNTRIES } from '../config/countries'
import { filterBySearch } from '../utils/search'

// Mappe le choix Dataverse afb_statutdevalidation → présentation
const STATUS = {
  0:         { label: 'Validé',     cls: 'badge--success' },
  1:         { label: 'En attente', cls: 'badge--info' },
  2:         { label: 'À revoir',   cls: 'badge--warning' },
  747010001: { label: 'Rejeté',    cls: 'badge--danger' },
}

const EMPTY = {
  nom: '',
  typeEntite: 'physique',
  nationalite: '',
  dateNaissance: '',
  pourcentage: '25',
  ppe: false,
}

function frDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Adapte un enregistrement Dataverse afb_ubo au shape attendu par le tableau
function adapt(u) {
  return {
    id: u.afb_uboid,
    nom: u.afb_nomouraisonsociale || '—',
    morale: u.afb_typedentite === 0,
    nationalite: u.afb_nationalite || '—',
    naissance: frDate(u.afb_datedenaissance),
    part: u.afb_pourcentagededetentiondirecte ?? 0,
    ppe: (u.afb_statutppe ?? 0) !== 0,
    status: u.afb_statutdevalidation ?? 1,
  }
}

export default function UBO({ notify, search = '' }) {
  const { t } = useT()
  const [ubos, setUbos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tiers, setTiers] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  // Chargement initial : tiers courant + ses bénéficiaires
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const t = await getCurrentTiers()
        if (cancelled) return
        setTiers(t)
        if (t?.afb_tiersid) {
          const items = await loadUbos(t.afb_tiersid)
          if (!cancelled) setUbos(items.map(adapt))
        }
      } catch (e) {
        if (!cancelled) setError(e.message || String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const morale = form.typeEntite === 'morale'
  const totalPart = useMemo(
    () => ubos.reduce((sum, u) => sum + (Number(u.part) || 0), 0),
    [ubos],
  )
  // Recherche globale sur toutes les colonnes affichées : on cherche autant un
  // bénéficiaire par son statut (« rejeté ») ou sa qualité de PPE que par son nom.
  const shownUbos = useMemo(
    () =>
      filterBySearch(ubos, search, (u) => [
        u.nom,
        u.nationalite,
        u.naissance,
        u.morale ? 'personne morale' : 'personne physique',
        `${u.part}%`,
        u.ppe ? 'PPE personne politiquement exposée' : '',
        STATUS[u.status]?.label,
      ]),
    [ubos, search],
  )

  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const canSubmit = form.nom.trim().length >= 3 && form.pourcentage !== '' && !saving

  const resetForm = () => setForm(EMPTY)

  const submit = async (e) => {
    e.preventDefault()
    if (!canSubmit || !tiers?.afb_tiersid) return
    setSaving(true)
    try {
      const rec = await submitUbo(tiers.afb_tiersid, form)
      setUbos((list) => [adapt(rec), ...list])
      notify('Bénéficiaire effectif ajouté — en attente de validation.')
      resetForm()
      setShowForm(false)
    } catch (err) {
      notify(`Enregistrement impossible : ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      {/* En-tête + action */}
      <div className="section-head">
        <div>
          <h2 style={{ margin: 0, color: 'var(--ink)', fontSize: 20 }}>{t('Mes bénéficiaires effectifs')}</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 13.5, maxWidth: 560 }}>
            {t('Déclarez toute personne détenant, directement ou indirectement, au moins 25 % du capital ou des droits de vote, ou exerçant un contrôle effectif sur votre entité.')}
          </p>
        </div>
        <button
          className="btn btn--primary btn--sm"
          type="button"
          onClick={() => setShowForm((v) => !v)}
        >
          <Icon name={showForm ? 'close' : 'plus'} size={16} />
          {showForm ? t('Fermer') : t('Ajouter un bénéficiaire')}
        </button>
      </div>

      {/* Formulaire d'ajout */}
      {showForm && (
        <form className="card card--pad" style={{ marginBottom: 24 }} onSubmit={submit}>
          <div className="form-grid">
            <div className="field field--full">
              <label>{t('Nature du bénéficiaire')}</label>
              <div className="type-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {[
                  { id: 'physique', icon: 'user', t: 'Personne physique', d: 'Détenteur ou contrôleur final (individu).' },
                  { id: 'morale', icon: 'building', t: 'Personne morale', d: 'Entité intermédiaire d’une chaîne de détention.' },
                ].map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className={`type-card ${form.typeEntite === o.id ? 'is-selected' : ''}`}
                    onClick={() => setForm((f) => ({ ...f, typeEntite: o.id }))}
                  >
                    <div className="type-card__icon"><Icon name={o.icon} size={24} /></div>
                    <h4>{t(o.t)}</h4>
                    <p>{t(o.d)}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="field field--full">
              <label>{morale ? t('Raison sociale') : t('Nom complet')} <span className="req">*</span></label>
              <input
                value={form.nom}
                onChange={set('nom')}
                placeholder={morale ? 'Ex. Holdings International Ltd.' : t('Prénom et nom')}
              />
            </div>

            <div className="field">
              <label>{morale ? t('Pays d’incorporation') : t('Pays / Nationalité')}</label>
              <select value={form.nationalite} onChange={set('nationalite')}>
                <option value="">{morale ? t('Sélectionnez le pays') : t('Sélectionnez le pays / la nationalité')}</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>{morale ? t('Date de constitution') : t('Date de naissance')}</label>
              <input type="date" value={form.dateNaissance} onChange={set('dateNaissance')} />
            </div>

            <div className="field">
              <label>{t('% de détention')} <span className="req">*</span></label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.pourcentage}
                onChange={set('pourcentage')}
                placeholder="25"
              />
            </div>

            <div className="field" style={{ justifyContent: 'flex-end' }}>
              <label className="consent" style={{ margin: 0 }}>
                <input type="checkbox" checked={form.ppe} onChange={set('ppe')} />
                <span>{t('Personne politiquement exposée (PPE)')}</span>
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              className="btn btn--ghost"
              type="button"
              onClick={() => { resetForm(); setShowForm(false) }}
            >
              {t('Annuler')}
            </button>
            <button className="btn btn--primary" type="submit" disabled={!canSubmit}>
              {saving ? t('Enregistrement…') : t('Déclarer le bénéficiaire')}
              <Icon name="check" size={18} />
            </button>
          </div>
        </form>
      )}

      {/* Récapitulatif détention */}
      {!loading && !error && ubos.length > 0 && (
        <div className="section-head">
          <span className="badge badge--brand">
            <Icon name="user" size={14} /> {ubos.length} {t('bénéficiaire(s)')}
          </span>
          <span className={`badge ${totalPart > 100 ? 'badge--danger' : 'badge--info'}`}>
            {t('Détention cumulée déclarée :')} {totalPart.toFixed(1)} %
          </span>
        </div>
      )}

      {/* États : chargement / erreur / tableau */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div className="empty">
            <div className="empty__icon"><Icon name="clock" size={28} /></div>
            <p>{t('Chargement de vos bénéficiaires…')}</p>
          </div>
        ) : error ? (
          <div className="empty">
            <div className="empty__icon"><Icon name="alert" size={28} /></div>
            <h3 style={{ color: 'var(--ink)' }}>{t('Connexion Dataverse impossible')}</h3>
            <p style={{ maxWidth: 480, margin: '0 auto' }}>{error}</p>
          </div>
        ) : ubos.length === 0 ? (
          <div className="empty">
            <div className="empty__icon"><Icon name="user" size={28} /></div>
            <h3 style={{ color: 'var(--ink)' }}>{t('Aucun bénéficiaire déclaré')}</h3>
            <p>{t('Ajoutez les personnes qui détiennent ou contrôlent votre entité.')}</p>
            <button className="btn btn--primary btn--sm" type="button" onClick={() => setShowForm(true)}>
              <Icon name="plus" size={16} /> {t('Ajouter un bénéficiaire')}
            </button>
          </div>
        ) : (
          <table className="doc-table" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ width: '38%' }}>{t('Bénéficiaire')}</th>
                <th style={{ width: '20%' }}>{t('Nationalité')}</th>
                <th style={{ width: '14%' }}>{t('Détention')}</th>
                <th style={{ width: '12%' }}>{t('PPE')}</th>
                <th style={{ width: '16%' }}>{t('Validation')}</th>
              </tr>
            </thead>
            <tbody>
              {shownUbos.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: '18px' }}>{t('Aucun bénéficiaire ne correspond à la recherche.')}</td></tr>
              )}
              {shownUbos.map((u) => {
                const st = STATUS[u.status] || STATUS[1]
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="doc-name">
                        <span className="doc-name__icon">
                          <Icon name={u.morale ? 'building' : 'user'} size={20} />
                        </span>
                        <div>
                          <strong>{u.nom}</strong>
                          <span>{u.morale ? t('Personne morale') : `${t('Né(e)')} ${u.naissance}`}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: 13.5 }}>{u.nationalite}</td>
                    <td><span className="badge">{Number(u.part).toFixed(1)} %</span></td>
                    <td>
                      {u.ppe
                        ? <span className="badge badge--danger"><span className="dot-i" /> {t('Oui')}</span>
                        : <span className="badge">{t('Non')}</span>}
                    </td>
                    <td><span className={`badge ${st.cls}`}><span className="dot-i" /> {t(st.label)}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
