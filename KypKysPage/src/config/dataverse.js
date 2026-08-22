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
  tiersExterneB2C: 'afb_tiersexterneb2cs', // identité externe (lien e-mail B2C → tiers)
  ubo: 'afb_ubos',
  dossier: 'afb_dossierkypkyses',
  decision: 'afb_decisions',
  resultatScreening: 'afb_resultatscreenings',
  evaluation: 'afb_evaluationpartenaires',
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
  tiersExterneB2C: 'afb_tiersexterneb2c',
  ubo: 'afb_ubo',
  dossier: 'afb_dossierkypkys',
  document: 'afb_document',
  documentCategory: 'afb_documentcategory',
  questionnaire: 'afb_questionnaire',
  assignment: 'afb_questionnaireassignment',
  response: 'afb_questionnaireresponse',
  question: 'afb_question',
  partnerType: 'afb_partnertype',
  evaluation: 'afb_evaluationpartenaire',
}

// =============================================================
// Valeurs des "choix" (option sets) Dataverse — ENTIERS exacts
// repris des modèles générés de l'app interne (src/generated).
// Indispensable pour ÉCRIRE : Dataverse n'accepte que l'entier.
// =============================================================
export const CHOICES = {
  // afb_document.afb_statutdevalidite
  // « Remplacé » : la pièce n'est plus celle en vigueur, une version plus
  // récente l'a supplantée. À ne pas confondre avec « Expiré », qui parle de
  // la date de validité du document lui-même.
  documentStatut: { Valide: 0, EnAttente: 1, Expire: 747010001, Rejete: 747010002, Remplace: 747010003 },
  // afb_document.afb_sourcedudepot
  documentSource: { Tiers: 747010000, DCONF: 747010001, Systeme: 747010002 },
  // afb_document.afb_authentifie (0 = Oui, 1 = Non)
  documentAuthentifie: { Oui: 0, Non: 1 },
  // afb_ubo.afb_statutdevalidation
  uboStatut: { Valide: 0, EnCours: 1, NonVerifie: 2, Rejete: 747010001 },
  // afb_ubo.afb_statutppe
  uboPpe: { Non: 0, AutoDeclaree: 1, Detectee: 747010001 },
  // afb_ubo.afb_typedentite (0 = morale, 1 = physique)
  uboTypeEntite: { Morale: 0, Physique: 1 },
  // afb_questionnaireassignment.afb_statut
  assignmentStatut: { Valide: 0, EnCours: 1, Affecte: 2, Soumis: 747010001, EnRetard: 747010002, Annule: 747010003 },
  // afb_questionnaireresponse.afb_statutglobal
  responseStatut: { Valide: 0, Brouillon: 1, Soumis: 747010001, Rejete: 747010002, EnClarification: 747010003 },
  // afb_questionresponse.afb_statut
  questionResponseStatut: { Validee: 0, EnClarification: 1, Rejetee: 747010001 },
  // afb_evaluationpartenaire.afb_statutdelevaluation
  evaluationStatut: { Validee: 0, EnRevue: 1, Rejetee: 747010001, Brouillon: 747010002 },
  // afb_evaluationpartenaire.afb_decisionpartenariat (NOUVELLE colonne — valeurs à créer
  // dans Maker : Maintenir=0, SousSurveillance=1, Annuler=2)
  evaluationDecision: { Maintenir: 0, SousSurveillance: 1, Annuler: 2 },
}
