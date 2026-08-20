import { useEffect, useState } from 'react'
import Icon from '../components/Icon'
import { useT } from '../i18n/i18n'
import { submitOnboarding, getCurrentTiers, loadDocumentCategories, uploadDocument } from '../services/portal'
import { COUNTRIES } from '../config/countries'
import { SECTOR_GROUPS, isKnownSector } from '../config/sectors'
import {
  ACCEPT_DOCUMENT,
  ACCEPT_IDENTITY,
  acceptAttr,
  acceptLabel,
  PHONE_HINT,
  validateFile,
  validatePhone,
} from '../utils/validation'

// Persistance locale : la progression de l'onboarding (formulaire, étape, docs,
// soumission) est sauvegardée dans le navigateur pour survivre à une navigation
// ou un rechargement. Une fois soumis, l'état « soumis » reste.
const STORAGE_KEY = 'afb_onboarding_v1'
function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
  } catch {
    return null
  }
}

// Mappe un document requis (par mot-clé) vers une catégorie Dataverse.
function pickCategoryId(docLabel, categories) {
  if (!categories.length) return null
  const l = docLabel.toLowerCase()
  const kw = l.includes('registre') || l.includes('rccm') ? 'registre'
    : l.includes('statut') ? 'statut'
    : l.includes('fiscal') ? 'fiscal'
    : l.includes('identité') || l.includes('identite') ? 'identité'
    : null
  const match = kw && categories.find((c) => (c.label || '').toLowerCase().includes(kw))
  return (match || categories[0]).id
}

// Types d'enregistrement possibles. Le choix appartient a AFB : cette liste ne
// sert qu'a presenter au tiers le type retenu pour son dossier.
const PROFILS = [
  { id: 'kyp', icon: 'handshake', t: 'KYP — Partenaire', d: 'Vous nouez une relation d’affaires en tant que partenaire commercial.' },
  { id: 'kys', icon: 'truck', t: 'KYS — Fournisseur', d: 'Vous fournissez des biens ou services et devez être référencé.' },
]

const STEPS = [
  { title: 'Type de dossier', desc: 'Défini par Afriland First Bank', icon: 'handshake' },
  { title: 'Informations entreprise', desc: 'Identité et coordonnées légales', icon: 'building' },
  { title: 'Représentant légal', desc: 'Personne habilitée à signer', icon: 'user' },
  { title: 'Pièces justificatives', desc: 'Documents requis pour la conformité', icon: 'folder' },
  { title: 'Validation', desc: 'Vérifiez et soumettez votre dossier', icon: 'shield' },
]

// Chaque pièce porte son propre jeu de formats : la pièce d’identité est exigée
// en PDF (une photo de CNI est retouchable et souvent illisible à l’écran de la
// conformité), les autres acceptent aussi les images.
const REQUIRED_DOCS = [
  { label: 'Registre de commerce (RCCM ou équivalent)', accept: ACCEPT_DOCUMENT },
  { label: 'Statuts de la société', accept: ACCEPT_DOCUMENT },
  { label: 'Attestation fiscale', accept: ACCEPT_DOCUMENT },
  { label: 'Pièce d’identité du représentant légal', accept: ACCEPT_IDENTITY },
]

