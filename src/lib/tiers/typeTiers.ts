/**
 * Type affiché d'un tiers — « Partenaire », « Fournisseur » ou « Cible ».
 *
 * Deux écrans le déduisaient de la direction porteuse : `afb_directionporteuse
 * === 2` (DMG) valait Fournisseur, tout le reste Partenaire. Cette heuristique
 * ne pouvait pas fonctionner, parce que la création de dossier écrit
 * systématiquement DCONF — tout le monde ressortait « Partenaire », y compris
 * les fournisseurs.
 *
 * La source réelle est la famille d'institution du type de partenaire choisi à
 * la création, exactement comme pour le type de dossier. Elle vit sur une autre
 * table : d'où la jointure par identifiant plutôt qu'une lecture directe.
 *
 * Fonctions PURES, testables seules (charte AFB_PS03 § 22.1).
 */
import { entityTypeFromFamille } from '@/lib/entity-types';

export type TypeTiersAffiche = 'Partenaire' | 'Fournisseur' | 'Cible';

/** Valeur de `afb_statutdutiers` qui distingue une cible d'un tiers actif. */
export const STATUT_CIBLE = 1;

/** Sous-ensemble d'`afb_tiers` nécessaire au calcul. */
export interface TiersPourType {
  afb_statutdutiers?: number;
  _afb_typejuridique_value?: string;
}

/** Sous-ensemble d'`afb_partnertype` nécessaire au calcul. */
export interface TypePartenaire {
  afb_partnertypeid?: string;
  afb_familledinstitution?: number;
}

/** Index type de partenaire → famille d'institution, à construire une fois. */
export function indexerFamilles(types: TypePartenaire[]): Map<string, number> {
  const index = new Map<string, number>();
  for (const t of types) {
    if (t.afb_partnertypeid && t.afb_familledinstitution !== undefined) {
      index.set(t.afb_partnertypeid, t.afb_familledinstitution);
    }
  }
  return index;
}

/**
 * Type affiché d'un tiers.
 *
 * « Cible » l'emporte : c'est un état d'avancement — une entreprise pressentie,
 * pas encore en relation — et il prime sur la nature de l'entité.
 *
 * En l'absence de type de partenaire lisible — fiche ancienne, ou permission de
 * table absente sur le référentiel — on retombe sur « Partenaire ». C'est le
 * cas majoritaire, et se tromper vers le plus exigeant vaut mieux que l'inverse.
 */
export function typeDuTiers(
  tiers: TiersPourType,
  famillesParType: Map<string, number>,
): TypeTiersAffiche {
  if (tiers.afb_statutdutiers === STATUT_CIBLE) return 'Cible';

  const typeId = tiers._afb_typejuridique_value;
  const famille = typeId ? famillesParType.get(typeId) : undefined;
  if (famille === undefined) return 'Partenaire';

  return entityTypeFromFamille(famille) === 'fournisseur' ? 'Fournisseur' : 'Partenaire';
}
