/**
 * Conversion de la table Dataverse `afb_dossierkypkys` vers le type d'affichage
 * `ValidationDecision` (file de validation DCONF). Le niveau et le risque ne
 * sont pas portés par le dossier → valeurs par défaut. Le score composite
 * utilise le taux de complétude comme proxy.
 */
import type { Afb_dossierkypkyses } from '@/generated/models/Afb_dossierkypkysesModel';
import type { ValidationDecision } from '@/lib/mockData';

const STATUT_TO_DISPLAY: Record<string, ValidationDecision['statut']> = {
  Enrevue: 'En cours',
  Valid_: 'Validé',
  Rejet_: 'Rejeté',
  _compl_ter: 'En attente',
  Suspendu: 'En attente',
};

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

export function toValidationDecision(d: Afb_dossierkypkyses): ValidationDecision {
  return {
    id: d.afb_referencedudossier || d.afb_dossierkypkysid,
    dossier: d.afb_referencedudossier ?? '—',
    entite: d.afb_nomdutiersname ?? '—',
    type: 'Partenaire',
    niveau: 'Standard',
    risque: 'Medium',
    scoreComposite: d.afb_tauxdecompletude ?? 0,
    soumisLe: frDate(d.afb_datedesoumission),
    soumisPar: d.owneridname ?? '—',
    sla: slaFromDeadline(d.afb_prochainecheancier),
    statut: STATUT_TO_DISPLAY[d.afb_statutdudossiername ?? ''] ?? 'En attente',
  };
}
