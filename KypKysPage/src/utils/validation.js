// Contrôles de saisie partagés — téléphone et fichiers.
//
// Chaque fonction de validation renvoie soit `null` (c'est bon), soit un
// message destiné à l'utilisateur. Le message dit ce qui ne va pas ET ce qu'il
// faut faire : « Format non accepté (.docx). Formats attendus : .pdf » plutôt
// qu'un « Fichier invalide » qui n'aide personne.

// =============================================================
// Téléphone
// =============================================================
// Règle retenue : format international E.164 — « + », indicatif pays, numéro.
// Pourquoi pas un masque par pays : il faudrait maintenir les règles de
// numérotation de ~200 pays et les rejouer à chaque réforme locale. Le format
// international est vérifiable simplement et reste valable partout, ce qui
// compte pour des partenaires hors zone CEMAC.

// Séparateurs de confort tolérés à la saisie, retirés avant contrôle.
export function normalizePhone(value) {
  return String(value ?? '').replace(/[\s.\-()]/g, '')
}

// E.164 : « + », un premier chiffre non nul, puis 7 à 14 chiffres (8 à 15 au
// total, indicatif compris).
const E164 = /^\+[1-9]\d{7,14}$/

export const PHONE_HINT =
  'Format international : + indicatif pays puis le numéro. Ex. +237 6 12 34 56 78'

/** @returns {string|null} message d'erreur, ou null si valide. */
export function validatePhone(value, { required = false } = {}) {
  const raw = String(value ?? '').trim()
  if (!raw) return required ? 'Le numéro de téléphone est obligatoire.' : null

  const v = normalizePhone(raw)
  if (!v.startsWith('+')) {
    return 'Ajoutez l’indicatif pays précédé de « + ». Ex. +237 6 12 34 56 78'
  }
  if (/[^+\d]/.test(v)) {
    return 'Le numéro ne doit contenir que des chiffres, après l’indicatif.'
  }
  if (!E164.test(v)) {
    const digits = v.replace(/\D/g, '').length
    return digits < 8
      ? 'Numéro trop court — indicatif pays compris, il faut au moins 8 chiffres.'
      : 'Numéro trop long — 15 chiffres au maximum, indicatif pays compris.'
  }
  return null
}

// =============================================================
// Fichiers
// =============================================================
// Le contrôle se fait AVANT l'envoi. L'attribut `accept` de l'input ne sert
// qu'à filtrer la boîte de dialogue : l'utilisateur peut choisir « tous les
// fichiers », et un glisser-déposer l'ignore complètement. Sans ce contrôle,
// un .exe part en base64 vers Dataverse.

export const MAX_FILE_MB = 10

// Jeux d'extensions par usage. Une pièce d'identité est exigée en PDF : un
// justificatif d'identité photographié est retouchable et illisible à l'écran
// de la conformité.
export const ACCEPT_IDENTITY = ['.pdf']
export const ACCEPT_DOCUMENT = ['.pdf', '.jpg', '.jpeg', '.png']

export function extensionOf(filename) {
  const m = /\.([a-z0-9]+)$/i.exec(String(filename || ''))
  return m ? `.${m[1].toLowerCase()}` : ''
}

/** Chaîne pour l'attribut `accept` d'un <input type="file">. */
export function acceptAttr(exts) {
  return exts.join(',')
}

/** Libellé lisible : « PDF, JPG ou PNG · 10 Mo max ». */
export function acceptLabel(exts, maxMb = MAX_FILE_MB) {
  // .jpeg et .jpg sont le même format pour l'utilisateur — on n'affiche pas les deux.
  const names = exts.map((e) => (e === '.jpeg' ? 'JPG' : e.replace('.', '').toUpperCase()))
  const uniq = [...new Set(names)]
  const list =
    uniq.length > 1 ? `${uniq.slice(0, -1).join(', ')} ou ${uniq[uniq.length - 1]}` : uniq[0]
  return `${list} · ${maxMb} Mo max`
}

/** @returns {string|null} message d'erreur, ou null si le fichier est accepté. */
export function validateFile(file, { accept = ACCEPT_DOCUMENT, maxMb = MAX_FILE_MB } = {}) {
  if (!file) return 'Aucun fichier sélectionné.'

  const ext = extensionOf(file.name)
  if (!accept.includes(ext)) {
    return `Format non accepté${ext ? ` (${ext})` : ''}. Formats attendus : ${accept.join(', ')}.`
  }

  const mb = (file.size || 0) / 1048576
  if (mb > maxMb) {
    return `Fichier trop volumineux (${mb.toFixed(1)} Mo). Maximum : ${maxMb} Mo.`
  }
  if (!file.size) {
    return 'Le fichier est vide.'
  }
  return null
}
