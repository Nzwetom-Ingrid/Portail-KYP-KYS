/**
 * Conversions entre la table Dataverse `afb_utilisateurinterne` et le type
 * d'affichage `Utilisateur` utilisé par la page Users.
 *
 * Les rôles/directions Dataverse (choix) ne correspondent pas 1:1 aux libellés
 * historiques de la maquette : on applique une correspondance avec valeur par défaut.
 */
import type { Afb_utilisateurinternes } from '@/generated/models/Afb_utilisateurinternesModel';
import type { Utilisateur, Direction } from '@/lib/mockData';

/** Codes des choix Dataverse — nécessaires pour la création d'un enregistrement. */
export const DV_DIRECTION_CODE = {
  DCONF: 747010000,
  DMG: 747010001,
  DSI: 747010002,
  TRESO: 747010003,
  DRISQUE: 747010004,
} as const;

export const DV_ROLE_CODE = {
  Auditeurinterne: 747010000,
  ChargeConformite: 747010001,
  ChargeRelation: 747010002,
  SuperadminDCONF: 747010003,
  Auditeurexterne: 747010004,
} as const;

/** Code numérique `afb_role` → rôle d'affichage (la clé numérique est stable même
 *  si le libellé d'affichage est modifié dans Dataverse). */
const ROLE_CODE_TO_DISPLAY: Record<number, Utilisateur['role']> = {
  [DV_ROLE_CODE.SuperadminDCONF]: 'Super Admin',
  [DV_ROLE_CODE.ChargeConformite]: 'Chargé conformité',
  [DV_ROLE_CODE.ChargeRelation]: 'Analyste',
  [DV_ROLE_CODE.Auditeurinterne]: 'Visiteur',
  [DV_ROLE_CODE.Auditeurexterne]: 'Visiteur',
};

/** Code numérique `afb_direction` → direction d'affichage. */
const DIRECTION_CODE_TO_DISPLAY: Record<number, Direction> = {
  [DV_DIRECTION_CODE.DCONF]: 'DCONF',
  [DV_DIRECTION_CODE.DMG]: 'DMG',
  [DV_DIRECTION_CODE.TRESO]: 'TRESO',
  [DV_DIRECTION_CODE.DSI]: 'DMG',
  [DV_DIRECTION_CODE.DRISQUE]: 'DCONF',
};

export const DV_ACTIF_OUI = 0;

function frDate(value?: string, withTime = false): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return withTime ? d.toLocaleString('fr-FR') : d.toLocaleDateString('fr-FR');
}

/** Mappe un enregistrement Dataverse vers le type d'affichage `Utilisateur`. */
export function toUtilisateur(u: Afb_utilisateurinternes): Utilisateur {
  const full = (u.afb_nomcomplet ?? '').trim();
  const parts = full.length > 0 ? full.split(/\s+/) : [];
  const prenom = parts.length > 1 ? parts[0] : '';
  const nom = parts.length > 1 ? parts.slice(1).join(' ') : full;

  return {
    id: u.afb_utilisateurinterneid,
    prenom,
    nom,
    email: u.afb_adresseemail ?? '',
    role: ROLE_CODE_TO_DISPLAY[u.afb_role as number] ?? 'Visiteur',
    direction: DIRECTION_CODE_TO_DISPLAY[u.afb_direction as number] ?? 'DCONF',
    statut: u.statecode === 1 ? 'Inactif' : 'Actif',
    derniereConnexion: frDate(u.afb_derniereconnexion, true),
    dossiersTraites: 0,
    creeLe: frDate(u.createdon),
  };
}
