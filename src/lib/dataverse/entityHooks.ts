/**
 * Hooks React Query prêts à l'emploi pour les 23 tables Dataverse de la
 * solution AFB KYP KYS. Chaque entrée expose :
 *   useList(options?)        → liste (filter, orderBy, top, select…)
 *   useGet(id, options?)     → un enregistrement
 *   useCreate()              → mutation de création
 *   useUpdate()              → mutation de mise à jour { id, changes }
 *   useDelete()              → mutation de suppression (id)
 *   keys                     → clés de cache (pour invalidations manuelles)
 *
 * Exemple :
 *   import { tiers } from '@/lib/dataverse/entityHooks';
 *   const { data, isLoading, error } = tiers.useList({ top: 50, orderBy: ['afb_raisonsociale asc'] });
 *   const create = tiers.useCreate();
 *   create.mutate({ afb_raisonsociale: 'ACME' });
 */
import { createEntityHooks } from './createEntityHooks';

import { ContactsService } from '@/generated/services/ContactsService';

import { Afb_critereevaluationsService } from '@/generated/services/Afb_critereevaluationsService';
import { Afb_decisionsService } from '@/generated/services/Afb_decisionsService';
import { Afb_documentcategoriesService } from '@/generated/services/Afb_documentcategoriesService';
import { Afb_documentdeconformitesService } from '@/generated/services/Afb_documentdeconformitesService';
import { Afb_documentsService } from '@/generated/services/Afb_documentsService';
import { Afb_documentversionsService } from '@/generated/services/Afb_documentversionsService';
import { Afb_dossierkypkysesService } from '@/generated/services/Afb_dossierkypkysesService';
import { Afb_evaluationpartenairesService } from '@/generated/services/Afb_evaluationpartenairesService';
import { Afb_grilleevaluationsService } from '@/generated/services/Afb_grilleevaluationsService';
import { Afb_journalauditsService } from '@/generated/services/Afb_journalauditsService';
import { Afb_notecriteresService } from '@/generated/services/Afb_notecriteresService';
import { Afb_kycchecklistsService } from '@/generated/services/Afb_kycchecklistsService';
import { Afb_partnertypesService } from '@/generated/services/Afb_partnertypesService';
import { Afb_questionlogicsService } from '@/generated/services/Afb_questionlogicsService';
import { Afb_questionnaireassignmentsService } from '@/generated/services/Afb_questionnaireassignmentsService';
import { Afb_questionnaireclarificationsService } from '@/generated/services/Afb_questionnaireclarificationsService';
import { Afb_questionnaireresponsesService } from '@/generated/services/Afb_questionnaireresponsesService';
import { Afb_questionnairesectionsService } from '@/generated/services/Afb_questionnairesectionsService';
import { Afb_questionnairesService } from '@/generated/services/Afb_questionnairesService';
import { Afb_questionoptionsService } from '@/generated/services/Afb_questionoptionsService';
import { Afb_questionresponsesService } from '@/generated/services/Afb_questionresponsesService';
import { Afb_questionsService } from '@/generated/services/Afb_questionsService';
import { Afb_resultatscreeningsService } from '@/generated/services/Afb_resultatscreeningsService';
import { Afb_tiersesService } from '@/generated/services/Afb_tiersesService';
import { Afb_tiersexterneb2csService } from '@/generated/services/Afb_tiersexterneb2csService';
import { Afb_ubosService } from '@/generated/services/Afb_ubosService';
import { Afb_utilisateurinternesService } from '@/generated/services/Afb_utilisateurinternesService';

export const critereEvaluation = createEntityHooks('afb_critereevaluation', Afb_critereevaluationsService);
export const evaluationsPartenaire = createEntityHooks('afb_evaluationpartenaire', Afb_evaluationpartenairesService);
export const grilleEvaluation = createEntityHooks('afb_grilleevaluation', Afb_grilleevaluationsService);
export const notesCritere = createEntityHooks('afb_notecritere', Afb_notecriteresService);
export const decisions = createEntityHooks('afb_decision', Afb_decisionsService);
export const documentCategories = createEntityHooks('afb_documentcategory', Afb_documentcategoriesService);
export const documentsConformite = createEntityHooks('afb_documentdeconformite', Afb_documentdeconformitesService);
export const documents = createEntityHooks('afb_document', Afb_documentsService);
export const documentVersions = createEntityHooks('afb_documentversion', Afb_documentversionsService);
export const dossiersKypKys = createEntityHooks('afb_dossierkypkys', Afb_dossierkypkysesService);
export const journalAudit = createEntityHooks('afb_journalaudit', Afb_journalauditsService);
export const kycChecklists = createEntityHooks('afb_kycchecklist', Afb_kycchecklistsService);
export const partnerTypes = createEntityHooks('afb_partnertype', Afb_partnertypesService);
export const questionLogics = createEntityHooks('afb_questionlogic', Afb_questionlogicsService);
export const questionnaireAssignments = createEntityHooks('afb_questionnaireassignment', Afb_questionnaireassignmentsService);
export const questionnaireClarifications = createEntityHooks('afb_questionnaireclarification', Afb_questionnaireclarificationsService);
export const questionnaireResponses = createEntityHooks('afb_questionnaireresponse', Afb_questionnaireresponsesService);
export const questionnaireSections = createEntityHooks('afb_questionnairesection', Afb_questionnairesectionsService);
export const questionnaires = createEntityHooks('afb_questionnaire', Afb_questionnairesService);
export const questionOptions = createEntityHooks('afb_questionoption', Afb_questionoptionsService);
export const questionResponses = createEntityHooks('afb_questionresponse', Afb_questionresponsesService);
export const questions = createEntityHooks('afb_question', Afb_questionsService);
export const resultatsScreening = createEntityHooks('afb_resultatscreening', Afb_resultatscreeningsService);
// Table CONTACT : c'est elle qui porte l'authentification Power Pages des
// partenaires (colonnes adx_identity_*). La console support en a besoin —
// afb_tiersexterneb2c n'est qu'un miroir du flux d'invitation.
export const contacts = createEntityHooks('contact', ContactsService);
export const tiers = createEntityHooks('afb_tiers', Afb_tiersesService);
export const tiersExterneB2c = createEntityHooks('afb_tiersexterneb2c', Afb_tiersexterneb2csService);
export const ubo = createEntityHooks('afb_ubo', Afb_ubosService);
export const utilisateursInternes = createEntityHooks('afb_utilisateurinterne', Afb_utilisateurinternesService);

/** Registre complet, pratique pour itérer ou accéder dynamiquement. */
export const dataverse = {
  contacts,
  critereEvaluation,
  evaluationsPartenaire,
  grilleEvaluation,
  notesCritere,
  decisions,
  documentCategories,
  documentsConformite,
  documents,
  documentVersions,
  dossiersKypKys,
  journalAudit,
  kycChecklists,
  partnerTypes,
  questionLogics,
  questionnaireAssignments,
  questionnaireClarifications,
  questionnaireResponses,
  questionnaireSections,
  questionnaires,
  questionOptions,
  questionResponses,
  questions,
  resultatsScreening,
  tiers,
  tiersExterneB2c,
  ubo,
  utilisateursInternes,
} as const;
