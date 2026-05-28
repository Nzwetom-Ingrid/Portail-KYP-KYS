// =============================================================
// Couche métier : opérations haut niveau côté partenaire
// =============================================================
// Toutes les fonctions de ce module renvoient des objets dans
// le format attendu par les composants React, qu'elles tapent
// dans Dataverse ou dans les mocks. Les composants ne savent
// pas — et n'ont pas à savoir — d'où viennent les données.
// =============================================================

import { dv, getCurrentUser } from './dataverse'
import { SETS, LOGICAL } from '../config/dataverse'
import {
  MOCK_TIERS,
  MOCK_DOSSIER,
  MOCK_DOCUMENTS,
  MOCK_QUESTIONNAIRES,
  MOCK_QUESTIONS,
} from './mock'

// -------- Tiers courant (résolu via le Contact Power Pages) ----
let _tiers = null
export async function getCurrentTiers() {
  if (_tiers) return _tiers
  if (!dv.enabled) {
    _tiers = MOCK_TIERS
    return _tiers
  }
  const user = await getCurrentUser()
  if (!user?.contactId) return null
  // Le Contact Power Pages porte un lookup vers afb_tiers (à câbler côté solution).
  // Navigation property côté contact = nom du lookup en PascalCase : "afb_Tiers"
  // Relation 1-N (afb_tiers → contact) : afb_contact_Tiers_afb_tiers
  const c = await dv.get(
    SETS.contact,
    user.contactId,
    `?$select=_afb_tiers_value&$expand=afb_Tiers($select=afb_tiersid,afb_nom,afb_type,afb_niveau_risque,afb_statut)`
  ).catch(() => null)
  _tiers = c?.afb_Tiers ?? null
  return _tiers
}

// -------- Dossier KYP/KYS du tiers ---------------------------
export async function loadDossier(tiersId) {
  if (!dv.enabled) return MOCK_DOSSIER
  const items = await dv.list(
    SETS.dossier,
    `?$filter=_afb_tiers_value eq ${tiersId}&$top=1&$orderby=createdon desc`
  )
  return items[0] ?? null
}

// -------- Documents ------------------------------------------
export async function loadDocuments(tiersId) {
  if (!dv.enabled) return [...MOCK_DOCUMENTS]
  return await dv.list(
    SETS.document,
    `?$filter=_afb_tiers_value eq ${tiersId}` +
      `&$select=afb_documentid,afb_nomfichier,afb_typedocument,afb_statutvalidite,createdon,afb_date_expiration` +
      `&$expand=afb_categorie($select=afb_libelle)` +
      `&$orderby=createdon desc`
  )
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] || '')
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

/** Téléverse un fichier : 1) crée l'enregistrement afb_document, 2) attache le binaire en note. */
export async function uploadDocument(tiersId, file, categoryId = null) {
  if (!dv.enabled) {
    // Simule un upload local (sans persistance)
    return {
      afb_documentid: `mock-${Date.now()}`,
      afb_nomfichier: file.name,
      afb_typedocument: `${(file.name.split('.').pop() || 'PDF').toUpperCase()} · ${(file.size / 1048576).toFixed(1)} Mo`,
      afb_statutvalidite: 'EnRevue',
      createdon: new Date().toISOString(),
    }
  }

  const payload = {
    afb_nomfichier: file.name,
    afb_typedocument: file.type || 'application/octet-stream',
    afb_statutvalidite: 'EnRevue',
    [`afb_tiers@odata.bind`]: `/${SETS.tiers}(${tiersId})`,
  }
  if (categoryId) {
    payload[`afb_categorie@odata.bind`] = `/${SETS.documentCategory}(${categoryId})`
  }

  const created = await dv.create(SETS.document, payload)

  // Attache le binaire en annotation (compatible Power Pages, < 30 Mo)
  const b64 = await fileToBase64(file)
  await dv.create(SETS.annotation, {
    [`objectid_${LOGICAL.document}@odata.bind`]: `/${SETS.document}(${created.afb_documentid})`,
    subject: 'Pièce jointe partenaire',
    filename: file.name,
    mimetype: file.type || 'application/octet-stream',
    documentbody: b64,
  })

  return created
}

export async function deleteDocument(documentId) {
  if (!dv.enabled) return
  await dv.remove(SETS.document, documentId)
}

