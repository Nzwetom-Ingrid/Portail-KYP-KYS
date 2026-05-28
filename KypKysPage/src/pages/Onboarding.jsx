import { useState } from 'react'
import Icon from '../components/Icon'
import { submitOnboarding } from '../services/portal'

const STEPS = [
  { title: 'Type de profil', desc: 'Choisissez votre type d’enregistrement', icon: 'handshake' },
  { title: 'Informations entreprise', desc: 'Identité et coordonnées légales', icon: 'building' },
  { title: 'Représentant légal', desc: 'Personne habilitée à signer', icon: 'user' },
  { title: 'Pièces justificatives', desc: 'Documents requis pour la conformité', icon: 'folder' },
  { title: 'Validation', desc: 'Vérifiez et soumettez votre dossier', icon: 'shield' },
]

const REQUIRED_DOCS = [
  'Registre de commerce (RCCM)',
  'Statuts de la société',
  'Attestation fiscale',
  "Pièce d’identité du représentant légal",
]

export default function Onboarding({ notify }) {
  const [step, setStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    profil: '',
    raisonSociale: '',
    formeJuridique: 'SA',
    rccm: '',
    secteur: '',
    pays: 'Cameroun',
    adresse: '',
    email: '',
    telephone: '',
    repNom: '',
    repFonction: '',
    repEmail: '',
    repTelephone: '',
    repPiece: 'CNI',
    consent: false,
  })
  const [docs, setDocs] = useState({})

  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const progress = Math.round(((step + 1) / STEPS.length) * 100)

  const canNext = () => {
    if (step === 0) return !!form.profil
    if (step === 1) return form.raisonSociale && form.rccm && form.email
    if (step === 2) return form.repNom && form.repFonction && form.repEmail
    if (step === 4) return form.consent
    return true
  }

  const [submitting, setSubmitting] = useState(false)

  const next = async () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1)
      return
    }
    setSubmitting(true)
    try {
      await submitOnboarding(form)
      setSubmitted(true)
      notify('Votre dossier a été soumis à la conformité 🎉')
    } catch (e) {
      notify(`Soumission impossible : ${e.message}`)
    } finally {
      setSubmitting(false)
    }
  }
  const prev = () => setStep((s) => Math.max(0, s - 1))

  if (submitted) {
    return (
      <div className="page">
        <div className="card card--pad">
          <div className="success-state">
            <span className="success-state__icon"><Icon name="check" size={36} /></span>
            <h2>Dossier soumis avec succès</h2>
            <p style={{ maxWidth: 460 }}>
              Votre dossier d’onboarding {form.profil === 'kys' ? 'KYS (fournisseur)' : 'KYP (partenaire)'} a
              bien été transmis. L’équipe conformité vous répondra sous 48 h ouvrées.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button className="btn btn--primary" onClick={() => { setSubmitted(false); setStep(0) }}>
                <Icon name="grid" size={18} /> Retour au tableau de bord
              </button>
              <button className="btn btn--ghost" onClick={() => notify('Récépissé téléchargé.')}>
                <Icon name="download" size={18} /> Télécharger le récépissé
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="wizard">
        {/* Stepper */}
        <div className="stepper">
          {STEPS.map((s, i) => (
            <button
              key={s.title}
              type="button"
              className={`stepper__item ${i === step ? 'is-active' : ''} ${i < step ? 'is-done' : ''}`}
              onClick={() => i <= step && setStep(i)}
            >
              <span className="stepper__num">
                {i < step ? <Icon name="check" size={15} /> : i + 1}
              </span>
              <span className="stepper__txt">
                <strong>{s.title}</strong>
                <span>{s.desc}</span>
              </span>
            </button>
          ))}
        </div>

        {/* Panel */}
        <div className="card wizard__panel">
          <div className="wizard__progress"><i style={{ width: `${progress}%` }} /></div>
          <h2 className="wizard__title">{STEPS[step].title}</h2>
          <p className="wizard__desc">{STEPS[step].desc}</p>

          {/* Étape 0 — Type */}
          {step === 0 && (
            <div className="type-grid">
              {[
                { id: 'kyp', icon: 'handshake', t: 'KYP — Partenaire', d: 'Vous nouez une relation d’affaires en tant que partenaire commercial.' },
                { id: 'kys', icon: 'truck', t: 'KYS — Fournisseur', d: 'Vous fournissez des biens ou services et devez être référencé.' },
              ].map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={`type-card ${form.profil === o.id ? 'is-selected' : ''}`}
                  onClick={() => setForm((f) => ({ ...f, profil: o.id }))}
                >
                  <div className="type-card__icon"><Icon name={o.icon} size={26} /></div>
                  <h4>{o.t}</h4>
                  <p>{o.d}</p>
                  <span className="type-card__check">
                    <Icon name={form.profil === o.id ? 'check' : 'plus'} size={16} />
                    {form.profil === o.id ? 'Sélectionné' : 'Choisir ce profil'}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Étape 1 — Entreprise */}
          {step === 1 && (
            <div className="form-grid">
              <div className="field field--full">
                <label>Raison sociale <span className="req">*</span></label>
                <input value={form.raisonSociale} onChange={set('raisonSociale')} placeholder="Ex. Sahel Logistics SARL" />
              </div>
              <div className="field">
                <label>Forme juridique</label>
                <select value={form.formeJuridique} onChange={set('formeJuridique')}>
                  <option>SA</option><option>SARL</option><option>SAS</option>
                  <option>GIE</option><option>Établissement individuel</option>
                </select>
              </div>
              <div className="field">
                <label>N° RCCM <span className="req">*</span></label>
                <input value={form.rccm} onChange={set('rccm')} placeholder="RC/DLA/2026/B/1234" />
              </div>
              <div className="field">
                <label>Secteur d’activité</label>
                <input value={form.secteur} onChange={set('secteur')} placeholder="Ex. Transport & logistique" />
              </div>
              <div className="field">
                <label>Pays</label>
                <select value={form.pays} onChange={set('pays')}>
                  <option>Cameroun</option><option>Côte d’Ivoire</option>
                  <option>Sénégal</option><option>Guinée équatoriale</option><option>RDC</option>
                </select>
              </div>
              <div className="field field--full">
                <label>Adresse du siège</label>
                <input value={form.adresse} onChange={set('adresse')} placeholder="Avenue, ville…" />
              </div>
              <div className="field">
                <label>Email professionnel <span className="req">*</span></label>
                <input type="email" value={form.email} onChange={set('email')} placeholder="contact@entreprise.com" />
              </div>
              <div className="field">
                <label>Téléphone</label>
                <input value={form.telephone} onChange={set('telephone')} placeholder="+237 6 00 00 00 00" />
              </div>
            </div>
          )}

          {/* Étape 2 — Représentant */}
          {step === 2 && (
            <div className="form-grid">
              <div className="field">
                <label>Nom complet <span className="req">*</span></label>
                <input value={form.repNom} onChange={set('repNom')} placeholder="Prénom et nom" />
              </div>
              <div className="field">
                <label>Fonction <span className="req">*</span></label>
                <input value={form.repFonction} onChange={set('repFonction')} placeholder="Ex. Directeur Général" />
              </div>
              <div className="field">
                <label>Email <span className="req">*</span></label>
                <input type="email" value={form.repEmail} onChange={set('repEmail')} placeholder="nom@entreprise.com" />
              </div>
              <div className="field">
                <label>Téléphone</label>
                <input value={form.repTelephone} onChange={set('repTelephone')} placeholder="+237 6 00 00 00 00" />
              </div>
              <div className="field field--full">
                <label>Type de pièce d’identité</label>
                <select value={form.repPiece} onChange={set('repPiece')}>
                  <option>CNI</option><option>Passeport</option><option>Carte de séjour</option>
                </select>
                <span className="field__hint">La pièce sera à déposer à l’étape suivante.</span>
              </div>
            </div>
          )}

          {/* Étape 3 — Documents */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {REQUIRED_DOCS.map((d) => (
                <div
                  key={d}
                  className="card"
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}
                >
                  <span className="doc-name__icon"><Icon name="fileText" size={20} /></span>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: 'var(--ink)', fontSize: 14, display: 'block' }}>{d}</strong>
                    <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                      {docs[d] ? docs[d] : 'PDF, JPG ou PNG · 10 Mo max'}
                    </span>
                  </div>
                  {docs[d] ? (
                    <span className="badge badge--success"><Icon name="check" size={13} /> Ajouté</span>
                  ) : (
                    <button
                      className="btn btn--soft btn--sm"
                      onClick={() => { setDocs((p) => ({ ...p, [d]: `${d.split(' ')[0].toLowerCase()}.pdf` })); notify('Fichier ajouté.') }}
                    >
                      <Icon name="upload" size={15} /> Déposer
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Étape 4 — Validation */}
          {step === 4 && (
            <div>
              <dl className="recap">
                <div className="recap__row"><dt>Type de profil</dt><dd>{form.profil === 'kys' ? 'KYS — Fournisseur' : form.profil === 'kyp' ? 'KYP — Partenaire' : '—'}</dd></div>
                <div className="recap__row"><dt>Raison sociale</dt><dd>{form.raisonSociale || '—'}</dd></div>
                <div className="recap__row"><dt>Forme juridique</dt><dd>{form.formeJuridique}</dd></div>
                <div className="recap__row"><dt>N° RCCM</dt><dd>{form.rccm || '—'}</dd></div>
                <div className="recap__row"><dt>Pays</dt><dd>{form.pays}</dd></div>
                <div className="recap__row"><dt>Email</dt><dd>{form.email || '—'}</dd></div>
                <div className="recap__row"><dt>Représentant</dt><dd>{form.repNom || '—'}</dd></div>
                <div className="recap__row"><dt>Documents déposés</dt><dd>{Object.keys(docs).length} / {REQUIRED_DOCS.length}</dd></div>
              </dl>
              <div className="consent">
                <input id="consent" type="checkbox" checked={form.consent} onChange={set('consent')} />
                <label htmlFor="consent">
                  Je certifie l’exactitude des informations fournies et autorise Afriland First Bank à
                  les traiter dans le cadre de la procédure de connaissance client (KYP / KYS).
                </label>
              </div>
            </div>
          )}

          {/* Footer navigation */}
          <div className="wizard__foot">
            <button className="btn btn--ghost" onClick={prev} disabled={step === 0}>
              <Icon name="arrowLeft" size={18} /> Précédent
            </button>
            <button className="btn btn--primary" onClick={next} disabled={!canNext() || submitting}>
              {submitting
                ? 'Envoi…'
                : step === STEPS.length - 1
                ? 'Soumettre le dossier'
                : 'Continuer'}
              <Icon name={step === STEPS.length - 1 ? 'check' : 'arrowRight'} size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
