/**
 * Conversion de la table Dataverse `afb_dossierkypkys` vers le type d'affichage
 * `Dossier`. La table dossier ne porte ni le type, ni le pays, ni le risque,
 * ni le chargé — ces champs viennent du tiers lié (lookup `afb_nomdutiers`).
 *
 * Le mapper accepte optionnellement une map `tiersByGuid` pour enrichir le
 * dossier avec les données du tiers (raison sociale, pays, risque, direction,
 * chargé de relation). Le type est déduit du préfixe de la référence
 * (KYP → Partenaire, KYS → Fournisseur, KYI → Cible, KYC* → Partenaire).
 */
import type { Afb_dossierkypkyses } from '@/generated/models/Afb_dossierkypkysesModel';
import type { Afb_tierses } from '@/generated/models/Afb_tiersesModel';
import type { Afb_utilisateurinternes } from '@/generated/models/Afb_utilisateurinternesModel';
import type { Dossier, DossierStatut, PartnerKind, Risque, Direction } from '@/lib/mockData';

const STATUT_LABEL_TO_DISPLAY: Record<string, DossierStatut> = {
  Valid_: 'Validé',
  Enrevue: 'En revue',
  _compl_ter: 'Brouillon',
  Suspendu: 'Expiré',
  Rejet_: 'Rejeté',
};

const RISK_LABEL_TO_DISPLAY: Record<string, Risque> = {
  Standard: 'Low',
  _lev_: 'Medium',
  Élevé: 'Medium',
  Critique: 'High',
};

const DIRECTION_LABEL_TO_DISPLAY: Record<string, Direction> = {
  DCONF: 'DCONF',
  DMG: 'DMG',
  TRESO: 'TRESO',
  COMEX: 'COMEX',
  DRISQUE: 'DCONF',
};

// retrieveMultiple ne renvoie PAS les libellés de choix (`*name`) avec ce SDK ;
// seules les valeurs numériques le sont. On mappe donc en priorité depuis le nombre.
const STATUT_NUM_TO_DISPLAY: Record<number, DossierStatut> = {
  0: 'Validé',
  1: 'En revue',
  2: 'Brouillon',
  747010001: 'Expiré',
  747010002: 'Rejeté',
};

const RISK_NUM_TO_DISPLAY: Record<number, Risque> = {
  0: 'High', // Critique
  1: 'Medium', // Élevé
  2: 'Low', // Standard
};

const DIRECTION_NUM_TO_DISPLAY: Record<number, Direction> = {
  0: 'TRESO',
  1: 'DCONF',
  2: 'DMG',
  747010001: 'COMEX',
  747010002: 'DCONF', // DRISQUE
};

function frDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR');
}

/** Calcule un libellé SLA (« J-3 », « Dépassé », « —») depuis la prochaine échéance. */
function slaFromDeadline(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return 'Dépassé';
  return `J-${days}`;
}

/** Type du dossier déduit du préfixe de la référence. */
function typeFromRef(ref: string): PartnerKind {
  const r = (ref ?? '').toUpperCase();
  if (r.startsWith('KYI')) return 'Cible';
  if (r.startsWith('KYS')) return 'Fournisseur';
  // KYP, KYC, KYC-B, etc. → Partenaire
  return 'Partenaire';
}

export function toDossier(
  d: Afb_dossierkypkyses,
  tiersByGuid?: Map<string, Afb_tierses>,
  usersByGuid?: Map<string, Afb_utilisateurinternes>,
): Dossier {
  const tiersGuid = d._afb_nomdutiers_value;
  const tiers = tiersGuid ? tiersByGuid?.get(tiersGuid) : undefined;
  const ref = d.afb_referencedudossier || d.afb_dossierkypkysid;

  // Tiers lié → on prend ses infos ; sinon fallback sur le name expansé du lookup.
  const entite = tiers?.afb_nomdupartenaire ?? d.afb_nomdutiersname ?? '—';
  const pays = tiers?.afb_pays || undefined;
  const risque =
    (tiers?.afb_niveauderisque != null ? RISK_NUM_TO_DISPLAY[tiers.afb_niveauderisque] : undefined) ??
    RISK_LABEL_TO_DISPLAY[tiers?.afb_niveauderisquename ?? ''] ??
    'Medium';
  const direction =
    (tiers?.afb_directionporteuse != null ? DIRECTION_NUM_TO_DISPLAY[tiers.afb_directionporteuse] : undefined) ??
    DIRECTION_LABEL_TO_DISPLAY[tiers?.afb_directionporteusename ?? ''] ??
    'DCONF';
  // Chargé de relation : on résout le lookup via la map utilisateurs (le nom formaté
  // du lookup n'est pas garanti par retrieveMultiple). Fallbacks : nom formaté, propriétaire.
  const chargeGuid = tiers?._afb_chargederelation_value;
  const charge =
    (chargeGuid ? usersByGuid?.get(chargeGuid)?.afb_nomcomplet : undefined) ??
    tiers?.afb_chargederelationname ??
    d.owneridname ??
    undefined;
  // Cible si le tiers est marqué Cible (valeur 1), sinon déduit du préfixe de référence.
  const type: PartnerKind =
    tiers?.afb_statutdutiers === 1 || tiers?.afb_statutdutiersname === 'Cible'
      ? 'Cible'
      : typeFromRef(ref);

  return {
    id: ref,
    entite,
    type,
    risque,
    statut:
      (d.afb_statutdudossier != null ? STATUT_NUM_TO_DISPLAY[d.afb_statutdudossier] : undefined) ??
      STATUT_LABEL_TO_DISPLAY[d.afb_statutdudossiername ?? ''] ??
      'Brouillon',
    sla: slaFromDeadline(d.afb_prochainecheancier),
    direction,
    dateCreation: frDate(d.afb_datedesoumission ?? d.createdon),
    pays,
    charge,
    commentaire: d.afb_commentairedconf || undefined,
    email: tiers?.afb_emailcontactprincipal || undefined,
    tiersId: tiersGuid || undefined,
    onboarding: tiers
      ? {
          formeJuridique: tiers.afb_typejuridiquename || undefined,
          rccm: tiers.afb_numerorccmimmatriculation || undefined,
          ville: tiers.afb_ville || undefined,
          adresse: tiers.afb_adressecomplete || undefined,
          telephone: tiers.afb_telephone || undefined,
          swift: tiers.afb_codeswiftbic || undefined,
          // Colonnes ajoutées hors modèle généré → accès via cast.
          secteur: (tiers as { afb_secteurdactivite?: string }).afb_secteurdactivite || undefined,
        }
      : undefined,
    requiredDocsJson:
      (tiers as { afb_documentsrequis?: string } | undefined)?.afb_documentsrequis || undefined,
  };
}
