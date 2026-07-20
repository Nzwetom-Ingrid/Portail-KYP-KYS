/**
 * Conversion de la table Dataverse `afb_ubo` vers le type d'affichage `UBO`.
 */
import type { Afb_ubos } from '@/generated/models/Afb_ubosModel';
import type { UBO } from '@/lib/mockData';

const VALIDATION_LABEL_TO_DISPLAY: Record<string, UBO['validation']> = {
  Valid_: 'Validé',
  Encours: 'En attente',
  Nonv_rifi_: 'À revoir',
  Rejet_: 'À revoir',
};

// retrieveMultiple ne renvoie pas les libellés de choix (`*name`) → on mappe
// en priorité depuis la valeur numérique.
const VALIDATION_NUM_TO_DISPLAY: Record<number, UBO['validation']> = {
  0: 'Validé',
  1: 'En attente',
  2: 'À revoir', // Non vérifié / complément demandé
  747010001: 'À revoir', // Rejeté
};

/** Maps optionnelles pour résoudre les lookups (non renvoyés par retrieveMultiple). */
export interface UBOResolvers {
  tiersById?: Map<string, string>; // tiersId → nom de l'entité contrôlée (tiers parent)
  usersById?: Map<string, string>; // userId  → nom du valideur
}

function frDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR');
}

export function toUBO(u: Afb_ubos, r?: UBOResolvers): UBO {
  const indirecte = u.afb_pourcentagededetentionindirecte ?? 0;
  const parentGuid = u._afb_tiersparent_value;
  const partenaire =
    (parentGuid ? r?.tiersById?.get(parentGuid) : undefined) ?? u.afb_tiersparentname ?? '—';
  const valideurGuid = u._afb_validepar_value;
  const validePar =
    (valideurGuid ? r?.usersById?.get(valideurGuid) : undefined) ?? u.afb_valideparname ?? undefined;
  const moral = u.afb_typedentite === 0;

  return {
    id: u.afb_uboid,
    nom: u.afb_nomouraisonsociale ?? '',
    nationalite: u.afb_nationalite ?? '—',
    partenaire,
    partPct: u.afb_pourcentagededetentiondirecte ?? indirecte ?? 0,
    natureControle: indirecte > 0 ? 'Indirect' : 'Direct',
    // PPE : le choix numérique 0 = Non ; toute autre valeur = PPE (auto-déclarée / confirmée).
    ppe: (u.afb_statutppe ?? 0) !== 0,
    dateNaissance: frDate(u.afb_datedenaissance),
    validation:
      (u.afb_statutdevalidation != null ? VALIDATION_NUM_TO_DISPLAY[u.afb_statutdevalidation] : undefined) ??
      VALIDATION_LABEL_TO_DISPLAY[u.afb_statutdevalidationname ?? ''] ??
      'En attente',
    // Détails réels (drawer)
    moral,
    typeEntite: u.afb_typedentitename ?? (moral ? 'Personne morale' : 'Personne physique'),
    paysResidence: u.afb_paysderesidencefiscale || undefined,
    partIndirecte: indirecte,
    screening: u.afb_dernierresultatdescreeningname || undefined,
    validePar,
    dateValidation: u.afb_datedevalidation ? frDate(u.afb_datedevalidation) : undefined,
  };
}
