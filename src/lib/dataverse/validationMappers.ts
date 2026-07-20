/**
 * Conversion de la table Dataverse `afb_dossierkypkys` vers le type d'affichage
 * `ValidationDecision` (file de validation DCONF). Le niveau et le risque ne
 * sont pas portés par le dossier → valeurs par défaut. Le score composite
 * utilise le taux de complétude comme proxy.
 */
import type { Afb_dossierkypkyses } from '@/generated/models/Afb_dossierkypkysesModel';
import type { ValidationDecision, PartnerKind, Risque } from '@/lib/mockData';

const STATUT_TO_DISPLAY: Record<string, ValidationDecision['statut']> = {
  Enrevue: 'En cours',
  Valid_: 'Validé',
  Rejet_: 'Rejeté',
  _compl_ter: 'En attente',
  Suspendu: 'En attente',
};

// retrieveMultiple ne renvoie pas le libellé de choix (`*name`) → on mappe le nombre.
const STATUT_NUM_TO_DISPLAY: Record<number, ValidationDecision['statut']> = {
  0: 'Validé',
  1: 'En cours',
  2: 'En attente',
  747010001: 'En attente', // Suspendu
  747010002: 'Rejeté',
};

// Niveau de risque du tiers → risque affiché + niveau de validation hiérarchique.
const RISK_NUM_TO_DISPLAY: Record<number, Risque> = { 0: 'High', 1: 'Medium', 2: 'Low' };
const RISK_TO_NIVEAU: Record<Risque, ValidationDecision['niveau']> = {
  High: 'Critique',
  Medium: 'Élevé',
  Low: 'Standard',
};

/** Type du dossier déduit du préfixe de la référence. */
function typeFromRef(ref: string): PartnerKind {
  const r = (ref ?? '').toUpperCase();
  if (r.startsWith('KYI')) return 'Cible';
  if (r.startsWith('KYS')) return 'Fournisseur';
  return 'Partenaire';
}

/** Maps optionnelles pour résoudre les lookups (non renvoyés par retrieveMultiple). */
export interface ValidationResolvers {
  tiersById?: Map<string, { nom?: string; risqueNum?: number; chargeGuid?: string }>;
  usersById?: Map<string, string>; // userId → nom complet
}

function frDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR');
}

function slaFromDeadline(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  return days < 0 ? 'Dépassé' : `J-${days}`;
}

export function toValidationDecision(d: Afb_dossierkypkyses, r?: ValidationResolvers): ValidationDecision {
  const ref = d.afb_referencedudossier || d.afb_dossierkypkysid;
  const t = d._afb_nomdutiers_value ? r?.tiersById?.get(d._afb_nomdutiers_value) : undefined;
  const entite = t?.nom ?? d.afb_nomdutiersname ?? '—';
  const risque = (t?.risqueNum != null ? RISK_NUM_TO_DISPLAY[t.risqueNum] : undefined) ?? 'Medium';
  const niveau = RISK_TO_NIVEAU[risque];
  // « Soumis par » : chargé de relation du tiers (résolu en nom) ; fallback propriétaire.
  const soumisPar =
    (t?.chargeGuid ? r?.usersById?.get(t.chargeGuid) : undefined) ?? d.owneridname ?? '—';

  return {
    id: ref,
    dossier: d.afb_referencedudossier ?? '—',
    entite,
    type: typeFromRef(ref),
    niveau,
    risque,
    scoreComposite: d.afb_tauxdecompletude ?? 0,
    soumisLe: frDate(d.afb_datedesoumission),
    soumisPar,
    sla: slaFromDeadline(d.afb_prochainecheancier),
    statut:
      (d.afb_statutdudossier != null ? STATUT_NUM_TO_DISPLAY[d.afb_statutdudossier] : undefined) ??
      STATUT_TO_DISPLAY[d.afb_statutdudossiername ?? ''] ??
      'En attente',
    commentaire: d.afb_commentairedconf || undefined,
  };
}
