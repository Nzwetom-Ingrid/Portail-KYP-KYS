import { useEffect, useState } from 'react'
import Icon from '../components/Icon'
import SearchableSelect from '../components/SearchableSelect'
import { useT } from '../i18n/i18n'
import {
  submitOnboarding,
  getCurrentTiers,
  loadDocumentCategories,
  loadDossier,
  uploadDocument,
  loadGerants,
  saveGerant,
  deleteGerant,
  loadUbos,
  submitUbo,
  loadDocuments,
  deleteDocument,
  getDocumentFile,
  MAX_GERANTS_DEFAUT,
} from '../services/portal'
import { parseRequiredDocs, entityTypeFromRef } from '../config/requiredDocs'
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

// Persistance locale : la progression de l'onboarding (formulaire, étape,
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
  { id: 'kyp', icon: 'handshake', t: 'KYP — Partenaire', d: 'Vous êtes une contrepartie financière : banque correspondante ou établissement de microfinance.' },
  { id: 'kys', icon: 'truck', t: 'KYS — Fournisseur', d: 'Vous livrez des biens ou des services à la banque et devez être référencé.' },
]

const STEPS = [
  { title: 'Type de dossier', desc: 'Défini par Afriland First Bank', icon: 'handshake' },
  { title: 'Informations entreprise', desc: 'Identité et coordonnées légales', icon: 'building' },
  { title: 'Direction', desc: 'Gérants et représentant légal', icon: 'user' },
  { title: 'Bénéficiaires effectifs', desc: 'Détenteurs de 25 % ou plus', icon: 'users' },
  { title: 'Pièces justificatives', desc: 'Documents requis pour la conformité', icon: 'folder' },
  { title: 'Validation', desc: 'Vérifiez et soumettez votre dossier', icon: 'shield' },
]

/**
 * Formats acceptés pour une pièce.
 *
 * Une pièce d'identité est exigée en PDF : une photo de CNI est retouchable, et
 * souvent illisible à l'écran de la conformité. Les autres acceptent les images.
 * La règle porte sur la clé de la pièce, pas sur son libellé, qui peut être
 * réécrit par le chargé de relation à la création du dossier.
 */
const CLES_IDENTITE = ['cni', 'identite', 'passeport', 'piece']

function acceptPourPiece(cle) {
  const c = String(cle || '').toLowerCase()
  return CLES_IDENTITE.some((k) => c.includes(k)) ? ACCEPT_IDENTITY : ACCEPT_DOCUMENT
}

/** Décode une pièce jointe renvoyée en base64 par Dataverse. */
function b64ToBlob(b64, mime) {
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime || 'application/octet-stream' })
}

/** Statut d'une pièce, tel que le tiers doit le lire. */
const STATUT_PIECE = {
  Valide: { label: 'Validé', cls: 'badge--success' },
  EnRevue: { label: 'En revue', cls: 'badge--info' },
  Expire: { label: 'Expiré', cls: 'badge--danger' },
  Rejete: { label: 'Refusé', cls: 'badge--danger' },
  Remplace: { label: 'Remplacé', cls: 'badge--muted' },
}

