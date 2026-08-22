import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../components/Icon'
import SearchableSelect from '../components/SearchableSelect'
import { useT } from '../i18n/i18n'
import { useRafraichissementAuto } from '../hooks/useRafraichissementAuto'
import {
  deleteDocument,
  getCurrentTiers,
  getDocumentFile,
  loadDocumentCategories,
  loadDocuments,
  loadDossier,
  getDiagnosticRattachement,
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
  // Neutre à dessein : une pièce remplacée n'est pas un problème, c'est
  // l'historique d'un dépôt qui s'est bien passé.
  Remplace: { label: 'Remplacé', cls: 'badge--muted' },
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
  // Fichiers choisis mais pas encore envoyes : la file d'attente.
  const [enAttente, setEnAttente] = useState([])
  const [expiry, setExpiry] = useState('') // date d'expiration appliquée au prochain téléversement
  const [categories, setCategories] = useState([])
  const [categoryId, setCategoryId] = useState('') // catégorie (requise) du prochain téléversement
  const [entityType, setEntityType] = useState('partenaire') // type d'entité → liste des pièces attendues
  const [docType, setDocType] = useState('') // pièce demandée rattachée au prochain dépôt
  const inputRef = useRef(null)

  // Rafraîchissement automatique : la conformité valide ou rejette une pièce
  // sans que rien n'arrive au partenaire, qui rechargeait la page au hasard
  // pour s'en apercevoir. Rejouer l'effet de chargement suffit à le remettre à
  // jour. Suspendu pendant un envoi : remplacer la liste sous les doigts de
  // l'utilisateur ferait plus de dégâts que la fraîcheur n'apporte.
  const [tickRafraichissement, setTickRafraichissement] = useState(0)
  useRafraichissementAuto(() => setTickRafraichissement((v) => v + 1), { actif: !uploading })

  // Chargement initial : tiers courant + ses documents + catégories.
  // Rejoué à chaque incrément du compteur ci-dessus.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // Seul le premier chargement affiche l'écran d'attente : une relecture
      // automatique doit passer inaperçue, sinon l'écran clignote chaque minute.
      if (tickRafraichissement === 0) setLoading(true)
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
  }, [tickRafraichissement])

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

  /**
   * Ajoute des fichiers à la file d'attente — sans rien envoyer.
   *
   * Le dépôt était immédiat : choisir un fichier l'expédiait aussitôt, sans
   * possibilité de vérifier la catégorie, la pièce rattachée ou même de
   * constater qu'on s'était trompé de fichier. On constitue désormais une
   * sélection, qu'on relit avant de la soumettre.
   */
  const ajouterFichiers = (files) => {
    const arr = Array.from(files || [])
    if (!arr.length) return

    // Contrôle à l'ajout, pas à l'envoi : l'utilisateur voit tout de suite ce
    // qui ne passe pas, au lieu de le découvrir après avoir cliqué « Soumettre ».
    const rejetes = arr.map((f) => ({ name: f.name, error: validateFile(f) })).filter((r) => r.error)
    if (rejetes.length) notify(rejetes.map((r) => `${r.name} — ${r.error}`).join(' '))

    const valides = arr.filter((f) => !validateFile(f))
    if (!valides.length) return

    setEnAttente((prec) => {
      // Un même fichier choisi deux fois ne doit pas partir en double.
      const connus = new Set(prec.map((f) => `${f.name}:${f.size}`))
      return [...prec, ...valides.filter((f) => !connus.has(`${f.name}:${f.size}`))]
    })
  }

  const retirerDeLaFile = (index) => setEnAttente((prec) => prec.filter((_, i) => i !== index))

  const soumettre = async () => {
    if (!enAttente.length || !tiers?.afb_tiersid) return
    setUploading(true)
    try {
      const created = []
      for (const [i, f] of enAttente.entries()) {
        setProgress({ done: i, total: enAttente.length, name: f.name })
        const rec = await uploadDocument(tiers.afb_tiersid, f, { categoryId, expiration: expiry || null, docType: docType || null })
        created.push(adapt(rec))
      }
      setDocs((d) => [...created, ...d])
      setEnAttente([])
      setExpiry('') // on réinitialise après usage
      setDocType('') // la pièce demandée est réinitialisée après dépôt
      notify(`${created.length} document${created.length > 1 ? 's' : ''} ajouté${created.length > 1 ? 's' : ''}.`)
    } catch (e) {
      // La file est conservée : l'utilisateur peut relancer sans tout resélectionner.
      notify(`Échec du téléversement : ${e.message}`)
    } finally {
      setUploading(false)
      setProgress(null)
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDrag(false)
    ajouterFichiers(e.dataTransfer.files)
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

  // Sans tiers rattaché, le dépôt est impossible : il n'y a pas de dossier où
  // ranger la pièce. Le bouton « Soumettre » était simplement grisé, sans un mot
  // d'explication — l'utilisateur croyait à une panne du bouton. On nomme la
  // cause, et on dit à qui s'adresser.
  const sansTiers = !loading && !tiers?.afb_tiersid

  // Deux pannes très différentes se ressemblaient à l'écran : « la fiche n'est
  // pas rattachée » et « le site n'a pas le droit de lire la table ». La
  // première se corrige sur la fiche du tiers, la seconde dans les
  // autorisations du rôle web — autant le dire, sinon on cherche des heures du
  // mauvais côté.
  // Toutes les voies refusées, pas seulement la première : n'en nommer qu'une
  // ferait corriger une permission puis buter sur la suivante.
  const voiesRefusees = sansTiers
    ? (getDiagnosticRattachement()?.voies ?? []).filter((v) => v.statut === 'refuse')
    : []
  const TABLE_PAR_VOIE = {
    contact: 'Contact',
    'email-principal': 'Tiers',
    'identite-externe': 'Tiers externe B2C',
  }

  return (
    <div className="page">
      {sansTiers && (
        <div className="card card--pad" style={{ marginBottom: 16, borderLeft: '3px solid var(--warning)' }}>
          <h3 style={{ margin: 0, fontSize: 15, color: 'var(--ink)' }}>
            <Icon name="alert" size={16} /> {t('Votre espace n’est rattaché à aucune entreprise')}
          </h3>
          <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.55 }}>
            {t('Vous pouvez consulter cette page, mais aucun dépôt n’est possible : la pièce n’aurait pas de dossier où être rangée. Signalez-le à votre chargé de relation Afriland First Bank — le rattachement se fait de son côté, en quelques minutes.')}
          </p>
          {voiesRefusees.length > 0 && (
            <p style={{ margin: '10px 0 0', color: 'var(--muted)', fontSize: 12.5, lineHeight: 1.5 }}>
              <strong>{t('Note technique')} — </strong>
              {voiesRefusees.length > 1 ? t('la lecture des tables') : t('la lecture de la table')}{' '}
              {voiesRefusees.map((v) => `« ${TABLE_PAR_VOIE[v.canal] ?? v.canal} »`).join(', ')}{' '}
              {voiesRefusees.length > 1 ? t('a été refusée.') : t('a été refusée.')}{' '}
              {t('Le rattachement existe peut-être déjà : c’est l’autorisation de table du rôle web qui manque, côté administration du portail.')}
            </p>
          )}
        </div>
      )}

      {/* Catégorie + date d'expiration appliquées au(x) document(s) téléversé(s) */}
      <div className="card card--pad" style={{ marginBottom: 16 }}>
        <div className="form-grid">
          <div className="field">
            <label>
              <Icon name="folder" size={15} /> {t('Catégorie du document')} <span className="req">*</span>
            </label>
            <SearchableSelect
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              options={categories.map((c) => ({ label: c.label, value: c.id }))}
              placeholder={categories.length ? '— Sélectionner —' : 'Chargement…'}
              disabled={categories.length === 0}
            />
            <span className="field__hint">
              {t('Classe la pièce dans la bibliothèque (Identification, Conventions, Audit…).')}
            </span>
          </div>
          <div className="field">
            <label>
              <Icon name="fileText" size={15} /> {t('Pièce demandée')}
            </label>
            <SearchableSelect
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              placeholder="— Autre / non listée —"
              options={required.map((r) => ({ label: r.name + (r.mandatory ? ' *' : ''), value: r.key }))}
            />
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
        {/* La progression vit désormais dans la file d'attente, au plus près du
            bouton qui a lancé l'envoi. La zone de dépôt reste ce qu'elle est :
            un endroit où poser des fichiers. */}
        <div className="dropzone__icon"><Icon name="upload" size={26} /></div>
        <h3>{t('Glissez-déposez vos documents ici')}</h3>
        <p>{t('ou cliquez pour parcourir')} · {acceptLabel(ACCEPT_DOCUMENT)} {t('par fichier')}</p>
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
            // `e.target.files` est une FileList VIVANTE, liée à l'input : vider
            // `value` la vide aussi. On copiait donc une liste déjà vide, et
            // rien n'arrivait dans la file d'attente — alors que le
            // glisser-déposer, qui passe par `dataTransfer.files`, fonctionnait.
            // L'ordre compte : on matérialise la sélection AVANT de réarmer l'input.
            const files = Array.from(e.target.files || [])
            e.target.value = '' // permet de re-sélectionner le même fichier après une erreur
            ajouterFichiers(files)
          }}
        />
      </div>

      {/* File d'attente : ce qui sera envoyé au clic sur « Soumettre ». */}
      {enAttente.length > 0 && (
        <div className="card card--pad" style={{ marginBottom: 24 }}>
          <div className="section-head" style={{ marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, color: 'var(--ink)' }}>
                {t('Prêt à être envoyé')}
              </h3>
              <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 13 }}>
                {t('Vérifiez la catégorie et la pièce demandée ci-dessus avant de soumettre.')}
              </p>
            </div>
            <span className="badge badge--brand">
              {enAttente.length} {enAttente.length > 1 ? t('fichiers') : t('fichier')}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {enAttente.map((f, i) => (
              <div
                key={`${f.name}-${f.size}`}
                className="card"
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px' }}
              >
                <span className="doc-name__icon"><Icon name="fileText" size={18} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ color: 'var(--ink)', fontSize: 13.5, display: 'block' }}>{f.name}</strong>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {(f.size / 1048576).toFixed(1)} {t('Mo')}
                  </span>
                </div>
                {/* Pendant l'envoi, retirer une ligne desynchroniserait la
                    progression : on neutralise l'action plutôt que de la cacher. */}
                <button
                  className="danger"
                  title={t('Retirer de la sélection')}
                  disabled={uploading}
                  onClick={() => retirerDeLaFile(i)}
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 16, alignItems: 'center' }}>
            <button className="btn btn--primary" onClick={soumettre} disabled={uploading || !tiers?.afb_tiersid}>
              <Icon name={uploading ? 'clock' : 'upload'} size={18} />
              {uploading
                ? `${t('Envoi…')} ${progress ? `${progress.done + 1}/${progress.total}` : ''}`
                : t('Soumettre les documents')}
            </button>
            <button className="btn btn--ghost" onClick={() => setEnAttente([])} disabled={uploading}>
              {t('Tout retirer')}
            </button>
          </div>

          {/* Progression détaillée : l'envoi convertit chaque fichier en base64
              avant l'écriture Dataverse — sur plusieurs Mo, l'écran resterait
              figé plusieurs secondes sans aucun signe de vie. */}
          {uploading && progress && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 6 }}>
                {t('Envoi de')} <strong>{progress.name}</strong> — {t('fichier')} {progress.done + 1} {t('sur')} {progress.total}
              </div>
              <div className="wizard__progress">
                <i style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

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
