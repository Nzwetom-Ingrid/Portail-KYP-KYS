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

function frDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR');
}

export function toUBO(u: Afb_ubos): UBO {
  const indirecte = u.afb_pourcentagededetentionindirecte ?? 0;
  return {
    id: u.afb_uboid,
    nom: u.afb_nomouraisonsociale ?? '',
    nationalite: u.afb_nationalite ?? '—',
    partenaire: u.afb_tiersparentname ?? '—',
    partPct: u.afb_pourcentagededetentiondirecte ?? indirecte ?? 0,
    natureControle: indirecte > 0 ? 'Indirect' : 'Direct',
    ppe: (u.afb_statutppename ?? 'Non') !== 'Non',
    dateNaissance: frDate(u.afb_datedenaissance),
    validation: VALIDATION_LABEL_TO_DISPLAY[u.afb_statutdevalidationname ?? ''] ?? 'En attente',
  };
}
