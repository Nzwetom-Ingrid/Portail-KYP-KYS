import type { EntityType } from "./entity-types";

export type QuestionType = "text" | "long" | "yesno" | "choice" | "file";

export type Question = {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  options?: string[];
  allowFile?: boolean;
  section?: string; // regroupement (ex. "Conformité", "LCB-FT", "Comptable")
  reference?: string; // référence réglementaire (ex. "COBAC R-2016-04 Art.65")
};

// Modèle COBAC pré-rempli — Fiche de contrôle Agent Banking (extrait représentatif)
export const cobacAgentBankingTemplate: Omit<Question, "id">[] = [
  { section: "Conformité — Externalisation", reference: "COBAC R-2016-04 Art.63", label: "Le prestataire est-il agréé/habilité selon les normes requises pour exercer l'activité externalisée ?", type: "yesno", required: true, allowFile: true },
  { section: "Conformité — Externalisation", reference: "COBAC R-2016-04 Art.64", label: "Le système de contrôle interne inclut-il les activités externalisées ?", type: "yesno", required: true, allowFile: true },
  { section: "Conformité — Externalisation", reference: "COBAC R-2016-04 Art.65-i", label: "Existe-t-il un contrat écrit entre la Banque et le prestataire ? (joindre copie)", type: "file", required: true },
  { section: "Conformité — Externalisation", reference: "COBAC R-2016-04 Art.65-i", label: "Les activités s'inscrivent-elles dans une politique formalisée de contrôle des prestataires ?", type: "yesno", required: true },
  { section: "LCB-FT", reference: "Règl. N°2023/01 LBC/FT", label: "Le prestataire applique-t-il un dispositif KYC documenté pour l'identification des clients ?", type: "yesno", required: true, allowFile: true },
  { section: "LCB-FT", reference: "Règl. N°2023/01 LBC/FT", label: "Une cartographie des risques LCB-FT est-elle en place et à jour ?", type: "yesno", required: true, allowFile: true },
  { section: "LCB-FT", reference: "Règl. N°2023/01 LBC/FT", label: "Les opérations atypiques font-elles l'objet de déclarations à l'ANIF ?", type: "yesno", required: true },
  { section: "Reporting COBAC", reference: "COBAC R-2023/02", label: "Les reportings COBAC sont-ils transmis dans les délais ?", type: "yesno", required: true, allowFile: true },
  { section: "Comptable", reference: "Règl. 01-20 CEMAC", label: "Existe-t-il une procédure formalisée de rapprochement comptable ?", type: "yesno", required: true, allowFile: true },
  { section: "Comptable", reference: "Règl. 01-20 CEMAC", label: "La piste d'audit est-elle complète et testable ?", type: "yesno", required: true },
  { section: "Sécurité opérationnelle", reference: "COBAC R-2016-04", label: "Existe-t-il un Plan de Continuité d'Activité (PCA) testé annuellement ?", type: "yesno", required: true, allowFile: true },
  { section: "Sécurité opérationnelle", label: "Constats / non-conformités identifiés sur la période contrôlée", type: "long", required: false, allowFile: true },
  { section: "Conclusions", label: "Recommandations & livrables attendus", type: "long", required: true },
  { section: "Conclusions", label: "Date cible de mise en œuvre des actions correctives", type: "text", required: true },
];

// Parse un CSV simple : Section;Question;Type;Référence;Obligatoire(O/N);AllowFile(O/N)
export function parseCsvQuestions(csv: string): Omit<Question, "id">[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  const out: Omit<Question, "id">[] = [];
  // skip header if first line contains "section" or "question"
  const start = /section|question/i.test(lines[0]) ? 1 : 0;
  const TYPES: QuestionType[] = ["text", "long", "yesno", "choice", "file"];
  for (let i = start; i < lines.length; i++) {
    const cols = lines[i].split(/[;,\t]/).map((c) => c.trim().replace(/^"|"$/g, ""));
    const [section, label, typeRaw, reference, req, file] = cols;
    if (!label) continue;
    const type = (TYPES.includes(typeRaw as QuestionType) ? typeRaw : "text") as QuestionType;
    out.push({
      section: section || undefined,
      label,
      type,
      reference: reference || undefined,
      required: /^o|^y|^1|^t/i.test(req ?? ""),
      allowFile: /^o|^y|^1|^t/i.test(file ?? ""),
    });
  }
  return out;
}

