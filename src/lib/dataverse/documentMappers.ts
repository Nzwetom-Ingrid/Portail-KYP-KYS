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

/** Maps optionnelles pour résoudre les libellés (les `*name` de lookup ne sont
 *  pas renvoyés par retrieveMultiple → on résout via les listes chargées). */
export interface DocResolvers {
  tiersById?: Map<string, { nom?: string; chargeGuid?: string }>; // tiers → nom + chargé de relation
  usersById?: Map<string, string>;    // userId → nom complet
  categoryById?: Map<string, string>; // catégorie → libellé
}

export function toDocExpiration(d: Afb_documents, r?: DocResolvers): DocExpiration {
  const exp = d.afb_datedexpiration;
  const days = exp ? Math.ceil((new Date(exp).getTime() - Date.now()) / 86_400_000) : 0;

  let statut: DocExpiration['statut'] = 'Valide';
  if (d.afb_statutdevaliditename === 'Expir_' || days < 0) statut = 'Expiré';
  else if (days <= 60) statut = 'À renouveler';

  // Partenaire : nom du tiers lié (via la map) ; fallback sur le name expansé.
  const t = d._afb_tiers_value ? r?.tiersById?.get(d._afb_tiers_value) : undefined;
  const partenaire = t?.nom ?? d.afb_tiersname ?? '—';
  // Chargé : chargé de relation du tiers (résolu en nom via la map users) ;
  // fallback sur le propriétaire de l'enregistrement document.
  const charge =
    (t?.chargeGuid ? r?.usersById?.get(t.chargeGuid) : undefined) ??
    d.owneridname ??
    '—';
  // Type : libellé de catégorie si dispo ; sinon type de document (sauf s'il
  // s'agit d'un type MIME comme « application/pdf »).
  const catLabel = d._afb_categorie_value ? r?.categoryById?.get(d._afb_categorie_value) : undefined;
  const rawType = d.afb_typededocument ?? '';
  const niceType = rawType && !rawType.includes('/') ? rawType : undefined;
  const typeDoc = catLabel ?? d.afb_categoriename ?? niceType ?? 'Document';

  return {
    id: d.afb_documentid,
    partenaire,
    typeDoc,
    reference: d.afb_nomdufichier ?? '—',
    emisLe: frDate(d.afb_datedemission),
    expireLe: frDate(exp),
    joursRestants: Number.isNaN(days) ? 0 : days,
    statut,
    charge,
  };
}
