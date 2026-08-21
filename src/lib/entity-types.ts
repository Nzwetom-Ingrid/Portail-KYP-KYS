export type EntityType = "correspondant" | "partenaire" | "fournisseur" | "intragroupe";

export const entityTypeLabels: Record<EntityType, string> = {
  correspondant: "Correspondant bancaire",
  partenaire: "Partenaire",
  fournisseur: "Fournisseur",
  intragroupe: "Entité intragroupe",
};

export const entityTypePrefix: Record<EntityType, string> = {
  correspondant: "KYC-B",
  partenaire: "KYP",
  fournisseur: "KYS",
  intragroupe: "KYI",
};

// Validity duration (in months) of a dossier per target type
export const entityTypeValidityMonths: Record<EntityType, number> = {
  correspondant: 12, // exigences renforcées — revue annuelle
  partenaire: 24,
  fournisseur: 36,
  intragroupe: 12, // revue annuelle obligatoire (parties liées)
};

/** Valeurs de choix `afb_familledinstitution` sur afb_partnertype. */
export const FAMILLE = {
  BanqueCorrespondante: 747010000,
  EMF: 747010001,
  EntrepriseIndividuelle: 747010002,
  SocieteCommerciale: 747010003,
  PersonnePhysique: 747010004,
  EtablissementPublic: 747010005,
  CooperativeGIC: 747010006,
  ProfessionLiberale: 747010007,
} as const;

/**
 * Les deux seuls types de dossier ouverts à la création.
 *
 * Un PARTENAIRE est une contrepartie financière : banque correspondante ou
 * établissement de microfinance. Un FOURNISSEUR livre des biens ou des services
 * à la banque. « correspondant » et « intragroupe » restent dans l'union pour
 * que les dossiers historiques portant un préfixe KYC-B ou KYI continuent de se
 * résoudre, mais ils ne sont plus proposés.
 */
export const TYPES_DOSSIER: EntityType[] = ["partenaire", "fournisseur"];

/**
 * Type de dossier PROPOSÉ d'après la famille d'institution du type de partenaire.
 * Seules les contreparties financières relèvent du KYP ; tout le reste fournit
 * quelque chose à la banque, donc KYS. Le chargé de relation peut trancher
 * autrement dans le formulaire — cette fonction ne fournit qu'un défaut.
 */
export function entityTypeFromFamille(famille?: number): EntityType {
  switch (famille) {
    case FAMILLE.BanqueCorrespondante:
    case FAMILLE.EMF:
      return "partenaire";
    default:
      return "fournisseur";
  }
}

/**
 * Checklist pré-remplie à la création.
 *
 * Le type de dossier (KYP / KYS) et le NIVEAU DE DILIGENCE sont deux axes
 * distincts. Une banque correspondante ouvre un dossier KYP ordinaire, mais
 * reste soumise aux exigences renforcées — Wolfsberg CBDDQ, FATCA/CRS, Patriot
 * Act — que la checklist « partenaire » ne porte pas. Sans cette distinction,
 * requalifier les correspondants en KYP leur ferait perdre trois pièces
 * obligatoires en silence.
 */
export function checklistParDefaut(type: EntityType, famille?: number): RequiredDoc[] {
  const source =
    famille === FAMILLE.BanqueCorrespondante ? "correspondant" : type;
  return requiredDocsByType[source].map((d) => ({ ...d }));
}

export function computeValidityDate(type: EntityType, from: Date = new Date()): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + entityTypeValidityMonths[type]);
  return d;
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export const entityTypeDescriptions: Record<EntityType, string> = {
  correspondant:
    "Banque correspondante — exigences renforcées Wolfsberg, FATCA/CRS, LCB-FT.",
  partenaire:
    "Contrepartie financière — banque correspondante ou établissement de microfinance.",
  fournisseur:
    "Entreprise qui livre des biens ou des services à la banque.",
  intragroupe:
    "Entité liée à la banque (actionnaires ou dirigeants communs) — vigilance renforcée éthique & fiscale.",
};

export type RequiredDoc = {
  key: string;
  name: string;
  mandatory: boolean;
  hint?: string;
};

/** Liste des pièces attendues : la liste PERSONNALISÉE (JSON stocké sur le tiers,
 *  afb_documentsrequis) si présente, sinon les pièces par défaut du type. */
export function parseRequiredDocs(jsonStr: string | undefined, entityType: EntityType): RequiredDoc[] {
  if (jsonStr) {
    try {
      const arr = JSON.parse(jsonStr);
      if (Array.isArray(arr) && arr.length) {
        return arr.map((d: { key?: string; name?: string; mandatory?: boolean; hint?: string }, i: number) => ({
          key: d.key || `p${i}`,
          name: d.name || d.key || 'Pièce',
          mandatory: !!d.mandatory,
          hint: d.hint,
        }));
      }
    } catch {
      /* JSON invalide → repli sur le type */
    }
  }
  return requiredDocsByType[entityType];
}

