/**
 * Demandes du partenaire — miroir de `src/lib/demandes/demandes.ts` (back-office).
 *
 * Une demande n'est pas une pièce justificative : c'est un message, auquel la
 * conformité répond. Faute de table dédiée, demande et réponse sont stockées
 * dans `afb_document` avec un marqueur de type. Cette convention est décrite au
 * même endroit des deux côtés, et nulle part ailleurs.
 *
 * Toute évolution ici doit l'être aussi dans le module TypeScript, qui porte
 * les tests.
 */

export const TYPE_DEMANDE = {
  revue: 'demande-revue',
  document: 'demande-document',
}

/**
 * Table `afb_demandederevue` — le vrai stockage depuis août 2026.
 *
 * Les demandes vivaient dans `afb_document` avec un marqueur de type, faute de
 * table dédiée. Celles déjà déposées y restent : elles sont relues telles
 * quelles et fusionnées avec les nouvelles, plutôt que migrées. Une reprise de
 * données pour une poignée d'enregistrements ferait courir plus de risques
 * qu'elle n'en éviterait.
 */
export const RELATION_TIERS_DEMANDE = 'afb_demandederevue_Tiers_afb_tiers'

/** Valeurs de choix de la table. Elles démarrent à 747010000, pas à 0. */
export const DEMANDE = {
  type: { revue: 747010000, document: 747010001, autre: 747010002 },
  statut: { ouverte: 747010000, enCours: 747010001, traitee: 747010002, classee: 747010003 },
  emisePar: { partenaire: 747010000, banque: 747010001 },
}

const LIBELLE_PAR_TYPE = {
  [DEMANDE.type.revue]: 'Demande de revue du dossier',
  [DEMANDE.type.document]: 'Demande de document à la banque',
  [DEMANDE.type.autre]: 'Demande',
}

/** Une ligne de `afb_demandederevue` → même forme que les demandes héritées. */
export function mapDemande(d, reponses = []) {
  return {
    id: d.afb_demandederevueid,
    type: String(d.afb_typededemande ?? ''),
    libelle: LIBELLE_PAR_TYPE[d.afb_typededemande] || 'Demande',
    message: d.afb_messagedelademande || '',
    date: d.afb_datedemission || d.createdon || null,
    traitee:
      d.afb_statut === DEMANDE.statut.traitee || d.afb_statut === DEMANDE.statut.classee,
    reponses,
  }
}

/** Une réponse porte `reponse-demande:<identifiant de la demande>`. */
export const PREFIXE_REPONSE = 'reponse-demande:'

export const LIBELLE_DEMANDE = {
  [TYPE_DEMANDE.revue]: 'Demande de revue du dossier',
  [TYPE_DEMANDE.document]: 'Demande de document à la banque',
}

/** Valeurs de choix `afb_statutdevalidite` réutilisées pour l'état d'une demande. */
export const STATUT_DEMANDE = { traitee: 0, ouverte: 1 }

export function estDemande(d) {
  const type = String(d?.afb_typededocument || '')
  return type === TYPE_DEMANDE.revue || type === TYPE_DEMANDE.document
}

export function estReponse(d) {
  return String(d?.afb_typededocument || '').startsWith(PREFIXE_REPONSE)
}

/** Identifiant de la demande visée par une réponse. */
export function demandeVisee(d) {
  const type = String(d?.afb_typededocument || '')
  if (!type.startsWith(PREFIXE_REPONSE)) return null
  return type.slice(PREFIXE_REPONSE.length) || null
}

/**
 * Ni demande, ni réponse, ni complément : une vraie pièce.
 *
 * C'est ce prédicat que « Mes documents » applique. Le marqueur des réponses du
 * tiers (`reponse:<id>`) est distinct de celui des réponses de la banque
 * (`reponse-demande:<id>`) — d'où les deux tests.
 */
export function estPieceJustificative(d) {
  const type = String(d?.afb_typededocument || '')
  return !estDemande(d) && !estReponse(d) && !type.startsWith('reponse:')
}

function dateDe(d) {
  return d?.afb_datedeteleversement || d?.createdon || null
}

function instant(v) {
  if (!v) return null
  const t = new Date(v).getTime()
  return Number.isNaN(t) ? null : t
}

/** Les indatables en fin de liste, quel que soit le sens du tri. */
function comparerDates(a, b, sens) {
  const ia = instant(a)
  const ib = instant(b)
  if (ia === null && ib === null) return 0
  if (ia === null) return 1
  if (ib === null) return -1
  return (ia - ib) * sens
}

/** Chaque demande avec ses réponses ; la plus récente demande en tête. */
export function construireDemandes(docs) {
  const reponsesParDemande = new Map()

  for (const d of docs || []) {
    if (!estReponse(d)) continue
    const parent = demandeVisee(d)
    if (!parent || !d.afb_documentid) continue
    const reponse = {
      id: d.afb_documentid,
      texte: d.afb_motifderejet || '',
      date: dateDe(d),
    }
    const liste = reponsesParDemande.get(parent)
    if (liste) liste.push(reponse)
    else reponsesParDemande.set(parent, [reponse])
  }

  return (docs || [])
    .filter((d) => estDemande(d) && d.afb_documentid)
    .map((d) => ({
      id: d.afb_documentid,
      type: String(d.afb_typededocument || ''),
      libelle: LIBELLE_DEMANDE[String(d.afb_typededocument || '')] || 'Demande',
      message: d.afb_motifderejet || '',
      date: dateDe(d),
      traitee: d.afb_statutdevalidite === STATUT_DEMANDE.traitee,
      reponses: (reponsesParDemande.get(d.afb_documentid) || []).sort((a, b) =>
        comparerDates(a.date, b.date, 1)
      ),
    }))
    .sort((a, b) => comparerDates(a.date, b.date, -1))
}
