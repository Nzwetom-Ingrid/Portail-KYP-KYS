/**
 * Affectation automatique des questionnaires à un tiers selon son TYPE.
 *
 * Mapping (décision 2026-06-04, clé = code du type de partenaire) :
 *   BC / EMF / IF → AML   ·   AGT → EXT
 *
 * Appelé après la création d'un tiers (best-effort : ne bloque jamais la
 * création). Crée un afb_questionnaireassignment (statut « Affecté »), en
 * évitant les doublons. Utilise les services générés directement.
 */
import { Afb_questionnairesService } from '@/generated/services/Afb_questionnairesService';
import { Afb_questionnaireassignmentsService } from '@/generated/services/Afb_questionnaireassignmentsService';
import { getCurrentUser } from '@/lib/auth/currentUserRef';

/** Code du type de partenaire (afb_codeinstitution) → codes de questionnaires. */
const QUESTIONNAIRES_BY_TYPE_CODE: Record<string, string[]> = {
  BC: ['AML-AFB-1.2'],
  EMF: ['AML-AFB-1.2'],
  IF: ['AML-AFB-1.2'],
  AGT: ['EXT-AGENT-BANKING-1.0'],
};

const DEADLINE_DAYS = 30;

/**
 * Crée une affectation (afb_questionnaireassignment) si elle n'existe pas déjà
 * pour ce couple tiers + questionnaire. Renvoie true si créée.
 */
async function createAssignmentIfAbsent(
  questionnaireId: string,
  tiersId: string,
  auteurGuid: string,
  deadlineDays: number,
): Promise<boolean> {
  // Doublon ? (même tiers + même questionnaire déjà affecté)
  const existing = await Afb_questionnaireassignmentsService.getAll({
    filter: `_afb_tiers_value eq ${tiersId} and _afb_versionduquestionnaire_value eq ${questionnaireId}`,
    top: 1,
  });
  if (existing.success && (existing.data?.length ?? 0) > 0) return false;

  const now = new Date();
  const deadline = new Date(now.getTime() + deadlineDays * 86_400_000);
  await Afb_questionnaireassignmentsService.create({
    afb_referenceaffectation: `AFF-${Date.now()}-${tiersId.slice(0, 6)}`,
    afb_statut: 2, // Affecté
    afb_typederappels: 0, // Standard
    afb_tauxdecompletion: 0,
    afb_datedaffectation: now.toISOString(),
    afb_datedecheance: deadline.toISOString(),
    'afb_auteurdelaffectation@odata.bind': `/afb_utilisateurinternes(${auteurGuid})`,
    'afb_tiers@odata.bind': `/afb_tierses(${tiersId})`,
    'afb_versionduquestionnaire@odata.bind': `/afb_questionnaires(${questionnaireId})`,
  } as unknown as Parameters<typeof Afb_questionnaireassignmentsService.create>[0]);
  return true;
}

/**
 * Affecte le(s) questionnaire(s) correspondant au type au tiers donné.
 * Renvoie le nombre d'affectations créées. Best-effort (silencieux en cas d'échec).
 */
export async function assignQuestionnairesForTiers(
  tiersId: string,
  partnerTypeCode: string | undefined,
  fallbackAuteurGuid?: string,
): Promise<number> {
  if (!tiersId) return 0;
  const codes = QUESTIONNAIRES_BY_TYPE_CODE[(partnerTypeCode ?? '').toUpperCase()] ?? [];
  if (!codes.length) return 0;

  const auteurGuid = getCurrentUser().utilisateurInterneId ?? fallbackAuteurGuid;
  if (!auteurGuid) return 0; // auteur requis par le modèle

  let count = 0;
  for (const qCode of codes) {
    try {
      const found = await Afb_questionnairesService.getAll({
        filter: `afb_codedudocument eq '${qCode}'`,
        top: 1,
      });
      const qId = found.success ? found.data?.[0]?.afb_questionnaireid : undefined;
      if (!qId) continue;
      if (await createAssignmentIfAbsent(qId, tiersId, auteurGuid, DEADLINE_DAYS)) count++;
    } catch {
      // best-effort : on n'interrompt jamais la création du tiers
    }
  }
  return count;
}

/**
 * Affectation MANUELLE : affecte un questionnaire précis à plusieurs tiers
 * (depuis le builder « Affecter à des partenaires »). Renvoie le nombre créé.
 */
export async function assignQuestionnaireToTiers(
  questionnaireId: string,
  tiersIds: string[],
  deadlineDays = DEADLINE_DAYS,
  fallbackAuteurGuid?: string,
): Promise<number> {
  const auteurGuid = getCurrentUser().utilisateurInterneId ?? fallbackAuteurGuid;
  if (!questionnaireId || !auteurGuid || !tiersIds.length) return 0;
  let count = 0;
  for (const tiersId of tiersIds) {
    try {
      if (await createAssignmentIfAbsent(questionnaireId, tiersId, auteurGuid, deadlineDays)) count++;
    } catch {
      /* on continue les autres tiers */
    }
  }
  return count;
}
