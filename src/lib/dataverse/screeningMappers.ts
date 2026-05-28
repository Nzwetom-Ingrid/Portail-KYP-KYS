/**
 * Conversion de la table Dataverse `afb_resultatscreening` vers le type
 * d'affichage `ScreeningAlert`. La table stocke tous les résultats (y compris
 * négatifs) ; le `statut` de traitement n'est pas porté → défaut « Nouveau ».
 */
import type { Afb_resultatscreenings } from '@/generated/models/Afb_resultatscreeningsModel';
import type { ScreeningAlert } from '@/lib/mockData';

/** Couleurs par source, pour la carte de répartition. */
export const SOURCE_COLORS: Record<ScreeningAlert['source'], string> = {
  OFAC: '#E30613', // rouge Afriland — sanctions principales
  ONU: '#1A1A1A', // noir
  UE: '#767676', // gris moyen
  PPE: '#A50410', // rouge profond
  Interpol: '#C8C8C8', // gris clair
};

const KNOWN_SOURCES: ScreeningAlert['source'][] = ['ONU', 'OFAC', 'UE', 'PPE', 'Interpol'];

/** Détermine la source principale depuis la liste des bases interrogées. */
function pickSource(listes?: string): ScreeningAlert['source'] {
  const txt = (listes ?? '').toUpperCase();
  return KNOWN_SOURCES.find((s) => txt.includes(s.toUpperCase())) ?? 'ONU';
}

function frDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR');
}

export function toScreeningAlert(r: Afb_resultatscreenings): ScreeningAlert {
  const score = r.afb_scoredeconfiance ?? 0;
  const isPhysique = r.afb_naturedelentitename === 'UBO' || r.afb_naturedelentitename === 'Dirigeant';

  let match: ScreeningAlert['match'] = 'Faible';
  if (r.afb_resultatducontrolename === 'Matchpositif') match = score >= 90 ? 'Exact' : 'Fort';
  else if (r.afb_resultatducontrolename === 'Matchfaible') match = 'Faible';

  return {
    id: r.afb_identifiantducontrole || r.afb_resultatscreeningid,
    cible: r.afb_nomdutiersname ?? '—',
    typeCible: isPhysique ? 'Personne physique' : 'Personne morale',
    source: pickSource(r.afb_listesinterrogees),
    match,
    score,
    detecteLe: frDate(r.afb_datedexecution),
    statut: 'Nouveau',
    charge: r.owneridname ?? '—',
  };
}
