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
    "Partenaire commercial / institutionnel — diligence standard COBAC R-2023/01.",
  fournisseur:
    "Fournisseur de biens ou services — diligence simplifiée + KYS.",
  intragroupe:
    "Entité liée à la banque (actionnaires ou dirigeants communs) — vigilance renforcée éthique & fiscale.",
};

export type RequiredDoc = {
  key: string;
  name: string;
  mandatory: boolean;
  hint?: string;
};

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
