import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../components/Icon'
import { useT } from '../i18n/i18n'
import {
  deleteDocument,
  getCurrentTiers,
  getDocumentFile,
  loadDocumentCategories,
  loadDocuments,
  loadDossier,
  uploadDocument,
} from '../services/portal'
import {
  ENTITY_TYPE_LABELS,
  entityTypeFromRef,
  docLabelFromKey,
  parseRequiredDocs,
} from '../config/requiredDocs'
import { filterBySearch } from '../utils/search'
import { ACCEPT_DOCUMENT, acceptAttr, acceptLabel, validateFile } from '../utils/validation'

// Décode un base64 Dataverse en Blob téléchargeable/affichable.
function b64ToBlob(b64, mime) {
  const bytes = atob(b64)
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
  return new Blob([arr], { type: mime || 'application/octet-stream' })
}

// Mappe le statut Dataverse afb_statutdevalidite → présentation
const STATUS = {
  Valide:   { label: 'Validé',  cls: 'badge--success' },
  EnRevue:  { label: 'En revue', cls: 'badge--info' },
  Requis:   { label: 'Requis',  cls: 'badge--warning' },
  Expire:   { label: 'Expiré',  cls: 'badge--danger' },
  Rejete:   { label: 'Refusé',  cls: 'badge--danger' },
}

const FILTERS = [
  { id: 'all',     label: 'Tous' },
  { id: 'Requis',  label: 'À fournir' },
  { id: 'EnRevue', label: 'En revue' },
  { id: 'Valide',  label: 'Validés' },
  { id: 'Expire',  label: 'Expirés' },
  { id: 'Rejete',  label: 'Refusés' },
]

function frDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Adapte un enregistrement Dataverse au shape attendu par le tableau
function adapt(d) {
  const expRaw = d.afb_date_expiration || null
  // Document expiré si la date d'expiration est dépassée
  const expired = expRaw ? new Date(expRaw) < new Date(new Date().toDateString()) : false
  const baseStatus = d.afb_statutvalidite || 'EnRevue'
  // Une date d'expiration dépassée prime sur le statut Dataverse (qui n'est mis à
  // jour qu'au passage du flux planifié) → « Expiré », sauf si déjà refusé.
  const status = expired && baseStatus !== 'Rejete' ? 'Expire' : baseStatus
  return {
    id: d.afb_documentid,
    name: d.afb_nomfichier || '—',
    type: d.afb_typedocument || '—',
    cat: d.afb_categorie_label || d.afb_categorie?.afb_libelle || 'Document',
    status,
    date: frDate(d.createdon),
    expiry: frDate(expRaw),
    expired,
  }
}

