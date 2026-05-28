// =============================================================
// Configuration de l'intégration Dataverse / Power Pages Web API
// =============================================================
// Le portail React (code site Power Pages) communique avec
// Microsoft Dataverse via /_api/<entity_set>. Cette config
// regroupe TOUT ce qui est susceptible de changer d'un
// environnement à l'autre (DEV / UAT / PROD).
//
// IMPORTANT : les noms de "set" ci-dessous sont les noms
// pluriels EXACTS attendus par OData. Dataverse les génère
// à la création des tables :
//   - logical name "afb_question"   → set "afb_questions"
//   - logical name "afb_tiers"      → set "afb_tierses" (suffixe "es" car finit par "s")
//   - logical name "afb_dossierkypkys" → set "afb_dossierkypkyses"
// Vérifier dans Power Apps Maker → table → "Plural name" si doute.
// =============================================================

// Activation auto : on appelle Dataverse uniquement quand on
// est servi par Power Pages. Sur localhost (npm run dev), on
// retombe sur des données factices pour développer sans backend.
export const USE_DATAVERSE =
  typeof window !== 'undefined' &&
  !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname)

// Noms des "EntitySet" OData (= pluriels) ----------------------
export const SETS = {
  // Module Référentiel central
  tiers: 'afb_tierses',
  tiersExterne: 'afb_tiersexternes',
  dossier: 'afb_dossierkypkyses',
  decision: 'afb_decisions',
  resultatScreening: 'afb_resultatscreenings',
  utilisateurInterne: 'afb_utilisateurinternes',
  journalAudit: 'afb_journalaudits',

  // Module Bibliothèque documentaire
  document: 'afb_documents',
  documentCategory: 'afb_documentcategories',
  documentVersion: 'afb_documentversions',

  // Module Questionnaires
  questionnaire: 'afb_questionnaires',
  section: 'afb_questionnairesections',
  question: 'afb_questions',
  questionOption: 'afb_questionoptions',
  questionLogic: 'afb_questionlogics',
  assignment: 'afb_questionnaireassignments',
  response: 'afb_questionnaireresponses',
  questionResponse: 'afb_questionresponses',
  clarification: 'afb_questionnaireclarifications',

  // Module KYC différencié
  partnerType: 'afb_partnertypes',
  checklist: 'afb_kycchecklists',
  checklistItem: 'afb_kycchecklistitems',

  // Standard Dataverse
  annotation: 'annotations',
  contact: 'contacts',
}

// Noms LOGIQUES des entités (utilisés pour les liens OData @odata.bind)
export const LOGICAL = {
  tiers: 'afb_tiers',
  dossier: 'afb_dossierkypkys',
  document: 'afb_document',
  documentCategory: 'afb_documentcategory',
  questionnaire: 'afb_questionnaire',
  assignment: 'afb_questionnaireassignment',
  question: 'afb_question',
  partnerType: 'afb_partnertype',
}
