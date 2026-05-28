/**
 * Conversion de la table Dataverse `afb_partnertype` vers le type d'affichage
 * `PartnerType` utilisé par la page PartnerTypesAdmin (et son helper getFamilleLabel).
 */
import type { Afb_partnertypes } from '@/generated/models/Afb_partnertypesModel';
import type { PartnerType } from '@/lib/dataverse/types';

/**
 * Famille d'institution Dataverse (libellé) → code numérique attendu par
 * `FamilleLabels` / `getFamilleLabel` (100000000+).
 */
const FAMILLE_NAME_TO_CODE: Record<string, number> = {
  Banquecorrespondante: 100000000,
  EMF: 100000001,
  Soci_t_commerciale: 100000002,
  Coop_rative_GIC: 100000003,
  Professionlib_rale: 100000004,
  Entrepriseindividuelle: 100000005,
  Personnephysique: 100000007,
  _tablissementpublic: 100000002,
};

export function toPartnerType(p: Afb_partnertypes): PartnerType {
  return {
    afb_typedepartenaireid: p.afb_partnertypeid,
    afb_code: p.afb_codeinstitution ?? '—',
    afb_libellefr: p.afb_libellefrancais ?? '',
    afb_libelleen: p.afb_libelleanglais ?? undefined,
    afb_famille: FAMILLE_NAME_TO_CODE[p.afb_familledinstitutionname ?? ''] ?? 100000002,
    afb_seuilubodefaut: p.afb_seuilubopardefaut ?? 0,
    afb_referenceguideafb: p.afb_sectionguideafb ?? undefined,
    afb_actif: p.statecode === 0,
    createdon: p.createdon,
    modifiedon: p.modifiedon,
  };
}
