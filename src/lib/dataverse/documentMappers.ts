/**
 * Conversion de la table Dataverse `afb_document` vers le type d'affichage
 * `DocExpiration` (calendrier des expirations). On ne retient côté page que les
 * documents portant une date d'expiration.
 */
import type { Afb_documents } from '@/generated/models/Afb_documentsModel';
import type { DocExpiration } from '@/lib/mockData';

function frDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR');
}

export function toDocExpiration(d: Afb_documents): DocExpiration {
  const exp = d.afb_datedexpiration;
  const days = exp ? Math.ceil((new Date(exp).getTime() - Date.now()) / 86_400_000) : 0;

  let statut: DocExpiration['statut'] = 'Valide';
  if (d.afb_statutdevaliditename === 'Expir_' || days < 0) statut = 'Expiré';
  else if (days <= 60) statut = 'À renouveler';

  return {
    id: d.afb_documentid,
    partenaire: d.afb_tiersname ?? '—',
    typeDoc: d.afb_categoriename ?? d.afb_typededocument ?? '—',
    reference: d.afb_nomdufichier ?? '—',
    emisLe: frDate(d.afb_datedemission),
    expireLe: frDate(exp),
    joursRestants: Number.isNaN(days) ? 0 : days,
    statut,
    charge: d.owneridname ?? '—',
  };
}
