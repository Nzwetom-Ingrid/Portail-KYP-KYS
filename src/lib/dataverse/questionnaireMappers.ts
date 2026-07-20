/**
 * Conversion de la table Dataverse `afb_questionnaire` vers le type d'affichage
 * `Questionnaire`. `nbQuestions` et `affectations` ne sont pas portés par cette
 * table (ce sont des comptes des tables afb_question / afb_questionnaireassignment),
 * donc ils valent 0 par défaut ici.
 */
import type { Afb_questionnaires } from '@/generated/models/Afb_questionnairesModel';
import type { Questionnaire } from '@/lib/mockData';

// Le SDK (retrieveMultiple) ne renvoie PAS les champs *name formatés : on mappe
// donc depuis les valeurs numériques (afb_typededocument / afb_statutdepublication).
const TYPE_NUM_TO_FAMILLE: Record<number, Questionnaire['famille']> = {
  0: 'AML',
  1: 'RISK', // SLA
  2: 'KYC',
  3: 'EXT',
  4: 'RISK',
  747010001: 'RISK', // OPS
  747010002: 'RISK', // LIBRE
};

const STATUT_NUM_TO_DISPLAY: Record<number, Questionnaire['statut']> = {
  0: 'Publié',
  1: 'Brouillon',
  747010001: 'Archivé',
};

function frDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR');
}

export function toQuestionnaire(
  q: Afb_questionnaires,
  nbQuestions = 0,
  affectations = 0,
): Questionnaire {
  return {
    id: q.afb_codedudocument || q.afb_questionnaireid,
    nom: q.afb_titreenfrancais ?? '',
    famille: TYPE_NUM_TO_FAMILLE[q.afb_typededocument as number] ?? 'RISK',
    version: String(q.afb_version ?? 1),
    nbQuestions,
    affectations,
    statut: STATUT_NUM_TO_DISPLAY[q.afb_statutdepublication as number] ?? 'Brouillon',
    dernierMaj: frDate(q.modifiedon ?? q.afb_datedepublication),
  };
}