export const requiredDocsByType: Record<EntityType, RequiredDoc[]> = {
  correspondant: [
    { key: "licence", name: "Licence bancaire / agrément régulateur", mandatory: true },
    { key: "statuts", name: "Statuts certifiés conformes", mandatory: true },
    { key: "wolfsberg", name: "Questionnaire Wolfsberg (CBDDQ)", mandatory: true, hint: "Version 1.4" },
    { key: "lcbft", name: "Politique LCB-FT & sanctions", mandatory: true },
    { key: "dirigeants", name: "Liste des dirigeants & organigramme", mandatory: true },
    { key: "bilan", name: "Bilan & comptes certifiés (3 derniers exercices)", mandatory: true },
    { key: "fatca", name: "Formulaire FATCA / CRS (W-8BEN-E)", mandatory: true },
    { key: "patriot", name: "Patriot Act Certification", mandatory: true },
    { key: "audit", name: "Rapport d'audit LCB-FT indépendant", mandatory: false },
    { key: "ubo-bank", name: "Déclaration des bénéficiaires effectifs", mandatory: true },
  ],
  partenaire: [
    { key: "rccm", name: "Registre du commerce (RCCM)", mandatory: true },
    { key: "statuts", name: "Statuts de la société", mandatory: true },
    { key: "cni", name: "Pièce d'identité du dirigeant", mandatory: true },
    { key: "fiscal", name: "Attestation de conformité fiscale", mandatory: true },
    { key: "ubo", name: "Déclaration des bénéficiaires effectifs (UBO)", mandatory: true },
    { key: "convention", name: "Convention de partenariat signée", mandatory: true },
    { key: "rib", name: "Relevé d'identité bancaire", mandatory: false },
  ],
  fournisseur: [
    { key: "rccm", name: "Registre du commerce (RCCM)", mandatory: true },
    { key: "statuts", name: "Statuts de la société", mandatory: false },
    { key: "rib", name: "Relevé d'identité bancaire (RIB)", mandatory: true },
    { key: "fiscal", name: "Attestation de conformité fiscale", mandatory: true },
    { key: "cnps", name: "Attestation CNPS", mandatory: true },
    { key: "cni", name: "Pièce d'identité du dirigeant", mandatory: true },
    { key: "ubo", name: "Déclaration UBO (si > 25%)", mandatory: false },
  ],
  intragroupe: [
    { key: "statuts", name: "Statuts & pacte d'actionnaires", mandatory: true },
    { key: "rccm", name: "Registre du commerce (RCCM)", mandatory: true },
    { key: "ubo-chain", name: "Chaîne complète des bénéficiaires (UBO ≥ 10%)", mandatory: true },
    { key: "dirigeants", name: "Liste des dirigeants & mandats croisés", mandatory: true, hint: "Identification des liens avec la Banque" },
    { key: "convention", name: "Convention intragroupe (prix de transfert)", mandatory: true, hint: "Principe de pleine concurrence" },
    { key: "transferpricing", name: "Documentation prix de transfert / benchmark", mandatory: true },
    { key: "fiscal", name: "Attestation de conformité fiscale", mandatory: true },
    { key: "ethics", name: "Déclaration de conflits d'intérêts", mandatory: true },
    { key: "bilan", name: "États financiers certifiés (3 derniers exercices)", mandatory: true },
  ],
};

// ───────────────────────────────────────────────────────────────────
// Risque composite : KYC/AML + Éthique (conflits d'intérêts) + Fiscal (pleine concurrence)
// ───────────────────────────────────────────────────────────────────

export type RiskLevel = "low" | "medium" | "high";

export type CompositeRisk = {
  kycAml: RiskLevel;     // sanctions / PPE / LCB-FT
  ethique: RiskLevel;    // conflits d'intérêts (parties liées)
  fiscal: RiskLevel;     // prix de transfert / pleine concurrence
};

const riskScore: Record<RiskLevel, number> = { low: 1, medium: 2, high: 3 };

export function compositeOf(c: CompositeRisk): RiskLevel {
  // Note pondérée : KYC/AML 40%, Éthique 30%, Fiscal 30%
  const score = riskScore[c.kycAml] * 0.4 + riskScore[c.ethique] * 0.3 + riskScore[c.fiscal] * 0.3;
  if (score >= 2.4) return "high";
  if (score >= 1.6) return "medium";
  return "low";
}

// Pour les entités intragroupe, éthique & fiscal sont par défaut élevés
export function defaultRiskFor(type: EntityType, kycAml: RiskLevel = "low"): CompositeRisk {
  if (type === "intragroupe") {
    return { kycAml, ethique: "high", fiscal: "high" };
  }
  return { kycAml, ethique: "low", fiscal: "low" };
}
