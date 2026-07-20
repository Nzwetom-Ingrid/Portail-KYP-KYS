// Référentiel des pièces attendues par type d'entité — miroir de
// src/lib/entity-types.ts (back-office). Sert à afficher au partenaire la liste
// des documents à fournir, suivre le X/Y et lister les manquants. La clé (key)
// d'une pièce est stockée sur le document déposé (afb_typededocument) pour le
// rattachement précis.

export const REQUIRED_DOCS_BY_TYPE = {
  correspondant: [
    { key: 'licence', name: 'Licence bancaire / agrément régulateur', mandatory: true },
    { key: 'statuts', name: 'Statuts certifiés conformes', mandatory: true },
    { key: 'wolfsberg', name: 'Questionnaire Wolfsberg (CBDDQ)', mandatory: true },
    { key: 'lcbft', name: 'Politique LCB-FT & sanctions', mandatory: true },
    { key: 'dirigeants', name: 'Liste des dirigeants & organigramme', mandatory: true },
    { key: 'bilan', name: 'Bilan & comptes certifiés (3 derniers exercices)', mandatory: true },
    { key: 'fatca', name: 'Formulaire FATCA / CRS (W-8BEN-E)', mandatory: true },
    { key: 'patriot', name: 'Patriot Act Certification', mandatory: true },
    { key: 'audit', name: "Rapport d'audit LCB-FT indépendant", mandatory: false },
    { key: 'ubo-bank', name: 'Déclaration des bénéficiaires effectifs', mandatory: true },
  ],
  partenaire: [
    { key: 'rccm', name: 'Registre du commerce (RCCM)', mandatory: true },
    { key: 'statuts', name: 'Statuts de la société', mandatory: true },
    { key: 'cni', name: "Pièce d'identité du dirigeant", mandatory: true },
    { key: 'fiscal', name: 'Attestation de conformité fiscale', mandatory: true },
    { key: 'ubo', name: 'Déclaration des bénéficiaires effectifs (UBO)', mandatory: true },
    { key: 'convention', name: 'Convention de partenariat signée', mandatory: true },
    { key: 'rib', name: "Relevé d'identité bancaire", mandatory: false },
  ],
  fournisseur: [
    { key: 'rccm', name: 'Registre du commerce (RCCM)', mandatory: true },
    { key: 'statuts', name: 'Statuts de la société', mandatory: false },
    { key: 'rib', name: "Relevé d'identité bancaire (RIB)", mandatory: true },
    { key: 'fiscal', name: 'Attestation de conformité fiscale', mandatory: true },
    { key: 'cnps', name: 'Attestation CNPS', mandatory: true },
    { key: 'cni', name: "Pièce d'identité du dirigeant", mandatory: true },
    { key: 'ubo', name: 'Déclaration UBO (si > 25%)', mandatory: false },
  ],
  intragroupe: [
    { key: 'statuts', name: "Statuts & pacte d'actionnaires", mandatory: true },
    { key: 'rccm', name: 'Registre du commerce (RCCM)', mandatory: true },
    { key: 'ubo-chain', name: 'Chaîne complète des bénéficiaires (UBO ≥ 10%)', mandatory: true },
    { key: 'dirigeants', name: 'Liste des dirigeants & mandats croisés', mandatory: true },
    { key: 'convention', name: 'Convention intragroupe (prix de transfert)', mandatory: true },
    { key: 'transferpricing', name: 'Documentation prix de transfert / benchmark', mandatory: true },
    { key: 'fiscal', name: 'Attestation de conformité fiscale', mandatory: true },
    { key: 'ethics', name: "Déclaration de conflits d'intérêts", mandatory: true },
    { key: 'bilan', name: 'États financiers certifiés (3 derniers exercices)', mandatory: true },
  ],
}

export const ENTITY_TYPE_LABELS = {
  correspondant: 'Correspondant bancaire',
  partenaire: 'Partenaire',
  fournisseur: 'Fournisseur',
  intragroupe: 'Entité intragroupe',
}

// Type déduit du préfixe de la référence du dossier (KYP/KYS/KYI/KYC).
export function entityTypeFromRef(ref) {
  const r = (ref || '').toUpperCase()
  if (r.startsWith('KYI')) return 'intragroupe'
  if (r.startsWith('KYS')) return 'fournisseur'
  if (r.startsWith('KYC')) return 'correspondant'
  return 'partenaire'
}

// Libellé d'une pièce depuis sa clé (pour affichage du type de document).
export function docLabelFromKey(type, key) {
  if (!key) return null
  const list = REQUIRED_DOCS_BY_TYPE[type] || []
  const found = list.find((d) => d.key === key)
  return found ? found.name : null
}

// Liste des pièces attendues : la liste PERSONNALISÉE (JSON stocké sur le tiers,
// afb_documentsrequis) si présente, sinon les pièces par défaut du type.
export function parseRequiredDocs(jsonStr, entityType) {
  if (jsonStr) {
    try {
      const arr = JSON.parse(jsonStr)
      if (Array.isArray(arr) && arr.length) {
        return arr.map((d, i) => ({
          key: d.key || `p${i}`,
          name: d.name || d.key || 'Pièce',
          mandatory: !!d.mandatory,
        }))
      }
    } catch {
      /* JSON invalide → repli sur le type */
    }
  }
  return REQUIRED_DOCS_BY_TYPE[entityType] || REQUIRED_DOCS_BY_TYPE.partenaire
}
