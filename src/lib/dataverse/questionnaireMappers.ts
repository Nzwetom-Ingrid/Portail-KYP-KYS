/**
 * Conversion de la table Dataverse `afb_questionnaire` vers le type d'affichage
 * `Questionnaire`. `nbQuestions` et `affectations` ne sont pas portés par cette
 * table (ce sont des comptes des tables afb_question / afb_questionnaireassignment),
 * donc ils valent 0 par défaut ici.
 */
import type { Afb_questionnaires } from '@/generated/models/Afb_questionnairesModel';
import type { Questionnaire } from '@/lib/mockData';

const TYPE_TO_FAMILLE: Record<string, Questionnaire['famille']> = {
  AML: 'AML',
  KYC: 'KYC',
  EXT: 'EXT',
  RISK: 'RISK',
  SLA: 'RISK',
  OPS: 'RISK',
  LIBRE: 'RISK',
};

const STATUT_TO_DISPLAY: Record<string, Questionnaire['statut']> = {
  Publi_: 'Publié',
  Brouillon: 'Brouillon',
  Archiv_: 'Archivé',
};

function frDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR');
}

export function toQuestionnaire(q: Afb_questionnaires): Questionnaire {
  return {
    id: q.afb_codedudocument || q.afb_questionnaireid,
    nom: q.afb_titreenfrancais ?? '',
    famille: TYPE_TO_FAMILLE[q.afb_typededocumentname ?? ''] ?? 'RISK',
    version: String(q.afb_version ?? 1),
    nbQuestions: 0,
    affectations: 0,
    statut: STATUT_TO_DISPLAY[q.afb_statutdepublicationname ?? ''] ?? 'Brouillon',
    dernierMaj: frDate(q.modifiedon ?? q.afb_datedepublication),
  };
}