export default function Documents({ notify, search = '' }) {
  const { t } = useT()
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tiers, setTiers] = useState(null)
  const [filter, setFilter] = useState('all')
  const [drag, setDrag] = useState(false)
  const [uploading, setUploading] = useState(false)
  // Progression du lot en cours : { done, total, name }. null = aucun envoi.
  const [progress, setProgress] = useState(null)
  const [expiry, setExpiry] = useState('') // date d'expiration appliquée au prochain téléversement
  const [categories, setCategories] = useState([])
  const [categoryId, setCategoryId] = useState('') // catégorie (requise) du prochain téléversement
  const [entityType, setEntityType] = useState('partenaire') // type d'entité → liste des pièces attendues
  const [docType, setDocType] = useState('') // pièce demandée rattachée au prochain dépôt
  const inputRef = useRef(null)

  // Chargement initial : tiers courant + ses documents + catégories
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const [t, cats] = await Promise.all([getCurrentTiers(), loadDocumentCategories()])
        if (cancelled) return
        setTiers(t)
        setCategories(cats)
        if (cats.length && !categoryId) setCategoryId(cats[0].id)
        if (t?.afb_tiersid) {
          const [items, dossier] = await Promise.all([
            loadDocuments(t.afb_tiersid),
            loadDossier(t.afb_tiersid).catch(() => null),
          ])
          if (!cancelled) {
            setDocs(items.map(adapt))
            setEntityType(entityTypeFromRef(dossier?.afb_reference))
          }
        }
      } catch (e) {
        if (!cancelled) setError(e.message || String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const counts = useMemo(() => {
    const c = { all: docs.length }
    for (const d of docs) c[d.status] = (c[d.status] || 0) + 1
    return c
  }, [docs])

  // Checklist des pièces attendues : liste personnalisée du tiers (afb_documentsrequis)
  // si présente, sinon pièces par défaut du type. Suivi X/Y + manquants.
  const required = parseRequiredDocs(tiers?.afb_documentsrequis, entityType)
  const providedKeys = useMemo(() => new Set(docs.map((d) => d.type).filter(Boolean)), [docs])
  const checklist = required.map((item) => ({ ...item, fourni: providedKeys.has(item.key) }))
  const nbFournis = checklist.filter((c) => c.fourni).length

  const byStatus = filter === 'all' ? docs : docs.filter((d) => d.status === filter)
  // Recherche globale : toutes les colonnes affichées dans le tableau, plus le
  // libellé lisible de la pièce attendue (« Registre du commerce ») que l'on
  // cherche plus volontiers que sa clé technique (« rccm »).
  const list = filterBySearch(byStatus, search, (d) => [
    d.name,
    d.cat,
    d.type,
    required.find((r) => r.key === d.type)?.name || docLabelFromKey(entityType, d.type),
    STATUS[d.status]?.label,
    d.date,
    d.expiry,
  ])

  const handleFiles = async (files) => {
    const arr = Array.from(files || [])
    if (!arr.length || !tiers?.afb_tiersid) return

    // Contrôle de tous les fichiers AVANT d'en envoyer un seul : mieux vaut
    // refuser la sélection entière que déposer trois pièces sur cinq et laisser
    // l'utilisateur deviner lesquelles sont passées.
    const rejected = arr
      .map((f) => ({ name: f.name, error: validateFile(f) }))
      .filter((r) => r.error)
    if (rejected.length) {
      notify(rejected.map((r) => `${r.name} — ${r.error}`).join(' '))
      return
    }

    setUploading(true)
    try {
      const created = []
      for (const [i, f] of arr.entries()) {
        setProgress({ done: i, total: arr.length, name: f.name })
        const rec = await uploadDocument(tiers.afb_tiersid, f, { categoryId, expiration: expiry || null, docType: docType || null })
        created.push(adapt(rec))
      }
      setDocs((d) => [...created, ...d])
      setExpiry('') // on réinitialise après usage
      setDocType('') // la pièce demandée est réinitialisée après dépôt
      notify(`${created.length} document${created.length > 1 ? 's' : ''} ajouté${created.length > 1 ? 's' : ''}.`)
    } catch (e) {
      notify(`Échec du téléversement : ${e.message}`)
    } finally {
      setUploading(false)
      setProgress(null)
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDrag(false)
    handleFiles(e.dataTransfer.files)
  }

  const remove = async (id) => {
    const previous = docs
    setDocs((d) => d.filter((x) => x.id !== id))
    try {
      await deleteDocument(id)
      notify('Document supprimé.')
    } catch (e) {
      setDocs(previous)
      notify(`Suppression impossible : ${e.message}`)
    }
  }

  // Ouvre le document dans un nouvel onglet (URL SharePoint ou pièce jointe base64).
  const view = async (d) => {
    try {
      const f = await getDocumentFile(d.id)
      if (f.url) { window.open(f.url, '_blank', 'noopener'); return }
      const url = URL.createObjectURL(b64ToBlob(f.base64, f.mimetype))
      window.open(url, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (e) {
      notify(`Aperçu impossible : ${e.message}`)
    }
  }

  // Télécharge le fichier localement.
  const download = async (d) => {
    try {
      const f = await getDocumentFile(d.id)
      const a = document.createElement('a')
      if (f.url) {
        a.href = f.url
        a.target = '_blank'
      } else {
        a.href = URL.createObjectURL(b64ToBlob(f.base64, f.mimetype))
        setTimeout(() => URL.revokeObjectURL(a.href), 60000)
      }
      a.download = f.filename || d.name
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (e) {
      notify(`Téléchargement impossible : ${e.message}`)
    }
  }

  return (
    <div className="page">
      {/* Catégorie + date d'expiration appliquées au(x) document(s) téléversé(s) */}
      <div className="card card--pad" style={{ marginBottom: 16 }}>
        <div className="form-grid">
          <div className="field">
            <label>
              <Icon name="folder" size={15} /> {t('Catégorie du document')} <span className="req">*</span>
            </label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.length === 0 && <option value="">{t('Chargement…')}</option>}
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            <span className="field__hint">
              {t('Classe la pièce dans la bibliothèque (Identification, Conventions, Audit…).')}
            </span>
          </div>
          <div className="field">
            <label>
              <Icon name="fileText" size={15} /> {t('Pièce demandée')}
            </label>
            <select value={docType} onChange={(e) => setDocType(e.target.value)}>
              <option value="">{t('— Autre / non listée —')}</option>
              {required.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.name}{r.mandatory ? ' *' : ''}
                </option>
              ))}
            </select>
            <span className="field__hint">
              {t('Rattache ce dépôt à une pièce attendue de votre dossier (suivi des manquants).')}
            </span>
          </div>
          <div className="field">
            <label>
              <Icon name="calendar" size={15} /> {t('Date d’expiration du document')}
            </label>
            <input
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
            <span className="field__hint">
              {t('Optionnel — s’applique au(x) fichier(s) déposé(s) ci-dessous (ex. validité d’une pièce d’identité).')}
            </span>
          </div>
        </div>
      </div>

      {/* Zone de dépôt */}
      <div
        className={`dropzone ${drag ? 'is-drag' : ''}`}
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        style={{ marginBottom: 24, opacity: uploading ? 0.7 : 1 }}
      >
        <div className="dropzone__icon"><Icon name={uploading ? 'clock' : 'upload'} size={26} /></div>
        <h3>{uploading ? t('Téléversement en cours…') : t('Glissez-déposez vos documents ici')}</h3>
        {uploading && progress ? (
          <>
            <p style={{ marginBottom: 10 }}>
              {progress.name} · {t('fichier')} {progress.done + 1} {t('sur')} {progress.total}
            </p>
            {/* Barre de progression : l'envoi convertit le fichier en base64 avant
                de l'écrire dans Dataverse — sur plusieurs Mo, l'écran restait figé
                plusieurs secondes sans aucun signe de vie. */}
            <div className="wizard__progress" style={{ maxWidth: 320, margin: '0 auto' }}>
              <i style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} />
            </div>
          </>
        ) : (
          <p>{t('ou cliquez pour parcourir')} · {acceptLabel(ACCEPT_DOCUMENT)} {t('par fichier')}</p>
        )}
        <button
          className="btn btn--primary btn--sm"
          type="button"
          disabled={uploading}
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
        >
          <Icon name="plus" size={16} /> {t('Choisir des fichiers')}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          accept={acceptAttr(ACCEPT_DOCUMENT)}
          disabled={uploading}
          onChange={(e) => {
            const files = e.target.files
            e.target.value = '' // permet de re-sélectionner le même fichier après une erreur
            handleFiles(files)
          }}
        />
      </div>

      {/* Documents à fournir — checklist par type d'entité */}
      {checklist.length > 0 && (
        <div className="card card--pad" style={{ marginBottom: 24 }}>
          <div className="section-head" style={{ marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, color: 'var(--ink)' }}>
                {t('Documents à fournir')} · {t(ENTITY_TYPE_LABELS[entityType])}
              </h3>
              <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 13, maxWidth: 620 }}>
                {t('Pièces attendues pour votre dossier. Sélectionnez « Pièce demandée » ci-dessus avant de déposer pour cocher automatiquement la ligne correspondante.')}
              </p>
            </div>
            <span className={`badge ${nbFournis >= checklist.length ? 'badge--success' : 'badge--brand'}`}>
              <Icon name="check" size={14} /> {nbFournis}/{checklist.length} {t('fournis')}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {checklist.map((c) => (
              <div
                key={c.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  border: '1px solid var(--line-soft)',
                  borderRadius: 10,
                  background: c.fourni ? 'var(--success-bg)' : 'var(--surface-2)',
                }}
              >
                <Icon name={c.fourni ? 'check' : 'clock'} size={16} />
                <span style={{ flex: 1, fontSize: 13.5, color: 'var(--ink)' }}>{c.name}</span>
                <span
                  className={`badge ${c.fourni ? 'badge--success' : c.mandatory ? 'badge--danger' : ''}`}
                >
                  {c.fourni ? t('Fourni') : c.mandatory ? t('Manquant') : t('Optionnel')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtres */}
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
        <span className="badge badge--brand">
          <Icon name="folder" size={14} /> {docs.length} {t('documents')}
        </span>
      </div>

      {/* États : chargement / erreur / tableau */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div className="empty">
            <div className="empty__icon"><Icon name="clock" size={28} /></div>
            <p>{t('Chargement de vos documents…')}</p>
          </div>
        ) : error ? (
          <div className="empty">
            <div className="empty__icon"><Icon name="alert" size={28} /></div>
            <h3 style={{ color: 'var(--ink)' }}>{t('Connexion Dataverse impossible')}</h3>
            <p style={{ maxWidth: 480, margin: '0 auto' }}>{error}</p>
          </div>
        ) : list.length === 0 ? (
          <div className="empty">
            <div className="empty__icon"><Icon name="folder" size={28} /></div>
            <h3 style={{ color: 'var(--ink)' }}>{t('Aucun document')}</h3>
            <p>{t('Aucun document ne correspond à ce filtre.')}</p>
          </div>
        ) : (
          <table className="doc-table">
            <thead>
              <tr>
                <th>{t('Document')}</th>
                <th>{t('Catégorie')}</th>
                <th>{t('Statut')}</th>
                <th>{t('Date')}</th>
                <th>{t('Expiration')}</th>
                <th style={{ textAlign: 'right' }}>{t('Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((d) => {
                const st = STATUS[d.status] || STATUS.EnRevue
                const isMissing = d.status === 'Requis'
                return (
                  <tr key={d.id}>
                    <td>
                      <div className="doc-name">
                        <span className="doc-name__icon"><Icon name="fileText" size={20} /></span>
                        <div>
                          <strong>{d.name}</strong>
                          <span>{required.find((r) => r.key === d.type)?.name || docLabelFromKey(entityType, d.type) || d.type}</span>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge">{d.cat}</span></td>
                    <td><span className={`badge ${st.cls}`}><span className="dot-i" /> {t(st.label)}</span></td>
                    <td style={{ color: 'var(--muted)', fontSize: 13.5 }}>{d.date}</td>
                    <td style={{ fontSize: 13.5 }}>
                      {d.expiry === '—' ? (
                        <span style={{ color: 'var(--muted)' }}>—</span>
                      ) : d.expired ? (
                        <span className="badge badge--danger"><span className="dot-i" /> {d.expiry}</span>
                      ) : (
                        <span style={{ color: 'var(--ink)' }}>{d.expiry}</span>
                      )}
                    </td>
                    <td>
                      <div className="row-actions">
                        {isMissing ? (
                          <button
                            className="btn btn--soft btn--sm"
                            style={{ width: 'auto' }}
                            onClick={() => inputRef.current?.click()}
                          >
                            <Icon name="upload" size={15} /> {t('Déposer')}
                          </button>
                        ) : (
                          <>
                            <button title={t('Voir')} onClick={() => view(d)}><Icon name="eye" size={17} /></button>
                            <button title={t('Télécharger')} onClick={() => download(d)}><Icon name="download" size={17} /></button>
                            {d.status === 'Valide' ? (
                              <span
                                title={t('Document validé par la conformité — non supprimable')}
                                style={{ display: 'inline-flex', padding: 6, opacity: 0.45, cursor: 'not-allowed' }}
                              >
                                <Icon name="lock" size={16} />
                              </span>
                            ) : (
                              <button className="danger" title={t('Supprimer')} onClick={() => remove(d.id)}><Icon name="trash" size={17} /></button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
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
