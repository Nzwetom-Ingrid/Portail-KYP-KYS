import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../components/Icon'
import {
  deleteDocument,
  getCurrentTiers,
  loadDocuments,
  uploadDocument,
} from '../services/portal'

// Mappe le statut Dataverse afb_statutvalidite → présentation
const STATUS = {
  Valide:   { label: 'Validé',  cls: 'badge--success' },
  EnRevue:  { label: 'En revue', cls: 'badge--info' },
  Requis:   { label: 'Requis',  cls: 'badge--warning' },
  Rejete:   { label: 'Refusé',  cls: 'badge--danger' },
}

const FILTERS = [
  { id: 'all',     label: 'Tous' },
  { id: 'Requis',  label: 'À fournir' },
  { id: 'EnRevue', label: 'En revue' },
  { id: 'Valide',  label: 'Validés' },
  { id: 'Rejete',  label: 'Refusés' },
]

// Adapte un enregistrement Dataverse au shape attendu par le tableau
function adapt(d) {
  return {
    id: d.afb_documentid,
    name: d.afb_nomfichier || '—',
    type: d.afb_typedocument || '—',
    cat: d.afb_categorie_label || d.afb_categorie?.afb_libelle || 'Document',
    status: d.afb_statutvalidite || 'EnRevue',
    date: d.createdon
      ? new Date(d.createdon).toLocaleDateString('fr-FR', {
          day: 'numeric', month: 'long', year: 'numeric',
        })
      : '—',
  }
}

export default function Documents({ notify }) {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tiers, setTiers] = useState(null)
  const [filter, setFilter] = useState('all')
  const [drag, setDrag] = useState(false)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef(null)

  // Chargement initial : tiers courant + ses documents
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const t = await getCurrentTiers()
        if (cancelled) return
        setTiers(t)
        if (t?.afb_tiersid) {
          const items = await loadDocuments(t.afb_tiersid)
          if (!cancelled) setDocs(items.map(adapt))
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
    const c = { all: docs.length }
    for (const d of docs) c[d.status] = (c[d.status] || 0) + 1
    return c
  }, [docs])

  const list = filter === 'all' ? docs : docs.filter((d) => d.status === filter)

  const handleFiles = async (files) => {
    const arr = Array.from(files || [])
    if (!arr.length || !tiers?.afb_tiersid) return
    setUploading(true)
    try {
      const created = []
      for (const f of arr) {
        const rec = await uploadDocument(tiers.afb_tiersid, f)
        created.push(adapt(rec))
      }
      setDocs((d) => [...created, ...d])
      notify(`${created.length} document${created.length > 1 ? 's' : ''} ajouté${created.length > 1 ? 's' : ''}.`)
    } catch (e) {
      notify(`Échec du téléversement : ${e.message}`)
    } finally {
      setUploading(false)
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

  return (
    <div className="page">
      {/* Zone de dépôt */}
      <div
        className={`dropzone ${drag ? 'is-drag' : ''}`}
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        style={{ marginBottom: 24, opacity: uploading ? 0.7 : 1 }}
      >
        <div className="dropzone__icon"><Icon name="upload" size={26} /></div>
        <h3>{uploading ? 'Téléversement en cours…' : 'Glissez-déposez vos documents ici'}</h3>
        <p>ou cliquez pour parcourir · PDF, JPG, PNG · 10 Mo max par fichier</p>
        <button
          className="btn btn--primary btn--sm"
          type="button"
          disabled={uploading}
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
        >
          <Icon name="plus" size={16} /> Choisir des fichiers
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Filtres */}
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
        <span className="badge badge--brand">
          <Icon name="folder" size={14} /> {docs.length} document{docs.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* États : chargement / erreur / tableau */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div className="empty">
            <div className="empty__icon"><Icon name="clock" size={28} /></div>
            <p>Chargement de vos documents…</p>
          </div>
        ) : error ? (
          <div className="empty">
            <div className="empty__icon"><Icon name="alert" size={28} /></div>
            <h3 style={{ color: 'var(--ink)' }}>Connexion Dataverse impossible</h3>
            <p style={{ maxWidth: 480, margin: '0 auto' }}>{error}</p>
          </div>
        ) : list.length === 0 ? (
          <div className="empty">
            <div className="empty__icon"><Icon name="folder" size={28} /></div>
            <h3 style={{ color: 'var(--ink)' }}>Aucun document</h3>
            <p>Aucun document ne correspond à ce filtre.</p>
          </div>
        ) : (
          <table className="doc-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Catégorie</th>
                <th>Statut</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
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
                          <span>{d.type}</span>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge">{d.cat}</span></td>
                    <td><span className={`badge ${st.cls}`}><span className="dot-i" /> {st.label}</span></td>
                    <td style={{ color: 'var(--muted)', fontSize: 13.5 }}>{d.date}</td>
                    <td>
                      <div className="row-actions">
                        {isMissing ? (
                          <button
                            className="btn btn--soft btn--sm"
                            style={{ width: 'auto' }}
                            onClick={() => inputRef.current?.click()}
                          >
                            <Icon name="upload" size={15} /> Déposer
                          </button>
                        ) : (
                          <>
                            <button title="Voir" onClick={() => notify(`Aperçu : ${d.name}`)}><Icon name="eye" size={17} /></button>
                            <button title="Télécharger" onClick={() => notify(`Téléchargement : ${d.name}`)}><Icon name="download" size={17} /></button>
                            <button className="danger" title="Supprimer" onClick={() => remove(d.id)}><Icon name="trash" size={17} /></button>
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
