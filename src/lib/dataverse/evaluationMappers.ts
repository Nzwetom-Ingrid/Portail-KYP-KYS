/**
 * Conversion de la table Dataverse `afb_evaluationpartenaire` vers le type
 * d'affichage `Evaluation`. Le type d'évaluation (SLA/OPS/RISK/EXT) n'est pas
 * porté par la table → défaut « RISK ». Le statut de conformité est déduit du
 * ratio note/note max.
 */
import type { Afb_evaluationpartenaires } from '@/generated/models/Afb_evaluationpartenairesModel';
import type { Evaluation } from '@/lib/mockData';

function frDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR');
}

export function toEvaluation(e: Afb_evaluationpartenaires): Evaluation {
  const score = e.afb_noteglobale ?? 0;
  const scoreMax = e.afb_notemaximalepossible || 100;
  const ratio = scoreMax > 0 ? (score / scoreMax) * 100 : 0;
  const statut: Evaluation['statut'] =
    ratio >= 80 ? 'Conforme' : ratio >= 60 ? 'À améliorer' : 'Non conforme';

  return {
    id: e.afb_referencedevaluation || e.afb_evaluationpartenaireid,
    partenaire: e.afb_tiersevaluename ?? '—',
    typeEval: 'RISK',
    score,
    scoreMax,
    statut,
    evaluateur: e.afb_evaluateurname ?? e.owneridname ?? '—',
    date: frDate(e.afb_datedevaluation),
  };
}
