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

/** Maps optionnelles pour résoudre les libellés (les `*name` ne sont pas
 *  renvoyés par retrieveMultiple → on résout via les listes chargées). */
export interface EvalResolvers {
  tiersById?: Map<string, string>;   // tiersId → nom du partenaire
  usersById?: Map<string, string>;   // userId  → nom de l'évaluateur
  typeByGrille?: Map<string, string>; // grilleId → type (SLA/OPS/RISK/EXT…)
}

export function toEvaluation(e: Afb_evaluationpartenaires, r?: EvalResolvers): Evaluation {
  const score = e.afb_noteglobale ?? 0;
  const scoreMax = e.afb_notemaximalepossible || 100;
  const ratio = scoreMax > 0 ? (score / scoreMax) * 100 : 0;
  const statut: Evaluation['statut'] =
    ratio >= 80 ? 'Conforme' : ratio >= 60 ? 'À améliorer' : 'Non conforme';

  // Colonne ajoutée hors modèle généré → accès via cast localisé.
  const decisionName = (e as { afb_decisionpartenariatname?: string }).afb_decisionpartenariatname;

  // Type : grille utilisée, sinon préfixe de la référence (EVAL-<TYPE>-…), sinon RISK.
  const fromGrille = e._afb_grilleutilisee_value ? r?.typeByGrille?.get(e._afb_grilleutilisee_value) : undefined;
  const fromRef = (e.afb_referencedevaluation ?? '').match(/EVAL-(SLA|OPS|RISK|EXT)/i)?.[1]?.toUpperCase();
  const typeEval = ((fromGrille || fromRef) as Evaluation['typeEval']) || 'RISK';

  return {
    id: e.afb_referencedevaluation || e.afb_evaluationpartenaireid,
    partenaire:
      (e._afb_tiersevalue_value ? r?.tiersById?.get(e._afb_tiersevalue_value) : undefined) ??
      e.afb_tiersevaluename ?? '—',
    typeEval,
    score,
    scoreMax,
    statut,
    evaluateur:
      (e._afb_evaluateur_value ? r?.usersById?.get(e._afb_evaluateur_value) : undefined) ??
      e.afb_evaluateurname ?? e.owneridname ?? '—',
    date: frDate(e.afb_datedevaluation),
    recordId: e.afb_evaluationpartenaireid,
    tiersId: e._afb_tiersevalue_value,
    statutEval: e.afb_statutdelevaluationname ?? undefined,
    decision: decisionName ?? undefined,
    publie: !!e.afb_datedevalidation, // publiée au tiers = date de mise à disposition renseignée
  };
}