export type Answer = {
  questionId: string;
  value: string;
  fileName?: string;
  fileSize?: number;
};

export type ResponseSet = {
  id: string;
  respondentName: string;
  respondentEmail: string;
  submittedAt: string;
  answers: Answer[];
};

export type Questionnaire = {
  id: string;
  title: string;
  description?: string;
  target: EntityType;
  category: string; // catégorie du questionnaire au sein de la cible
  dueDate?: string;
  createdAt: string;
  createdBy: string;
  questions: Question[];
  status: "envoyé" | "en_cours" | "complété";
  responseSets?: ResponseSet[];
  /** GUID Dataverse du questionnaire (afb_questionnaireid). */
  dvQuestionnaireId?: string;
  /** GUID Dataverse de la section par défaut (afb_questionnairesectionid). */
  dvSectionId?: string;
  /** Mapping ID local → GUID Dataverse de chaque question. */
  dvQuestionIds?: Record<string, string>;
};

const KEY = "afb_questionnaires_v2";

export function loadAll(): Questionnaire[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveAll(list: Questionnaire[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("afb:questionnaires"));
}

export function upsert(q: Questionnaire) {
  const list = loadAll();
  const i = list.findIndex((x) => x.id === q.id);
  if (i >= 0) list[i] = q;
  else list.unshift(q);
  saveAll(list);
}

export function addResponseSet(qid: string, rs: ResponseSet) {
  const list = loadAll();
  const q = list.find((x) => x.id === qid);
  if (!q) return;
  q.responseSets = q.responseSets ?? [];
  const idx = q.responseSets.findIndex((r) => r.respondentEmail === rs.respondentEmail);
  if (idx >= 0) q.responseSets[idx] = rs;
  else q.responseSets.push(rs);
  // statut : si au moins une réponse → en_cours ; si tous les destinataires ont répondu → complété (best effort)
  q.status = q.responseSets.length > 0 ? "en_cours" : "envoyé";
  saveAll(list);
}

export function newId() {
  return "Q-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export const questionTypeLabels: Record<QuestionType, string> = {
  text: "Texte court",
  long: "Texte long",
  yesno: "Oui / Non",
  choice: "Choix multiple",
  file: "Téléversement de document",
};

export const categoriesByTarget: Record<EntityType, string[]> = {
  correspondant: [
    "KYC bancaire",
    "Wolfsberg (CBDDQ)",
    "FATCA / CRS",
    "LCB-FT & Sanctions",
    "Gouvernance & UBO",
    "Fiche de contrôle COBAC (Agent Banking)",
  ],
  partenaire: [
    "KYP standard",
    "Convention & engagements",
    "Conformité fiscale",
    "UBO & gouvernance",
    "RSE / éthique",
  ],
  fournisseur: [
    "KYS standard",
    "Identité & RIB",
    "Conformité fiscale & sociale",
    "Qualité & livraisons",
    "Santé / sécurité",
  ],
  intragroupe: [
    "Liens capitalistiques & dirigeants",
    "Conflits d'intérêts (éthique)",
    "Prix de transfert (fiscal)",
    "Conventions intragroupe",
    "Gouvernance & UBO",
  ],
};

// Annuaire fictif des cibles (en production : lookup Dataverse par target)
export const targetDirectory: Record<EntityType, { name: string; email: string }[]> = {
  correspondant: [
    { name: "Ecobank Transnational", email: "compliance@ecobank.com" },
    { name: "BGFI Bank Group", email: "kyc@bgfi.com" },
    { name: "Standard Chartered CM", email: "afb-corr@sc.com" },
  ],
  partenaire: [
    { name: "Société Beta SARL", email: "contact@beta.cm" },
    { name: "Cameroon Tech Hub", email: "ops@cthub.cm" },
    { name: "MTN Mobile Money", email: "compliance@mtn.cm" },
  ],
  fournisseur: [
    { name: "Bureautique Plus", email: "ventes@buroplus.cm" },
    { name: "CleanServ Cameroun", email: "facturation@cleanserv.cm" },
    { name: "AfricaPrint SARL", email: "contact@africaprint.cm" },
  ],
  intragroupe: [
    { name: "AFB Holding (actionnaire)", email: "secretariat@afb-holding.cm" },
    { name: "AFB Assurance SA", email: "compliance@afb-assurance.cm" },
    { name: "AFB Leasing SARL", email: "direction@afb-leasing.cm" },
  ],
};