export default function Onboarding({ notify }) {
  const { t } = useT()
  const _saved = loadSaved()
  const [step, setStep] = useState(_saved?.step ?? 0)
  const [submitted, setSubmitted] = useState(_saved?.submitted ?? false)
  const [form, setForm] = useState(_saved?.form ?? {
    profil: '',
    raisonSociale: '',
    formeJuridique: 'SA',
    rccm: '',
    secteur: '',
    pays: 'Cameroun',
    ville: '',
    swift: '',
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
  const [docs, setDocs] = useState(_saved?.docs ?? {})
  const [tiersId, setTiersId] = useState(null)

  // Sauvegarde à chaque changement → survit à la navigation / au rechargement.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ form, step, docs, submitted }))
    } catch {
      /* quota / mode privé : on ignore */
    }
  }, [form, step, docs, submitted])
  const [categories, setCategories] = useState([])
  const [uploadingDoc, setUploadingDoc] = useState(null)
  // La fiche tiers est créée par AFB à l'initiation : on pré-remplit ce qu'on connaît
  // déjà (raison sociale, pays, type, RCCM, contact) pour éviter une double saisie.
  const [prefilled, setPrefilled] = useState(false)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [t, cats] = await Promise.all([getCurrentTiers(), loadDocumentCategories().catch(() => [])])
        if (cancelled) return
        setCategories(cats || [])
        if (!t) return
        setTiersId(t.afb_tiersid || null)
        // Pré-remplissage : uniquement les champs encore vides (les valeurs déjà
        // saisies / restaurées du localStorage restent prioritaires).
        setForm((f) => ({
          ...f,
          // Le type vient d'AFB et prime TOUJOURS sur ce qui traîne en local :
          // contrairement aux autres champs, ce n'est pas une saisie du tiers.
          profil: t.afb_type === 'KYS' ? 'kys' : 'kyp',
          raisonSociale: f.raisonSociale || t.afb_nomdupartenaire || '',
          rccm: f.rccm || t.afb_numerorccmimmatriculation || '',
          secteur: f.secteur || t.afb_secteurdactivite || '',
          pays: f.pays || t.afb_pays || '',
          ville: f.ville || t.afb_ville || '',
          swift: f.swift || t.afb_codeswiftbic || '',
          adresse: f.adresse || t.afb_adressecomplete || '',
          email: f.email || t.afb_emailcontactprincipal || '',
          telephone: f.telephone || t.afb_telephone || '',
        }))
        setPrefilled(true)
      } catch {
        /* valeurs par défaut conservées */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Téléversement réel d'une pièce justificative vers Dataverse.
  const handleDocFile = async (doc, file) => {
    if (!file) return
    if (!tiersId) {
      notify('Aucune fiche tiers rattachée à votre compte — téléversement impossible.')
      return
    }
    // Contrôle AVANT envoi : l'attribut `accept` de l'input ne filtre que la
    // boîte de dialogue, l'utilisateur peut toujours forcer « tous les fichiers ».
    const invalid = validateFile(file, { accept: doc.accept })
    if (invalid) {
      notify(invalid)
      return
    }
    const categoryId = pickCategoryId(doc.label, categories)
    if (!categoryId) {
      notify('Catégories de documents indisponibles. Contactez votre chargé de relation AFB.')
      return
    }
    setUploadingDoc(doc.label)
    try {
      await uploadDocument(tiersId, file, { categoryId })
      setDocs((p) => ({ ...p, [doc.label]: file.name }))
      notify(`${file.name} téléversé.`)
    } catch (e) {
      notify(`Téléversement impossible : ${e.message}`)
    } finally {
      setUploadingDoc(null)
    }
  }

  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  // Les erreurs de format ne s'affichent qu'une fois le champ quitté : signaler
  // « numéro trop court » dès la première touche tapée est agressif et inutile.
  const [touched, setTouched] = useState({})
  const touch = (k) => () => setTouched((p) => ({ ...p, [k]: true }))
  const phoneError = (k) => (touched[k] ? validatePhone(form[k]) : null)

  const progress = Math.round(((step + 1) / STEPS.length) * 100)

  const canNext = () => {
    // Etape 0 : rien a saisir, le type vient d'AFB — on ne bloque pas dessus.
    if (step === 0) return true
    // Le téléphone reste facultatif, mais s'il est renseigné il doit être valide :
    // un numéro inexploitable bloque la conformité au moment de joindre le tiers.
    if (step === 1) return form.raisonSociale && form.rccm && form.email && !validatePhone(form.telephone)
    if (step === 2) return form.repNom && form.repFonction && form.repEmail && !validatePhone(form.repTelephone)
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
      notify(t('Votre dossier a été soumis à la conformité 🎉'))
    } catch (e) {
      notify(`Soumission impossible : ${e.message}`)
    } finally {
      setSubmitting(false)
    }
  }
  const prev = () => setStep((s) => Math.max(0, s - 1))

  // Dossier soumis : on garde le stepper visible avec TOUTES les étapes cochées
  // (« terminé »), et le panneau affiche la confirmation. L'état est persisté.
  if (submitted) {
    return (
      <div className="page">
        <div className="wizard">
          <div className="stepper">
            {STEPS.map((s, i) => (
              <button
                key={s.title}
                type="button"
                className="stepper__item is-done"
                onClick={() => { setSubmitted(false); setStep(i) }}
                title={t('Revoir cette étape')}
              >
                <span className="stepper__num"><Icon name="check" size={15} /></span>
                <span className="stepper__txt">
                  <strong>{t(s.title)}</strong>
                  <span>{t(s.desc)}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="card wizard__panel">
            <div className="success-state">
              <span className="success-state__icon"><Icon name="check" size={36} /></span>
              <h2>{t('Dossier soumis avec succès')}</h2>
              <p style={{ maxWidth: 460 }}>
                {t('Votre dossier d’onboarding a bien été transmis. L’équipe conformité vous répondra sous 48 h ouvrées.')}
              </p>
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button className="btn btn--ghost" onClick={() => notify(t('Récépissé téléchargé.'))}>
                  <Icon name="download" size={18} /> {t('Télécharger le récépissé')}
                </button>
              </div>
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
                <strong>{t(s.title)}</strong>
                <span>{t(s.desc)}</span>
              </span>
            </button>
          ))}
        </div>

        {/* Panel */}
        <div className="card wizard__panel">
          <div className="wizard__progress"><i style={{ width: `${progress}%` }} /></div>
          <h2 className="wizard__title">{t(STEPS[step].title)}</h2>
          <p className="wizard__desc">{t(STEPS[step].desc)}</p>

          {/* Étape 0 — Type, déterminé par AFB et NON modifiable ici.
              Le type d'enregistrement découle de la nature de la relation
              d'affaires : c'est le chargé de relation qui la qualifie à la
              création de la fiche tiers, pas le partenaire. Laisser le tiers
              choisir ouvrait la porte à un fournisseur se déclarant partenaire,
              donc à la mauvaise liste de pièces et au mauvais parcours de
              conformité. L'étape reste affichée pour l'informer de son cas. */}
          {step === 0 && (
            <div className="type-grid">
              {PROFILS.map((o) => {
                const actif = form.profil === o.id
                return (
                  <div
                    key={o.id}
                    className={`type-card ${actif ? 'is-selected' : ''}`}
                    style={{ cursor: 'default', opacity: actif || !form.profil ? 1 : 0.5 }}
                    aria-current={actif ? 'true' : undefined}
                  >
                    <div className="type-card__icon"><Icon name={o.icon} size={26} /></div>
                    <h4>{t(o.t)}</h4>
                    <p>{t(o.d)}</p>
                    {actif && (
                      <span className="type-card__check">
                        <Icon name="check" size={16} /> {t('Votre type de dossier')}
                      </span>
                    )}
                  </div>
                )
              })}
              <div className="field field--full">
                <span className="field__hint">
                  {form.profil
                    ? t('Ce type est défini par Afriland First Bank à l’ouverture de votre dossier. Si vous pensez qu’il ne correspond pas à votre situation, contactez votre chargé de relation.')
                    : t('Votre type de dossier n’a pas encore été communiqué par Afriland First Bank. Vous pouvez poursuivre : il sera renseigné par votre chargé de relation.')}
                </span>
              </div>
            </div>
          )}

          {/* Étape 1 — Entreprise */}
          {step === 1 && (
            <div className="form-grid">
              {prefilled && (
                <div className="field field--full" style={{ marginBottom: 4 }}>
                  <span className="field__hint" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="check" size={14} /> {t('Certaines informations ont été pré-remplies à partir de votre fiche AFB — vérifiez et complétez.')}
                  </span>
                </div>
              )}
              <div className="field field--full">
                <label>{t('Raison sociale')} <span className="req">*</span></label>
                <input value={form.raisonSociale} onChange={set('raisonSociale')} placeholder="Ex. Sahel Logistics SARL" />
              </div>
              <div className="field">
                <label>{t('Forme juridique')}</label>
                <select value={form.formeJuridique} onChange={set('formeJuridique')}>
                  <option>SA</option><option>SARL</option><option>SAS</option>
                  <option>GIE</option><option>{t('Établissement individuel')}</option>
                </select>
              </div>
              <div className="field">
                <label>{t('Numéro de registre de commerce')} <span className="req">*</span></label>
                <input value={form.rccm} onChange={set('rccm')} placeholder="RC/DLA/2026/B/1234" />
                <span className="field__hint">
                  {t('RCCM en zone OHADA, ou le numéro d’immatriculation équivalent de votre pays.')}
                </span>
              </div>
              <div className="field">
                <label>{t('Secteur d’activité')}</label>
                <select value={form.secteur} onChange={set('secteur')}>
                  <option value="">{t('— Sélectionner —')}</option>
                  {/* Fiches créées avant la liste fermée : on garde la valeur libre
                      visible plutôt que de la faire disparaître sans prévenir. */}
                  {form.secteur && !isKnownSector(form.secteur) && (
                    <option value={form.secteur}>{form.secteur} ({t('valeur actuelle')})</option>
                  )}
                  {SECTOR_GROUPS.map((g) => (
                    <optgroup key={g.code} label={g.label}>
                      {g.items.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>{t('Pays')}</label>
                <select value={form.pays} onChange={set('pays')}>
                  <option value="">{t('— Sélectionner —')}</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>{t('Ville')}</label>
                <input value={form.ville} onChange={set('ville')} placeholder="Ex. Douala" />
              </div>
              <div className="field field--full">
                <label>{t('Adresse du siège')}</label>
                <input value={form.adresse} onChange={set('adresse')} placeholder={t('Avenue, quartier…')} />
              </div>
              <div className="field">
                <label>{t('Code SWIFT / BIC')}</label>
                <input value={form.swift} onChange={set('swift')} placeholder="Ex. AFLDCMCX" />
              </div>
              <div className="field">
                <label>{t('Email professionnel')} <span className="req">*</span></label>
                <input type="email" value={form.email} onChange={set('email')} placeholder="contact@entreprise.com" />
              </div>
              <div className="field">
                <label>{t('Téléphone')}</label>
                <input
                  type="tel"
                  value={form.telephone}
                  onChange={set('telephone')}
                  onBlur={touch('telephone')}
                  placeholder="+237 6 00 00 00 00"
                  aria-invalid={!!phoneError('telephone')}
                />
                <span className={`field__hint ${phoneError('telephone') ? 'field__hint--error' : ''}`}>
                  {phoneError('telephone') || t(PHONE_HINT)}
                </span>
              </div>
            </div>
          )}

          {/* Étape 2 — Représentant */}
          {step === 2 && (
            <div className="form-grid">
              <div className="field">
                <label>{t('Nom complet')} <span className="req">*</span></label>
                <input value={form.repNom} onChange={set('repNom')} placeholder={t('Prénom et nom')} />
              </div>
              <div className="field">
                <label>{t('Fonction')} <span className="req">*</span></label>
                <input value={form.repFonction} onChange={set('repFonction')} placeholder={t('Ex. Directeur Général')} />
              </div>
              <div className="field">
                <label>{t('Email')} <span className="req">*</span></label>
                <input type="email" value={form.repEmail} onChange={set('repEmail')} placeholder="nom@entreprise.com" />
              </div>
              <div className="field">
                <label>{t('Téléphone')}</label>
                <input
                  type="tel"
                  value={form.repTelephone}
                  onChange={set('repTelephone')}
                  onBlur={touch('repTelephone')}
                  placeholder="+237 6 00 00 00 00"
                  aria-invalid={!!phoneError('repTelephone')}
                />
                <span className={`field__hint ${phoneError('repTelephone') ? 'field__hint--error' : ''}`}>
                  {phoneError('repTelephone') || t(PHONE_HINT)}
                </span>
              </div>
              <div className="field field--full">
                <label>{t('Type de pièce d’identité')}</label>
                <select value={form.repPiece} onChange={set('repPiece')}>
                  <option>CNI</option><option>{t('Passeport')}</option><option>{t('Carte de séjour')}</option>
                </select>
                <span className="field__hint">{t('La pièce sera à déposer à l’étape suivante.')}</span>
              </div>
            </div>
          )}

          {/* Étape 3 — Documents */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {!tiersId && (
                <div className="field__hint" style={{ marginBottom: 4 }}>
                  {t('Aucune fiche tiers rattachée à votre compte : le téléversement sera disponible une fois votre compte lié par AFB.')}
                </div>
              )}
              {REQUIRED_DOCS.map((d) => (
                <div
                  key={d.label}
                  className="card"
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}
                >
                  <span className="doc-name__icon"><Icon name="fileText" size={20} /></span>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: 'var(--ink)', fontSize: 14, display: 'block' }}>{t(d.label)}</strong>
                    <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                      {docs[d.label] ? docs[d.label] : acceptLabel(d.accept)}
                    </span>
                  </div>
                  {docs[d.label] ? (
                    <span className="badge badge--success"><Icon name="check" size={13} /> {t('Ajouté')}</span>
                  ) : (
                    <label
                      className="btn btn--soft btn--sm"
                      style={{ cursor: tiersId && uploadingDoc !== d.label ? 'pointer' : 'not-allowed', opacity: tiersId ? 1 : 0.6 }}
                    >
                      <Icon name="upload" size={15} /> {uploadingDoc === d.label ? t('Envoi…') : t('Déposer')}
                      <input
                        type="file"
                        hidden
                        accept={acceptAttr(d.accept)}
                        disabled={!tiersId || uploadingDoc !== null}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          e.target.value = '' // permet de re-sélectionner le même fichier
                          handleDocFile(d, file)
                        }}
                      />
                    </label>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Étape 4 — Validation */}
          {step === 4 && (
            <div>
              <dl className="recap">
                <div className="recap__row"><dt>{t('Type de profil')}</dt><dd>{form.profil === 'kys' ? t('KYS — Fournisseur') : form.profil === 'kyp' ? t('KYP — Partenaire') : '—'}</dd></div>
                <div className="recap__row"><dt>{t('Raison sociale')}</dt><dd>{form.raisonSociale || '—'}</dd></div>
                <div className="recap__row"><dt>{t('Forme juridique')}</dt><dd>{form.formeJuridique}</dd></div>
                <div className="recap__row"><dt>{t('Numéro de registre de commerce')}</dt><dd>{form.rccm || '—'}</dd></div>
                <div className="recap__row"><dt>{t('Secteur d’activité')}</dt><dd>{form.secteur || '—'}</dd></div>
                <div className="recap__row"><dt>{t('Pays')}</dt><dd>{form.pays || '—'}</dd></div>
                <div className="recap__row"><dt>{t('Ville')}</dt><dd>{form.ville || '—'}</dd></div>
                <div className="recap__row"><dt>{t('Code SWIFT / BIC')}</dt><dd>{form.swift || '—'}</dd></div>
                <div className="recap__row"><dt>{t('Email')}</dt><dd>{form.email || '—'}</dd></div>
                <div className="recap__row"><dt>{t('Représentant')}</dt><dd>{form.repNom || '—'}</dd></div>
                <div className="recap__row"><dt>{t('Documents déposés')}</dt><dd>{Object.keys(docs).length} / {REQUIRED_DOCS.length}</dd></div>
              </dl>
              <div className="consent">
                <input id="consent" type="checkbox" checked={form.consent} onChange={set('consent')} />
                <label htmlFor="consent">
                  {t('Je certifie l’exactitude des données fournies et autorise Afriland First Bank à les traiter dans le cadre de notre relation.')}
                </label>
              </div>
            </div>
          )}

          {/* Footer navigation */}
          <div className="wizard__foot">
            <button className="btn btn--ghost" onClick={prev} disabled={step === 0}>
              <Icon name="arrowLeft" size={18} /> {t('Précédent')}
            </button>
            <button className="btn btn--primary" onClick={next} disabled={!canNext() || submitting}>
              {submitting
                ? t('Envoi…')
                : step === STEPS.length - 1
                ? t('Soumettre le dossier')
                : t('Continuer')}
              <Icon name={step === STEPS.length - 1 ? 'check' : 'arrowRight'} size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
