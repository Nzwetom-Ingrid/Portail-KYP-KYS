import { Fragment, useEffect, useRef, useState } from 'react'
import Icon from '../components/Icon'
import { useT } from '../i18n/i18n'
import {
  getCurrentTiers,
  loadReceivedDocuments,
  loadDocumentResponses,
  respondToDocument,
  requestDocumentFromBank,
  getDocumentFile,
  deleteDocument,
} from '../services/portal'

// Décode un base64 Dataverse en Blob téléchargeable/affichable.
function b64ToBlob(b64, mime) {
  const clean = b64.includes(',') ? b64.split(',')[1] : b64
  const bytes = atob(clean)
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
  return new Blob([arr], { type: mime || 'application/octet-stream' })
}

function frDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return '—'
  }
}

export default function DocumentsRecus({ notify, search = '' }) {
  const { t } = useT()
  const [tiersId, setTiersId] = useState(null)
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null)

  // Réponses (factures / compléments) par document reçu.
  const [expanded, setExpanded] = useState({}) // { [docId]: true }
  const [responses, setResponses] = useState({}) // { [docId]: [] }
  const [loadingResp, setLoadingResp] = useState(null)
  const [respondingTo, setRespondingTo] = useState(null)
  const fileRef = useRef(null)
  const pendingParent = useRef(null)

  // Demande de document à AFB (e-mail via flux Power Automate).
  const [showRequest, setShowRequest] = useState(false)
  const [reqName, setReqName] = useState('')
  const [reqMsg, setReqMsg] = useState('')
  const [sendingReq, setSendingReq] = useState(false)

  const submitRequest = async () => {
    if (!reqMsg.trim()) { notify?.(t('Décrivez le document dont vous avez besoin.')); return }
    setSendingReq(true)
    try {
      await requestDocumentFromBank(tiersId, { docName: reqName.trim(), message: reqMsg.trim() })
      notify?.(t('Demande envoyée à Afriland First Bank.'))
      setShowRequest(false)
      setReqName('')
      setReqMsg('')
    } catch (e) {
      notify?.(`${t('Envoi impossible :')} ${e.message}`)
    } finally {
      setSendingReq(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const tiers = await getCurrentTiers()
        if (cancelled) return
        if (tiers?.afb_tiersid) {
          setTiersId(tiers.afb_tiersid)
          const data = await loadReceivedDocuments(tiers.afb_tiersid)
          if (!cancelled) setDocs(data)
        }
      } catch (e) {
        if (!cancelled) setError(e.message || String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const fetchFile = async (docId, filename, download) => {
    setBusy(docId)
    try {
      const f = await getDocumentFile(docId)
      const a = document.createElement('a')
      if (f.url) {
        a.href = f.url
        a.target = '_blank'
      } else {
        a.href = URL.createObjectURL(b64ToBlob(f.base64, f.mimetype))
        setTimeout(() => URL.revokeObjectURL(a.href), 60000)
      }
      if (download) a.download = f.filename || filename
      else a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (e) {
      notify?.(`${download ? t('Téléchargement impossible :') : t('Aperçu impossible :')} ${e.message}`)
    } finally {
      setBusy(null)
    }
  }

  const loadResponses = async (docId) => {
    setLoadingResp(docId)
    try {
      const list = await loadDocumentResponses(tiersId, docId)
      setResponses((r) => ({ ...r, [docId]: list }))
    } catch (e) {
      notify?.(`${t('Chargement des réponses impossible :')} ${e.message}`)
    } finally {
      setLoadingResp(null)
    }
  }

  const toggleResponses = async (docId) => {
    const willOpen = !expanded[docId]
    setExpanded((x) => ({ ...x, [docId]: willOpen }))
    if (willOpen && responses[docId] === undefined) await loadResponses(docId)
  }

  const startRespond = (docId) => {
    pendingParent.current = docId
    fileRef.current?.click()
  }

  const onFileChosen = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    const parentId = pendingParent.current
    if (!file || !parentId) return
    setRespondingTo(parentId)
    try {
      const created = await respondToDocument(tiersId, parentId, file)
      setExpanded((x) => ({ ...x, [parentId]: true }))
      // Affichage optimiste : on insère le document renvoyé par la création (le
      // $filter juste après une écriture peut ne pas encore voir le nouvel
      // enregistrement — latence de lecture Dataverse).
      if (created) {
        setResponses((r) => ({ ...r, [parentId]: [created, ...(r[parentId] || [])] }))
      } else {
        await loadResponses(parentId)
      }
      notify?.(`${file.name} ${t('envoyé à la banque.')}`)
    } catch (err) {
      notify?.(`${t('Envoi impossible :')} ${err.message}`)
    } finally {
      setRespondingTo(null)
    }
  }

  const removeResponse = async (docId, parentId) => {
    try {
      await deleteDocument(docId)
      await loadResponses(parentId)
      notify?.(t('Réponse supprimée.'))
    } catch (e) {
      notify?.(`${t('Suppression impossible :')} ${e.message}`)
    }
  }

  return (
    <div className="page">
      <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={onFileChosen} />

      <div className="section-head">
        <div>
          <h2 style={{ margin: 0, color: 'var(--ink)', fontSize: 20 }}>{t('Documents reçus')}</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 13.5, maxWidth: 620 }}>
            {t('Documents mis à votre disposition par Afriland First Bank (bons de commande, notes, attestations…). Consultez-les, téléchargez-les, et joignez votre réponse (facture, complément) directement au document concerné.')}
          </p>
        </div>
        <button className="btn btn--soft" style={{ width: 'auto' }} onClick={() => setShowRequest(true)}>
          <Icon name="upload" size={15} /> {t('Demander un document à AFB')}
        </button>
      </div>

      {loading ? (
        <div className="card empty">
          <div className="empty__icon"><Icon name="clock" size={28} /></div>
          <p>{t('Chargement de vos documents…')}</p>
        </div>
      ) : error ? (
        <div className="card empty">
          <div className="empty__icon"><Icon name="alert" size={28} /></div>
          <h3 style={{ color: 'var(--ink)' }}>{t('Connexion Dataverse impossible')}</h3>
          <p style={{ maxWidth: 480, margin: '0 auto' }}>{error}</p>
        </div>
      ) : docs.length === 0 ? (
        <div className="card empty">
          <div className="empty__icon"><Icon name="folder" size={28} /></div>
          <h3 style={{ color: 'var(--ink)' }}>{t('Aucun document reçu')}</h3>
          <p>{t('La banque ne vous a pas encore partagé de document. Ils apparaîtront ici.')}</p>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="doc-table">
            <thead>
              <tr>
                <th>{t('Document')}</th>
                <th>{t('Catégorie')}</th>
                <th>{t('Reçu le')}</th>
                <th>{t('Validité')}</th>
                <th>{t('Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const q = search.trim().toLowerCase()
                const shown = q
                  ? docs.filter((d) => `${d.afb_nomfichier || ''} ${d.afb_categorie_label || ''}`.toLowerCase().includes(q))
                  : docs
                if (shown.length === 0)
                  return (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: '18px' }}>{t('Aucun document ne correspond à la recherche.')}</td></tr>
                  )
                return shown.map((d) => {
                const resp = responses[d.afb_documentid] || []
                const isOpen = !!expanded[d.afb_documentid]
                return (
                  <Fragment key={d.afb_documentid}>
                    <tr>
                      <td style={{ fontWeight: 600, color: 'var(--ink)' }}>{d.afb_nomfichier}</td>
                      <td>{d.afb_categorie_label}</td>
                      <td>{frDate(d.createdon)}</td>
                      <td>{d.afb_date_expiration ? frDate(d.afb_date_expiration) : t('Sans expiration')}</td>
                      <td>
                        <div className="row-actions">
                          <button title={t('Voir')} disabled={busy === d.afb_documentid} onClick={() => fetchFile(d.afb_documentid, d.afb_nomfichier, false)}>
                            <Icon name="eye" size={17} />
                          </button>
                          <button title={t('Télécharger')} disabled={busy === d.afb_documentid} onClick={() => fetchFile(d.afb_documentid, d.afb_nomfichier, true)}>
                            <Icon name="download" size={17} />
                          </button>
                          <button
                            title={t('Joindre une réponse (facture, complément)')}
                            disabled={respondingTo === d.afb_documentid}
                            onClick={() => startRespond(d.afb_documentid)}
                          >
                            <Icon name="upload" size={17} />
                          </button>
                          <button title={t('Voir les réponses')} onClick={() => toggleResponses(d.afb_documentid)}>
                            <span style={{ display: 'inline-flex', transition: 'transform 180ms', transform: isOpen ? 'rotate(180deg)' : 'none' }}>
                              <Icon name="chevronDown" size={17} />
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={`${d.afb_documentid}-resp`}>
                        <td colSpan={5} style={{ background: 'var(--surface-2, #FAF9F6)', padding: '10px 16px' }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>
                            {t('Vos réponses à ce document')}
                          </div>
                          {loadingResp === d.afb_documentid ? (
                            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{t('Chargement…')}</div>
                          ) : resp.length === 0 ? (
                            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                              {t('Aucune réponse envoyée. Utilisez le bouton « joindre » pour envoyer une facture ou un complément.')}
                            </div>
                          ) : (
                            resp.map((r) => (
                              <div key={r.afb_documentid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid #F0EEE8' }}>
                                <Icon name="download" size={15} />
                                <span style={{ flex: 1, fontSize: 13.5, color: 'var(--ink)' }}>{r.afb_nomfichier}</span>
                                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{frDate(r.createdon)}</span>
                                <button title={t('Voir')} onClick={() => fetchFile(r.afb_documentid, r.afb_nomfichier, false)}><Icon name="eye" size={16} /></button>
                                <button title={t('Télécharger')} onClick={() => fetchFile(r.afb_documentid, r.afb_nomfichier, true)}><Icon name="download" size={16} /></button>
                                <button className="danger" title={t('Supprimer')} onClick={() => removeResponse(r.afb_documentid, d.afb_documentid)}><Icon name="trash" size={16} /></button>
                              </div>
                            ))
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
                })
              })()}
            </tbody>
          </table>
        </div>
      )}

      {showRequest && (
        <div
          onClick={() => !sendingReq && setShowRequest(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,20,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}
        >
          <div
            className="card card--pad"
            onClick={(e) => e.stopPropagation()}
            style={{ width: 480, maxWidth: '96vw' }}
          >
            <h3 style={{ margin: '0 0 4px', color: 'var(--ink)', fontSize: 17 }}>{t('Demander un document à AFB')}</h3>
            <p style={{ margin: '0 0 16px', color: 'var(--muted)', fontSize: 13 }}>
              {t('Demandez à Afriland First Bank de mettre un document précis à votre disposition sur la plateforme. Votre demande est envoyée par e-mail à la banque.')}
            </p>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
              {t('Nom du document (optionnel)')}
            </label>
            <input
              className="input"
              value={reqName}
              onChange={(e) => setReqName(e.target.value)}
              placeholder={t('Ex. Attestation de bonne exécution 2026')}
              style={{ width: '100%', marginBottom: 14 }}
            />
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
              {t('Votre demande')} <span style={{ color: '#c8102e' }}>*</span>
            </label>
            <textarea
              className="input"
              value={reqMsg}
              onChange={(e) => setReqMsg(e.target.value)}
              rows={5}
              placeholder={t('Décrivez le document dont vous avez besoin, le contexte, l’échéance souhaitée, la référence…')}
              style={{ width: '100%', marginBottom: 18, resize: 'vertical' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn--ghost" style={{ width: 'auto' }} disabled={sendingReq} onClick={() => setShowRequest(false)}>
                {t('Annuler')}
              </button>
              <button className="btn" style={{ width: 'auto' }} disabled={sendingReq} onClick={submitRequest}>
                {sendingReq ? t('Envoi…') : t('Envoyer la demande')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
