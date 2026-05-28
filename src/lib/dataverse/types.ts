/**
 * Types TypeScript pour les tables Dataverse AFB
 * Ces interfaces représentent les colonnes telles qu'elles arrivent depuis Dataverse
 */

// ============================================================================
// Table : afb_typedepartenaire (Type de partenaire)
// ============================================================================
export interface PartnerType {
  // Identifiant Dataverse (GUID)
  afb_typedepartenaireid: string;
  // Code court (BANK_CORR, SARL, etc.)
  afb_code: string;
  // Libellés
  afb_libellefr: string;
  afb_libelleen?: string;
  // Famille — Choice (valeurs numériques 100000000+)
  afb_famille: number;
  // Seuil UBO par défaut (10, 25, 100)
  afb_seuilubodefaut: number;
  // Référence Guide AFB
  afb_referenceguideafb?: string;
  // Actif
  afb_actif: boolean;
  // Colonnes système Dataverse
  createdon?: string;
  modifiedon?: string;
}

// Famille : mapping des codes vers libellés affichables
export const FamilleLabels: Record<number, string> = {
  100000000: 'Banque correspondante',
  100000001: 'Établissement de monnaie électronique',
  100000002: 'Personne morale',
  100000003: 'Coopérative',
  100000004: 'Profession libérale',
  100000005: 'Entreprise individuelle',
  100000006: 'ONG',
  100000007: 'Personne physique',
};

// Helper : récupère le libellé de la famille à partir du code numérique
export function getFamilleLabel(code?: number): string {
  if (code === undefined) return '—';
  return FamilleLabels[code] ?? `Code ${code}`;
}