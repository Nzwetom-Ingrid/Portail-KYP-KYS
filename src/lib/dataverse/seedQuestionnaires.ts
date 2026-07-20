/**
 * Seed (one-off) des questionnaires AML + EXT dans Dataverse :
 * crée afb_questionnaire → afb_questionnairesection → afb_question → afb_questionoption.
 *
 * Appelle directement les services générés (pas les hooks) pour éviter de
 * journaliser ~250 créations dans l'audit. Idempotent : si un questionnaire
 * avec le même code existe déjà, il est ignoré.
 */
import type { IOperationResult } from '@microsoft/power-apps/data';
import { Afb_questionnairesService } from '@/generated/services/Afb_questionnairesService';
import { Afb_questionnairesectionsService } from '@/generated/services/Afb_questionnairesectionsService';
import { Afb_questionsService } from '@/generated/services/Afb_questionsService';
import { Afb_questionoptionsService } from '@/generated/services/Afb_questionoptionsService';
import {
  ALL_DEFS,
  Q_TYPE_CODE,
  TYPE_DOC_CODE,
  optionsFor,
  type QuestionnaireDef,
} from '@/data/questionnaireDefs';

async function ok<T>(p: Promise<IOperationResult<T>>): Promise<T> {
  const res = await p;
  if (!res.success) throw res.error ?? new Error('Création Dataverse échouée.');
  return res.data;
}

/** Lit un champ id d'un enregistrement renvoyé sans dépendre du typage généré. */
function idOf(rec: unknown, field: string): string {
  return (rec as Record<string, unknown>)[field] as string;
}

export interface SeedResult {
  code: string;
  created: boolean;
  sections: number;
  questions: number;
  options: number;
}

async function seedQuestionnaire(def: QuestionnaireDef, auteurGuid: string): Promise<SeedResult> {
  // Idempotence : si le questionnaire (code) existe déjà → on saute.
  const existing = await Afb_questionnairesService.getAll({
    filter: `afb_codedudocument eq '${def.code}'`,
    top: 1,
  });
  if (existing.success && (existing.data?.length ?? 0) > 0) {
    return { code: def.code, created: false, sections: 0, questions: 0, options: 0 };
  }

  const q = await ok(
    Afb_questionnairesService.create({
      afb_codedudocument: def.code,
      afb_titreenfrancais: def.titre,
      afb_titreenanglais: def.titre,
      afb_descriptionducontenu: def.description,
      afb_typededocument: TYPE_DOC_CODE[def.typeDoc],
      afb_statutdepublication: 0, // Publié
      afb_datedepublication: new Date().toISOString(),
      afb_version: 1,
      'afb_auteur@odata.bind': `/afb_utilisateurinternes(${auteurGuid})`,
    } as unknown as Parameters<typeof Afb_questionnairesService.create>[0]),
  );
  const qId = idOf(q, 'afb_questionnaireid');

  let sections = 0;
  let questions = 0;
  let options = 0;

  for (let si = 0; si < def.sections.length; si++) {
    const sec = def.sections[si];
    const s = await ok(
      Afb_questionnairesectionsService.create({
        afb_intituleenfrancais: sec.titre,
        afb_intituleenanglais: sec.titre,
        afb_numerodordre: si + 1,
        'afb_questionnaireassocie@odata.bind': `/afb_questionnaires(${qId})`,
      } as unknown as Parameters<typeof Afb_questionnairesectionsService.create>[0]),
    );
    const secId = idOf(s, 'afb_questionnairesectionid');
    sections++;

    for (let qi = 0; qi < sec.questions.length; qi++) {
      const qq = sec.questions[qi];
      const created = await ok(
        Afb_questionsService.create({
          afb_codedelaquestion: `${def.code}-S${si + 1}-Q${qi + 1}`,
          afb_libelleenfrancais: qq.libelle,
          afb_libelleenanglais: qq.libelle,
          afb_numerodordre: qi + 1,
          afb_obligatoire: qq.obligatoire ? 0 : 747010001, // 0 = Oui
          afb_piecejointerequise: qq.type === 'PIECE_JOINTE' ? 0 : 1, // 0 = Oui
          afb_typedequestion: Q_TYPE_CODE[qq.type],
          ...(qq.ref ? { afb_referencereglementaire: qq.ref } : {}),
          'afb_section@odata.bind': `/afb_questionnairesections(${secId})`,
        } as unknown as Parameters<typeof Afb_questionsService.create>[0]),
      );
      const questionId = idOf(created, 'afb_questionid');
      questions++;

      for (const o of optionsFor(qq.type)) {
        await ok(
          Afb_questionoptionsService.create({
            afb_libelleenfrancais: o.libelle,
            afb_libelleenanglais: o.libelle,
            afb_valeurstockee: o.valeur,
            afb_ordredaffichage: o.ordre,
            'afb_identifiantdelaquestion@odata.bind': `/afb_questions(${questionId})`,
          } as unknown as Parameters<typeof Afb_questionoptionsService.create>[0]),
        );
        options++;
      }
    }
  }

  return { code: def.code, created: true, sections, questions, options };
}

/** Seed AML + EXT. `auteurGuid` = fiche afb_utilisateurinterne (auteur requis). */
export async function seedAllQuestionnaires(auteurGuid: string): Promise<SeedResult[]> {
  const results: SeedResult[] = [];
  for (const def of ALL_DEFS) {
    results.push(await seedQuestionnaire(def, auteurGuid));
  }
  return results;
}
