/**
 * Conversion de la table Dataverse `afb_tiers` vers le type d'affichage
 * `Partenaire` utilisé par la page PartnersList.
 */
import type { Afb_tierses } from '@/generated/models/Afb_tiersesModel';
import type { Partenaire, Direction, Risque, PartnerKind } from '@/lib/mockData';

/** Niveau de risque Dataverse (libellé) → badge d'affichage. */
const RISK_LABEL_TO_DISPLAY: Record<string, Risque> = {
  Standard: 'Low',
  _lev_: 'Medium',
  Élevé: 'Medium',
  Critique: 'High',
};

/** Direction porteuse Dataverse → direction d'affichage. */
const DIRECTION_LABEL_TO_DISPLAY: Record<string, Direction> = {
  DCONF: 'DCONF',
  DMG: 'DMG',
  TRESO: 'TRESO',
  COMEX: 'COMEX',
  DRISQUE: 'DCONF',
};

/** Statuts du tiers considérés comme « Inactif » côté affichage. */
const INACTIVE_STATUTS = new Set(['Suspendu', 'Rejet_', 'Cl_tur_']);

function frDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR');
}

export function toPartenaire(t: Afb_tierses): Partenaire {
  const statutLabel = t.afb_statutdutiersname ?? '';
  const statut: Partenaire['statut'] =
    t.statecode === 1 || INACTIVE_STATUTS.has(statutLabel) ? 'Inactif' : 'Actif';
  const type: PartnerKind = statutLabel === 'Cible' ? 'Cible' : 'Partenaire';

  return {
    id: t.afb_tiersid,
    raisonSociale: t.afb_nomdupartenaire ?? '',
    code: t.afb_codeswiftbic || t.afb_numerorccmimmatriculation || t.afb_tiersid.slice(0, 8).toUpperCase(),
    type,
    typeJuridique: t.afb_typejuridiquename ?? '—',
    pays: t.afb_pays ?? '',
    risque: RISK_LABEL_TO_DISPLAY[t.afb_niveauderisquename ?? ''] ?? 'Low',
    statut,
    direction: DIRECTION_LABEL_TO_DISPLAY[t.afb_directionporteusename ?? ''] ?? 'DCONF',
    dateCreation: frDate(t.afb_datedecreationsysteme),
    dernierUpdate: frDate(t.afb_datedernieremiseajour ?? t.modifiedon),
  };
}