// -------- Questionnaires --------------------------------------
export async function loadAssignedQuestionnaires(tiersId) {
  if (!dv.enabled) return [...MOCK_QUESTIONNAIRES]
  // QuestionnaireAssignment → afb_tiers + afb_questionnaire (lookup)
  const rows = await dv.list(
    SETS.assignment,
    `?$filter=_afb_tiers_value eq ${tiersId}` +
      `&$select=afb_assignmentid,afb_statut,afb_date_echeance,afb_taux_completion` +
      `&$expand=afb_questionnaire($select=afb_questionnaireid,afb_code,afb_intitule,afb_sous_titre,afb_nb_questions)` +
      `&$orderby=afb_date_echeance asc`
  )
  // On aplatit pour la vue
  return rows.map((r) => ({
    afb_assignmentid: r.afb_assignmentid,
    afb_questionnaireid: r.afb_questionnaire?.afb_questionnaireid,
    afb_code: r.afb_questionnaire?.afb_code,
    afb_intitule: r.afb_questionnaire?.afb_intitule,
    afb_sous_titre: r.afb_questionnaire?.afb_sous_titre,
    afb_nb_questions: r.afb_questionnaire?.afb_nb_questions,
    afb_statut: r.afb_statut,
    afb_progression: r.afb_taux_completion ?? 0,
    afb_echeance: r.afb_date_echeance,
  }))
}

export async function loadQuestionnaireQuestions(questionnaireId) {
  if (!dv.enabled) return [...MOCK_QUESTIONS]
  // Questions + Options regroupées par questionnaire
  const questions = await dv.list(
    SETS.question,
    `?$filter=_afb_questionnaire_value eq ${questionnaireId}` +
      `&$select=afb_questionid,afb_ordre,afb_libelle,afb_type,afb_obligatoire` +
      `&$expand=afb_question_options($select=afb_libelle,afb_valeur,afb_ordre)` +
      `&$orderby=afb_ordre asc`
  )
  return questions.map((q) => ({
    afb_questionid: q.afb_questionid,
    afb_ordre: q.afb_ordre,
    afb_libelle: q.afb_libelle,
    afb_type: q.afb_type,
    afb_obligatoire: q.afb_obligatoire,
    options: (q.afb_question_options || [])
      .sort((a, b) => (a.afb_ordre ?? 0) - (b.afb_ordre ?? 0))
      .map((o) => o.afb_libelle),
  }))
}

export async function submitQuestionnaireResponse(assignmentId, answers) {
  if (!dv.enabled) {
    return { afb_responseid: `mock-${Date.now()}`, soumis: true }
  }

  // 1) En-tête QuestionnaireResponse
  const header = await dv.create(SETS.response, {
    [`afb_assignment@odata.bind`]: `/${SETS.assignment}(${assignmentId})`,
    afb_date_soumission: new Date().toISOString(),
    afb_statut: 'Soumis',
  })

  // 2) Réponses individuelles
  await Promise.all(
    Object.entries(answers).map(([questionId, value]) =>
      dv.create(SETS.questionResponse, {
        [`afb_response@odata.bind`]: `/${SETS.response}(${header.afb_responseid})`,
        [`afb_question@odata.bind`]: `/${SETS.question}(${questionId})`,
        afb_valeur_texte: typeof value === 'string' ? value : null,
        afb_horodatage: new Date().toISOString(),
        afb_statut: 'Soumise',
      })
    )
  )

  // 3) Met à jour l'assignment côté statut
  await dv.update(SETS.assignment, assignmentId, {
    afb_statut: 'Soumis',
    afb_taux_completion: 100,
  })

  return header
}

// -------- Onboarding (création de la fiche tiers) -------------
export async function submitOnboarding(form) {
  if (!dv.enabled) {
    return { afb_tiersid: `mock-${Date.now()}`, ...form }
  }
  return await dv.create(SETS.tiers, {
    afb_nom: form.raisonSociale,
    afb_type: form.profil === 'kys' ? 'KYS' : 'KYP',
    afb_forme_juridique: form.formeJuridique,
    afb_rccm: form.rccm,
    afb_secteur: form.secteur,
    afb_pays: form.pays,
    afb_adresse: form.adresse,
    afb_email: form.email,
    afb_telephone: form.telephone,
    afb_rep_nom: form.repNom,
    afb_rep_fonction: form.repFonction,
    afb_rep_email: form.repEmail,
    afb_rep_telephone: form.repTelephone,
    afb_statut: 'EnCoursOnboarding',
  })
}