/** Un gérant vierge. Le premier ajouté est le représentant légal par défaut. */
function gerantVide(premier = false) {
  return {
    id: null,
    nom: '',
    fonction: '',
    email: '',
    telephone: '',
    typePiece: 0,
    numeroPiece: '',
    nationalite: '',
    dateNaissance: '',
    representant: premier,
  }
}

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
  const [tiersId, setTiersId] = useState(null)

  // Sauvegarde à chaque changement → survit à la navigation / au rechargement.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ form, step, submitted }))
    } catch {
      /* quota / mode privé : on ignore */
    }
  }, [form, step, submitted])
  const [categories, setCategories] = useState([])
  const [uploadingDoc, setUploadingDoc] = useState(null)
  // La fiche tiers est créée par AFB à l'initiation : on pré-remplit ce qu'on connaît
  // déjà (raison sociale, pays, type, RCCM, contact) pour éviter une double saisie.
  const [prefilled, setPrefilled] = useState(false)

  /**
   * Pièces réellement attendues pour CE dossier.
   *
   * L'écran affichait quatre pièces en dur — RCCM, statuts, attestation fiscale,
   * pièce d'identité — quel que soit le partenaire. Une banque correspondante en
   * attend dix, dont le questionnaire Wolfsberg et le formulaire FATCA : elle ne
   * voyait donc jamais, à l'onboarding, ce qu'on lui demandait vraiment. La liste
   * vient désormais du dossier, comme dans « Mes documents ».
   */
  const [piecesRequises, setPiecesRequises] = useState([])

  /**
   * Pièces réellement déposées, indexées par clé de checklist.
   *
   * L'écran s'appuyait sur un état local persisté dans le navigateur : une pièce
   * déposée depuis « Mes documents » n'y apparaissait pas, et une pièce déposée
   * ici restait marquée « Ajouté » même après suppression ailleurs. Deux écrans,
   * deux vérités. La source est désormais Dataverse, des deux côtés.
   */
  const [piecesDeposees, setPiecesDeposees] = useState({})
  const [pieceEnCours, setPieceEnCours] = useState(null)

  const rafraichirPieces = async (id) => {
    if (!id) return
    const docs = await loadDocuments(id).catch(() => [])
    const parCle = {}
    for (const d of docs) {
      const cle = d.afb_typedocument
      // On garde la plus récente par clé : un remplacement laisse l'ancienne
      // version en base, marquée « Remplacé ».
      if (!cle) continue
      const actuelle = parCle[cle]
      if (!actuelle || new Date(d.createdon || 0) > new Date(actuelle.createdon || 0)) {
        parCle[cle] = d
      }
    }
    setPiecesDeposees(parCle)
  }

  /**
   * Gérants du tiers.
   *
   * L'écran ne prévoyait qu'un « représentant légal », dont aucun champ n'était
   * d'ailleurs enregistré. Une société en a rarement un seul, et la conformité
   * doit tous les connaître : c'est sur eux que porte le screening de sanctions.
   * Le nombre est saisi à l'étape précédente, et se corrige ici — découvrir un
   * troisième gérant en cours de saisie ne doit pas obliger à revenir en arrière.
   */
  const [gerants, setGerants] = useState([gerantVide(true)])
  const [maxGerants, setMaxGerants] = useState(MAX_GERANTS_DEFAUT)
  // Gérants retirés d'un dossier déjà enregistré : à supprimer à la soumission.
  const [gerantsRetires, setGerantsRetires] = useState([])
  /**
   * Bénéficiaires effectifs.
   *
   * Ceux déjà déclarés sont relus et affichés en lecture seule ; les nouveaux se
   * saisissent dans des cartes, comme les gérants, et partent à la soumission.
   *
   * La première version demandait un « Enregistrer » à l'intérieur de la carte,
   * alors que toutes les autres étapes se remplissent et se poursuivent par
   * « Continuer ». Quiconque enchaînait perdait sa saisie sans un mot — et rien
   * à l'écran ne l'en avertissait.
   */
  const [ubos, setUbos] = useState([])
  const [nouveauxUbos, setNouveauxUbos] = useState([])

  const majUbo = (i, champ, valeur) =>
    setNouveauxUbos((u) => u.map((x, k) => (k === i ? { ...x, [champ]: valeur } : x)))
  const ajouterUbo = () =>
    setNouveauxUbos((u) => [...u, { nom: '', nationalite: '', pourcentage: '', dateNaissance: '' }])
  const retirerUbo = (i) => setNouveauxUbos((u) => u.filter((_, k) => k !== i))

  const majGerant = (i, champ, valeur) =>
    setGerants((g) => g.map((x, k) => (k === i ? { ...x, [champ]: valeur } : x)))

  // Un seul représentant légal : cocher l'un décoche les autres.
  const designerRepresentant = (i) =>
    setGerants((g) => g.map((x, k) => ({ ...x, representant: k === i })))

  const ajouterGerant = () =>
    setGerants((g) => (g.length >= maxGerants ? g : [...g, gerantVide(g.length === 0)]))

  const retirerGerant = (i) =>
    setGerants((g) => {
      const cible = g[i]
      if (cible?.id) setGerantsRetires((r) => [...r, cible.id])
      const reste = g.filter((_, k) => k !== i)
      // Le dernier retrait ne doit pas laisser le dossier sans représentant.
      if (reste.length && !reste.some((x) => x.representant)) reste[0] = { ...reste[0], representant: true }
      return reste.length ? reste : [gerantVide(true)]
    })

  /** Ajuste le nombre de cartes à la valeur saisie à l'étape précédente. */
  const reglerNombreGerants = (n) => {
    const cible = Math.max(1, Math.min(Number(n) || 1, maxGerants))
    setGerants((g) => {
      if (g.length === cible) return g
      if (g.length < cible) {
        return [...g, ...Array.from({ length: cible - g.length }, () => gerantVide(false))]
      }
      const reduit = g.slice(0, cible)
      if (!reduit.some((x) => x.representant)) reduit[0] = { ...reduit[0], representant: true }
      return reduit
    })
  }
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [t, cats] = await Promise.all([getCurrentTiers(), loadDocumentCategories().catch(() => [])])
        if (cancelled) return
        setCategories(cats || [])
        if (!t) return
        setTiersId(t.afb_tiersid || null)

        // Checklist personnalisée du tiers si elle existe, sinon celle du type
        // d'entité — le type se lit sur le préfixe de la référence du dossier.
        if (t.afb_max_gerants) setMaxGerants(t.afb_max_gerants)

        if (t.afb_tiersid) {
          const [dejaLa, uboRows] = await Promise.all([
            loadGerants(t.afb_tiersid).catch(() => []),
            loadUbos(t.afb_tiersid).catch(() => []),
            rafraichirPieces(t.afb_tiersid),
          ])
          if (!cancelled) {
            // Une reprise d'onboarding ne doit pas redemander ce qui est déjà saisi.
            if (dejaLa.length) setGerants(dejaLa)
            setUbos(uboRows)
          }
          const dossier = await loadDossier(t.afb_tiersid).catch(() => null)
          if (!cancelled) {
            const type = entityTypeFromRef(dossier?.afb_reference) || t.afb_entity_type
            setPiecesRequises(parseRequiredDocs(t.afb_documentsrequis, type))
          }
        }
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
    const categoryId = pickCategoryId(doc.name, categories)
    if (!categoryId) {
      notify('Catégories de documents indisponibles. Contactez votre chargé de relation AFB.')
      return
    }
    setUploadingDoc(doc.key)
    try {
      // La CLÉ de la pièce est transmise : sans elle, le document arrivait sans
      // rattachement et la checklist de « Mes documents » restait à zéro alors
      // que le partenaire venait de tout déposer.
      await uploadDocument(tiersId, file, { categoryId, docType: doc.key })
      await rafraichirPieces(tiersId)
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
    // Chaque gérant doit être identifiable et joignable, et l'un d'eux doit
    // engager la société : un dossier sans signataire désigné n'est pas
    // exploitable par la conformité.
    if (step === 2) {
      return (
        gerants.length > 0 &&
        gerants.every(
          (g) => g.nom.trim() && g.fonction.trim() && /^\S+@\S+\.\S+$/.test(g.email.trim()) && !validatePhone(g.telephone),
        ) &&
        gerants.some((g) => g.representant)
      )
    }
    // Les bénéficiaires effectifs peuvent être déclarés plus tard, depuis
    // « Mes bénéficiaires » : bloquer ici arrêterait un partenaire qui n'a pas
    // encore la chaîne de détention sous la main.
    if (step === 3) return true
    if (step === 5) return form.consent && piecesManquantes.length === 0
    return true
  }

  const [submitting, setSubmitting] = useState(false)

  /**
   * Pièces obligatoires non déposées.
   *
   * Un dossier soumis sans ses pièces obligatoires oblige la conformité à le
   * rejeter et le partenaire à tout reprendre : personne n'y gagne. Le blocage
   * porte sur la SOUMISSION, pas sur la navigation — le partenaire doit pouvoir
   * atteindre le récapitulatif pour voir exactement ce qui lui manque.
   *
   * Les pièces facultatives n'entrent pas dans le compte : le chargé de relation
   * les a explicitement décochées à la création du dossier.
   */
  const piecesManquantes = piecesRequises.filter((p) => p.mandatory && !piecesDeposees[p.key])

  const voirPiece = async (d) => {
    try {
      const fichier = await getDocumentFile(d.afb_documentid)
      if (fichier.url) {
        window.open(fichier.url, '_blank', 'noopener')
        return
      }
      const url = URL.createObjectURL(b64ToBlob(fichier.base64, fichier.mimetype))
      window.open(url, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (e) {
      notify(`${t('Aperçu impossible :')} ${e.message}`)
    }
  }

  const supprimerPiece = async (d) => {
    setPieceEnCours(d.afb_typedocument)
    try {
      await deleteDocument(d.afb_documentid)
      await rafraichirPieces(tiersId)
      notify(t('Pièce supprimée.'))
    } catch (e) {
      notify(`${t('Suppression impossible :')} ${e.message}`)
    } finally {
      setPieceEnCours(null)
    }
  }

  const next = async () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1)
      return
    }
    setSubmitting(true)
    try {
      await submitOnboarding(form)

      // Les gérants sont enregistrés à la soumission, dans l'ordre des cartes.
      // Échec non bloquant : la fiche entreprise est déjà passée, et perdre la
      // soumission entière pour un gérant refusé serait disproportionné — la
      // conformité verra le dossier et pourra réclamer.
      if (tiersId) {
        try {
          for (const id of gerantsRetires) await deleteGerant(id).catch(() => null)
          setGerantsRetires([])
          const aEnregistrer = gerants.filter((g) => g.nom.trim())
          for (let i = 0; i < aEnregistrer.length; i += 1) {
            await saveGerant(tiersId, aEnregistrer[i], i)
          }
          setGerants(await loadGerants(tiersId).catch(() => gerants))

          for (const u of nouveauxUbos.filter((x) => x.nom.trim())) {
            await submitUbo(tiersId, {
              nom: u.nom.trim(),
              nationalite: u.nationalite.trim(),
              pourcentage: Number(u.pourcentage) || 0,
              dateNaissance: u.dateNaissance || null,
              typeEntite: 'physique',
            })
          }
          setNouveauxUbos([])
          setUbos(await loadUbos(tiersId).catch(() => ubos))
        } catch (e) {
          notify(`${t('Dossier soumis, mais la direction ou les bénéficiaires n’ont pas pu être enregistrés :')} ${e.message}`)
        }
      }

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
                {/* 110 secteurs : la recherche est indispensable, faire défiler
                    vingt groupes à l'aveugle ne mène nulle part. */}
                <SearchableSelect
                  value={form.secteur}
                  onChange={set('secteur')}
                  groups={[
                    // Fiches créées avant la liste fermée : on garde la valeur
                    // libre visible plutôt que de la faire disparaître sans rien dire.
                    ...(form.secteur && !isKnownSector(form.secteur)
                      ? [{ label: t('Valeur actuelle'), options: [{ label: form.secteur, value: form.secteur }] }]
                      : []),
                    ...SECTOR_GROUPS.map((g) => ({
                      label: g.label,
                      options: g.items.map((s) => ({ label: s, value: s })),
                    })),
                  ]}
                />
              </div>
              <div className="field">
                <label>{t('Pays')}</label>
                {/* Près de 200 pays : même raison que pour les secteurs. */}
                <SearchableSelect
                  value={form.pays}
                  onChange={set('pays')}
                  options={COUNTRIES.map((c) => ({ label: c, value: c }))}
                />
              </div>
              <div className="field">
                <label>{t('Ville')}</label>
                <input value={form.ville} onChange={set('ville')} placeholder="Ex. Douala" />
              </div>
              <div className="field field--full">
                <label>{t('Adresse du siège')}</label>
                <input value={form.adresse} onChange={set('adresse')} placeholder={t('Avenue, quartier…')} />
              </div>
              {/* Le nombre de gérants est saisi ici et commande le nombre de
                  cartes de l'étape suivante. Il reste corrigeable là-bas :
                  découvrir un gérant de plus en cours de saisie ne doit pas
                  obliger à revenir sur ses pas. */}
              <div className="field">
                <label>{t('Nombre de gérants')}</label>
                <input
                  type="number"
                  min="1"
                  max={maxGerants}
                  value={gerants.length}
                  onChange={(e) => reglerNombreGerants(e.target.value)}
                />
                <span className="field__hint">
                  {t('Autant de fiches à renseigner à l’étape suivante.')} {t('Maximum')} {maxGerants}.
                </span>
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

          {/* Étape 2 — Direction : autant de cartes que de gérants annoncés */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {gerants.map((g, i) => (
                <div key={i} className="card card--pad">
                  <div className="section-head" style={{ marginBottom: 12 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 15, color: 'var(--ink)' }}>
                        {t('Gérant')} {i + 1}
                        {g.representant && (
                          <span className="badge badge--brand" style={{ marginLeft: 8 }}>
                            {t('Représentant légal')}
                          </span>
                        )}
                      </h3>
                    </div>
                    {gerants.length > 1 && (
                      <button className="btn btn--ghost btn--sm" onClick={() => retirerGerant(i)}>
                        <Icon name="trash" size={15} /> {t('Retirer')}
                      </button>
                    )}
                  </div>

                  <div className="form-grid">
                    <div className="field">
                      <label>{t('Nom complet')} <span className="req">*</span></label>
                      <input
                        value={g.nom}
                        onChange={(e) => majGerant(i, 'nom', e.target.value)}
                        placeholder={t('Prénom et nom')}
                      />
                    </div>
                    <div className="field">
                      <label>{t('Fonction')} <span className="req">*</span></label>
                      <input
                        value={g.fonction}
                        onChange={(e) => majGerant(i, 'fonction', e.target.value)}
                        placeholder={t('Ex. Directeur Général')}
                      />
                    </div>
                    <div className="field">
                      <label>{t('Email')} <span className="req">*</span></label>
                      <input
                        type="email"
                        value={g.email}
                        onChange={(e) => majGerant(i, 'email', e.target.value)}
                        placeholder="nom@entreprise.com"
                      />
                    </div>
                    <div className="field">
                      <label>{t('Téléphone')}</label>
                      <input
                        type="tel"
                        value={g.telephone}
                        onChange={(e) => majGerant(i, 'telephone', e.target.value)}
                        placeholder="+237 6 00 00 00 00"
                        aria-invalid={!!validatePhone(g.telephone)}
                      />
                      <span className={`field__hint ${validatePhone(g.telephone) ? 'field__hint--error' : ''}`}>
                        {validatePhone(g.telephone) || t(PHONE_HINT)}
                      </span>
                    </div>
                    <div className="field">
                      <label>{t('Nationalité')}</label>
                      <input
                        value={g.nationalite}
                        onChange={(e) => majGerant(i, 'nationalite', e.target.value)}
                        placeholder={t('Ex. Camerounaise')}
                      />
                    </div>
                    <div className="field">
                      <label>{t('Date de naissance')}</label>
                      <input
                        type="date"
                        value={g.dateNaissance}
                        onChange={(e) => majGerant(i, 'dateNaissance', e.target.value)}
                      />
                      <span className="field__hint">
                        {t('Le contrôle de sanctions sur un nom seul produit trop de correspondances.')}
                      </span>
                    </div>
                    <div className="field">
                      <label>{t('Type de pièce d’identité')}</label>
                      <select
                        value={g.typePiece}
                        onChange={(e) => majGerant(i, 'typePiece', Number(e.target.value))}
                      >
                        <option value={0}>CNI</option>
                        <option value={1}>{t('Passeport')}</option>
                        <option value={2}>{t('Titre de séjour')}</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>{t('Numéro de pièce')}</label>
                      <input
                        value={g.numeroPiece}
                        onChange={(e) => majGerant(i, 'numeroPiece', e.target.value)}
                      />
                    </div>
                    <div className="field field--full">
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="representant-legal"
                          checked={g.representant}
                          onChange={() => designerRepresentant(i)}
                        />
                        {t('C’est cette personne qui engage la société')}
                      </label>
                      <span className="field__hint">
                        {t('Un seul représentant légal : le désigner ici retire la désignation des autres.')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {gerants.length < maxGerants && (
                <button className="btn btn--soft btn--sm" onClick={ajouterGerant} style={{ alignSelf: 'flex-start' }}>
                  <Icon name="plus" size={15} /> {t('Ajouter un gérant')}
                </button>
              )}
              <span className="field__hint">
                {gerants.length} / {maxGerants} {t('gérants — le maximum est fixé par votre type de partenaire.')}
              </span>
            </div>
          )}

          {/* Étape 3 — Bénéficiaires effectifs */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <span className="field__hint">
                {t('Déclarez toute personne détenant, directement ou indirectement, au moins 25 % du capital ou des droits de vote, ou exerçant un contrôle effectif sur votre entité. Vous pourrez y revenir depuis « Mes bénéficiaires ».')}
              </span>

              {ubos.map((u) => (
                <div key={u.afb_uboid} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
                  <span className="doc-name__icon"><Icon name="user" size={18} /></span>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: 'var(--ink)', fontSize: 14, display: 'block' }}>
                      {u.afb_nomouraisonsociale || '—'}
                    </strong>
                    <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                      {u.afb_pourcentagededetentiondirecte ?? 0} % · {u.afb_nationalite || '—'}
                    </span>
                  </div>
                  <span className="badge badge--success"><Icon name="check" size={13} /> {t('Déclaré')}</span>
                </div>
              ))}

              {nouveauxUbos.map((u, i) => (
                <div key={i} className="card card--pad">
                  <div className="section-head" style={{ marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 15, color: 'var(--ink)' }}>
                      {t('Bénéficiaire')} {ubos.length + i + 1}
                    </h3>
                    <button className="btn btn--ghost btn--sm" type="button" onClick={() => retirerUbo(i)}>
                      <Icon name="trash" size={15} /> {t('Retirer')}
                    </button>
                  </div>
                  <div className="form-grid">
                    <div className="field">
                      <label>{t('Nom complet')} <span className="req">*</span></label>
                      <input value={u.nom} onChange={(e) => majUbo(i, 'nom', e.target.value)} placeholder={t('Prénom et nom')} />
                    </div>
                    <div className="field">
                      <label>{t('Pourcentage de détention')} <span className="req">*</span></label>
                      <input type="number" min="0" max="100" value={u.pourcentage} onChange={(e) => majUbo(i, 'pourcentage', e.target.value)} placeholder="25" />
                    </div>
                    <div className="field">
                      <label>{t('Nationalité')}</label>
                      <input value={u.nationalite} onChange={(e) => majUbo(i, 'nationalite', e.target.value)} placeholder={t('Ex. Camerounaise')} />
                    </div>
                    <div className="field">
                      <label>{t('Date de naissance')}</label>
                      <input type="date" value={u.dateNaissance} onChange={(e) => majUbo(i, 'dateNaissance', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}

              <button className="btn btn--soft btn--sm" type="button" onClick={ajouterUbo} style={{ alignSelf: 'flex-start' }}>
                <Icon name="plus" size={15} /> {t('Ajouter un bénéficiaire')}
              </button>

              {ubos.length === 0 && nouveauxUbos.length === 0 && (
                <span className="field__hint">
                  {t('Aucun bénéficiaire déclaré. Si personne n’atteint 25 %, passez cette étape — la conformité vous le demandera si nécessaire.')}
                </span>
              )}

              {nouveauxUbos.length > 0 && (
                <span className="field__hint">
                  {t('Ces bénéficiaires seront enregistrés à la soumission du dossier, avec le reste du formulaire.')}
                </span>
              )}
            </div>
          )}

          {/* Étape 4 — Documents */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {!tiersId && (
                <div className="field__hint" style={{ marginBottom: 4 }}>
                  {t('Aucune fiche tiers rattachée à votre compte : le téléversement sera disponible une fois votre compte lié par AFB.')}
                </div>
              )}
              {piecesRequises.length === 0 && (
                <div className="field__hint">
                  {t('Chargement de la liste des pièces attendues…')}
                </div>
              )}
              {piecesRequises.map((piece) => {
                const d = { ...piece, accept: acceptPourPiece(piece.key) }
                const deposee = piecesDeposees[d.key]
                const statut = deposee ? STATUT_PIECE[deposee.afb_statutvalidite] : null
                // Une pièce déjà validée par la conformité ne se retire pas : on
                // la remplace, ce qui laisse une trace et relance la revue. La
                // retirer effacerait le document sur lequel la décision a été prise.
                const retirable = deposee && deposee.afb_statutvalidite !== 'Valide'
                return (
                <div
                  key={d.key}
                  className="card"
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}
                >
                  <span className="doc-name__icon"><Icon name="fileText" size={20} /></span>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: 'var(--ink)', fontSize: 14, display: 'block' }}>
                      {t(d.name)}
                      {!d.mandatory && (
                        <span style={{ fontWeight: 400, color: 'var(--muted)' }}> · {t('facultatif')}</span>
                      )}
                    </strong>
                    <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                      {deposee ? deposee.afb_nomfichier : acceptLabel(d.accept)}
                    </span>
                  </div>
                  {deposee ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {statut && <span className={`badge ${statut.cls}`}>{t(statut.label)}</span>}

                      <button
                        className="btn btn--ghost btn--sm"
                        type="button"
                        title={t('Consulter')}
                        onClick={() => voirPiece(deposee)}
                      >
                        <Icon name="eye" size={15} />
                      </button>

                      <label
                        className="btn btn--ghost btn--sm"
                        title={t('Remplacer')}
                        style={{ cursor: uploadingDoc ? 'not-allowed' : 'pointer' }}
                      >
                        <Icon name="upload" size={15} />
                        <input
                          type="file"
                          hidden
                          accept={acceptAttr(d.accept)}
                          disabled={!tiersId || uploadingDoc !== null}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            e.target.value = ''
                            handleDocFile(d, file)
                          }}
                        />
                      </label>

                      {retirable && (
                        <button
                          className="btn btn--ghost btn--sm"
                          type="button"
                          title={t('Supprimer')}
                          disabled={pieceEnCours === d.key}
                          onClick={() => supprimerPiece(deposee)}
                        >
                          <Icon name="trash" size={15} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <label
                      className="btn btn--soft btn--sm"
                      style={{ cursor: tiersId && uploadingDoc !== d.key ? 'pointer' : 'not-allowed', opacity: tiersId ? 1 : 0.6 }}
                    >
                      <Icon name="upload" size={15} /> {uploadingDoc === d.key ? t('Envoi…') : t('Déposer')}
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
                )
              })}
            </div>
          )}

          {/* Étape 5 — Validation */}
          {step === 5 && (
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
                <div className="recap__row">
                  <dt>{t('Représentant légal')}</dt>
                  <dd>{gerants.find((g) => g.representant)?.nom || '—'}</dd>
                </div>
                <div className="recap__row">
                  <dt>{t('Gérants déclarés')}</dt>
                  <dd>{gerants.filter((g) => g.nom.trim()).length}</dd>
                </div>
                <div className="recap__row">
                  <dt>{t('Bénéficiaires effectifs')}</dt>
                  <dd>{ubos.length + nouveauxUbos.filter((u) => u.nom.trim()).length}</dd>
                </div>
                <div className="recap__row"><dt>{t('Documents déposés')}</dt><dd>{Object.keys(piecesDeposees).length} / {piecesRequises.length}</dd></div>
              </dl>

              {piecesManquantes.length > 0 && (
                <div
                  className="card card--pad"
                  style={{ marginBottom: 16, borderLeft: '3px solid var(--warning)' }}
                >
                  <h3 style={{ margin: 0, fontSize: 15, color: 'var(--ink)' }}>
                    <Icon name="alert" size={16} />{' '}
                    {piecesManquantes.length > 1
                      ? `${piecesManquantes.length} ${t('pièces obligatoires manquent')}`
                      : t('Une pièce obligatoire manque')}
                  </h3>
                  <p style={{ margin: '6px 0 10px', color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.55 }}>
                    {t('La soumission est bloquée tant qu’elles ne sont pas déposées. Un dossier incomplet serait rejeté par la conformité, et vous devriez tout reprendre.')}
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
                    {piecesManquantes.map((p) => (
                      <li key={p.key} style={{ fontSize: 13.5 }}>{t(p.name)}</li>
                    ))}
                  </ul>
                  <button
                    className="btn btn--soft btn--sm"
                    type="button"
                    style={{ marginTop: 12 }}
                    onClick={() => setStep(4)}
                  >
                    <Icon name="upload" size={15} /> {t('Revenir aux pièces justificatives')}
                  </button>
                </div>
              )}

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
