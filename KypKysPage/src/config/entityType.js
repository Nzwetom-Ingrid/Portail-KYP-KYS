/**
 * Type d'entité d'un tiers — miroir de `src/lib/entity-types.ts` (back-office).
 *
 * Le type (partenaire, fournisseur, correspondant bancaire, intragroupe) est
 * DÉTERMINÉ À LA CRÉATION du dossier : le chargé de relation choisit un type de
 * partenaire dans le référentiel, et la famille d'institution de ce type donne
 * l'entité. C'est aussi ce qui fixe le préfixe de la référence du dossier
 * (KYP / KYS / KYC-B / KYI), la checklist des pièces et la durée de validité.
 *
 * Le portail devinait ce type à partir de la direction porteuse — « DMG gère
 * les fournisseurs ». Cette heuristique se trompait dès qu'un fournisseur était
 * rattaché à une autre direction, et surtout parce que la création de dossier
 * écrit systématiquement DCONF. Tout le monde ressortait « Partenaire ».
 */

/** Valeurs de choix `afb_familledinstitution` sur afb_partnertype. */
export const FAMILLE = {
  BanqueCorrespondante: 747010000,
  EMF: 747010001,
  EntrepriseIndividuelle: 747010002,
  SocieteCommerciale: 747010003,
  PersonnePhysique: 747010004,
  EtablissementPublic: 747010005,
  CooperativeGIC: 747010006,
  ProfessionLiberale: 747010007,
}

/**
 * Famille d'institution → type de dossier. Même règle que le back-office.
 *
 * Un PARTENAIRE est une contrepartie financière : banque correspondante ou
 * établissement de microfinance. Tout le reste livre des biens ou des services
 * à la banque, donc KYS.
 */
export function entityTypeFromFamille(famille) {
  switch (famille) {
    case FAMILLE.BanqueCorrespondante:
    case FAMILLE.EMF:
      return 'partenaire'
    default:
      return 'fournisseur'
  }
}

/** Type d'entité → code affiché au tiers. */
export const CODE_PAR_TYPE = {
  correspondant: 'KYC',
  partenaire: 'KYP',
  fournisseur: 'KYS',
  intragroupe: 'KYI',
}

/**
 * Type d'entité déduit du préfixe de la référence du dossier. Source la plus
 * sûre après la famille : le préfixe est écrit à la création, à partir du même
 * choix, et ne bouge plus.
 */
export function entityTypeFromRef(ref) {
  const r = String(ref || '').toUpperCase()
  if (r.startsWith('KYI')) return 'intragroupe'
  if (r.startsWith('KYS')) return 'fournisseur'
  if (r.startsWith('KYC')) return 'correspondant'
  if (r.startsWith('KYP')) return 'partenaire'
  return null
}
