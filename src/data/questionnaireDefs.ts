// =============================================================
// Définitions des questionnaires AML + EXT pour le SEED Dataverse.
// (copie de KypKysPage/src/data/*Questionnaire.js — les deux projets
//  Vite sont séparés, on ne peut pas importer l'un dans l'autre.)
// Source de vérité fonctionnelle : les PDF AFB (AML 1.2, Fiche Agent Banking).
// =============================================================

export type QType =
  | 'TEXTE_COURT' | 'TEXTE_LONG' | 'OUI_NON' | 'CHOIX_UNIQUE'
  | 'CHOIX_MULTIPLES' | 'NUMERIQUE' | 'DATE' | 'PIECE_JOINTE' | 'TABLEAU' | 'STATUT';

export interface QDef {
  libelle: string;
  type: QType;
  obligatoire: boolean;
  ref?: string;
}
export interface SectionDef {
  titre: string;
  questions: QDef[];
}
export interface QuestionnaireDef {
  /** Code unique (sert à l'idempotence du seed). */
  code: string;
  /** Type de document Dataverse : 'AML' ou 'EXT'. */
  typeDoc: 'AML' | 'EXT';
  titre: string;
  description: string;
  sections: SectionDef[];
}

/** Type de question → code Dataverse afb_typedequestion. */
export const Q_TYPE_CODE: Record<QType, number> = {
  TEXTE_COURT: 0,
  OUI_NON: 1,
  PIECE_JOINTE: 2,
  TABLEAU: 3,
  NUMERIQUE: 4,
  TEXTE_LONG: 747010001,
  CHOIX_UNIQUE: 747010002,
  CHOIX_MULTIPLES: 747010003,
  DATE: 747010004,
  STATUT: 747010005,
};

/** afb_questionnaire.afb_typededocument */
export const TYPE_DOC_CODE: Record<'AML' | 'EXT', number> = { AML: 0, EXT: 3 };

/** Options par défaut selon le type de question (pour le seed). */
export const OUI_NON_OPTIONS = [
  { libelle: 'Oui', valeur: 'Oui', ordre: 1 },
  { libelle: 'Non', valeur: 'Non', ordre: 2 },
];
export const STATUT_OPTIONS = [
  { libelle: 'Conforme (C)', valeur: 'C', ordre: 1 },
  { libelle: 'Partiellement conforme (PC)', valeur: 'PC', ordre: 2 },
  { libelle: 'Non conforme (NC)', valeur: 'NC', ordre: 3 },
  { libelle: 'Non applicable (NA)', valeur: 'NA', ordre: 4 },
];

/** Renvoie les options à créer pour une question (ou [] si non applicable). */
export function optionsFor(type: QType): { libelle: string; valeur: string; ordre: number }[] {
  if (type === 'OUI_NON') return OUI_NON_OPTIONS;
  if (type === 'STATUT') return STATUT_OPTIONS;
  return [];
}

const C = (libelle: string, ref?: string): QDef => ({ libelle, type: 'STATUT', obligatoire: true, ref });

export const AML_DEF: QuestionnaireDef = {
  code: 'AML-AFB-1.2',
  typeDoc: 'AML',
  titre: 'Questionnaire KYC / AML',
  description: 'Connaissance client — dispositif LCB-FT, sanctions, fraude et corruption (Afriland First Bank).',
  sections: [
    {
      titre: 'I. Informations générales',
      questions: [
        { libelle: "Raison sociale de l'entité", type: 'TEXTE_COURT', obligatoire: true },
        { libelle: 'Adresse complète du siège social (pays, région, ville, rue)', type: 'TEXTE_LONG', obligatoire: true },
        { libelle: 'Contact (e-mail, téléphone, boîte postale, fax)', type: 'TEXTE_LONG', obligatoire: true },
        { libelle: 'Pays de résidence fiscale', type: 'TEXTE_COURT', obligatoire: true },
        { libelle: "Numéro d'identification fiscale (NIU)", type: 'TEXTE_COURT', obligatoire: true },
        { libelle: 'Agrément (référence, date et lieu de délivrance)', type: 'TEXTE_COURT', obligatoire: false },
        { libelle: 'Extrait du Registre de commerce / RCCM (référence, date, lieu)', type: 'TEXTE_COURT', obligatoire: true },
        { libelle: "Activités entrant dans l'objet social", type: 'TEXTE_LONG', obligatoire: true },
        { libelle: 'Code SWIFT', type: 'TEXTE_COURT', obligatoire: false },
        { libelle: 'Identifiant FATCA (GIIN)', type: 'TEXTE_COURT', obligatoire: false },
        { libelle: "Nombre d'agences dans le pays de résidence fiscale", type: 'NUMERIQUE', obligatoire: false },
        { libelle: "Nombre d'agences hors du pays (juridictions sous sanctions ONU/UE/OFAC le cas échéant)", type: 'TEXTE_LONG', obligatoire: false },
        { libelle: "Régulateur / organisme de surveillance de l'institution", type: 'TEXTE_COURT', obligatoire: false },
        { libelle: 'Couverture médiatique négative (LCB-FT / corruption) sur les 3 dernières années ?', type: 'OUI_NON', obligatoire: true },
        { libelle: 'Sanctionné sur les 3 dernières années (conformité, LCB-FT, fraude, corruption) ?', type: 'OUI_NON', obligatoire: true },
        { libelle: 'Si oui, détails sur les carences et mesures correctives', type: 'TEXTE_LONG', obligatoire: false },
      ],
    },
    {
      titre: "II. Structure de l'actionnariat",
      questions: [
        { libelle: 'Liste des actionnaires (nom, naissance, nationalité, résidence fiscale, % actions)', type: 'TABLEAU', obligatoire: true },
        { libelle: 'Actionnariat des personnes morales détenant au moins 10 % du capital', type: 'TABLEAU', obligatoire: false },
      ],
    },
    {
      titre: 'III. Bénéficiaires effectifs (UBO)',
      questions: [
        { libelle: 'Liste des bénéficiaires effectifs (≥ 25 %, ou ≥ 10 % pour correspondants) — chaîne de détention', type: 'TABLEAU', obligatoire: true },
      ],
    },
    {
      titre: "IV. Conseil d'administration",
      questions: [{ libelle: 'Liste des membres du conseil (exécutif / non-exécutif / indépendant)', type: 'TABLEAU', obligatoire: true }],
    },
    {
      titre: 'V. Dirigeants',
      questions: [{ libelle: 'Liste des dirigeants (nom, naissance, nationalité, fonctions)', type: 'TABLEAU', obligatoire: true }],
    },
    {
      titre: 'VI. Responsable conformité',
      questions: [
        { libelle: 'Nom complet du Responsable Conformité (CCO)', type: 'TEXTE_COURT', obligatoire: true },
        { libelle: 'Coordonnées du CCO (e-mail, téléphone)', type: 'TEXTE_COURT', obligatoire: true },
      ],
    },
    {
      titre: 'VII. Auditeurs externes',
      questions: [{ libelle: 'Auditeurs externes (nom, e-mail, téléphone)', type: 'TABLEAU', obligatoire: false }],
    },
    {
      titre: 'VIII. Personnes politiquement exposées (PPE)',
      questions: [
        { libelle: 'Des PPE sont-elles actionnaires, administrateurs ou dirigeants ?', type: 'OUI_NON', obligatoire: true },
        { libelle: 'Si oui, liste des PPE (nom, naissance, nationalité, fonctions)', type: 'TABLEAU', obligatoire: false },
      ],
    },
    {
      titre: 'IX. Lutte contre le blanchiment et le financement du terrorisme',
      questions: [
        { libelle: 'Décrire la fonction conformité et l’unité LCB-FT', type: 'TEXTE_LONG', obligatoire: true },
        { libelle: 'Effectif total dédié à la conformité', type: 'NUMERIQUE', obligatoire: false },
        { libelle: 'Politique LCB-FT approuvée par le Conseil ?', type: 'OUI_NON', obligatoire: true },
        { libelle: "Date d'approbation de la politique LCB-FT", type: 'DATE', obligatoire: false },
        { libelle: "Politique d'acceptation de la clientèle avec interdictions d'entrée en relation ?", type: 'OUI_NON', obligatoire: true },
        { libelle: 'Politiques LCB-FT appliquées à toutes les succursales et filiales ?', type: 'OUI_NON', obligatoire: true },
        { libelle: 'Cartographie des risques LCB-FT ?', type: 'OUI_NON', obligatoire: true },
        { libelle: 'Processus de revue et mise à jour des informations clients ?', type: 'OUI_NON', obligatoire: true },
        { libelle: 'Mesures pour ne pas traiter avec des banques fictives (shell banks) ?', type: 'OUI_NON', obligatoire: true },
        { libelle: 'Mesures de vigilance renforcée (PPE, MSB, banques, casinos, armement, métaux précieux, ONG) ?', type: 'OUI_NON', obligatoire: true },
        { libelle: 'Système de surveillance des comptes/transactions pour opérations suspectes ?', type: 'OUI_NON', obligatoire: true },
        { libelle: 'Procédures de déclaration des opérations suspectes aux autorités ?', type: 'OUI_NON', obligatoire: true },
        { libelle: 'Filtrage clients/transactions contre les listes de sanctions ?', type: 'OUI_NON', obligatoire: true },
      ],
    },
    {
      titre: 'X. Lutte contre la fraude et la corruption',
      questions: [
        { libelle: 'Soumis à des lois/règlements anti-corruption ?', type: 'OUI_NON', obligatoire: true },
        { libelle: 'Politiques pour prévenir/détecter/signaler fraude et corruption ?', type: 'OUI_NON', obligatoire: true },
        { libelle: 'Structure dédiée à la lutte contre la fraude et la corruption ?', type: 'OUI_NON', obligatoire: true },
        { libelle: 'Vérification des antécédents du personnel, clients et contreparties ?', type: 'OUI_NON', obligatoire: true },
        { libelle: 'Mécanisme de signalement (whistleblowing) ?', type: 'OUI_NON', obligatoire: true },
      ],
    },
    {
      titre: 'XI. Pièces à joindre',
      questions: [
        { libelle: 'Statuts, RCCM, agrément, politique LCB-FT, cartographie, 3 derniers états financiers, FATCA W-8BEN-E, Wolfsberg, politique anti-fraude, passeports actionnaires/dirigeants/UBO', type: 'PIECE_JOINTE', obligatoire: true },
      ],
    },
  ],
};

export const EXT_DEF: QuestionnaireDef = {
  code: 'EXT-AGENT-BANKING-1.0',
  typeDoc: 'EXT',
  titre: 'Fiche de contrôle — Activités externalisées / Agents Banking',
  description: 'Grille de contrôle des prestataires et agents bancaires — externalisation, contrôle permanent, risques et exigences Agents Banking.',
  sections: [
    {
      titre: '1. Conformité — Externalisation (COBAC R-2016-04)',
      questions: [
        C("Le prestataire est-il agréé/habilité pour l'activité externalisée ?", 'Art.63'),
        C('Le contrôle interne inclut-il les activités externalisées (dispositif dédié) ?', 'Art.64'),
        C('Contrat écrit entre la Banque et le prestataire ?', 'Art.65-i'),
        C('Politique formalisée de contrôle des prestataires ?', 'Art.65-i'),
        C('Engagement qualité (SLA) et mécanismes de secours (PCA/PRA) ?', 'Art.65-ii'),
        C('Conformité aux procédures de contrôle de la Banque ?', 'Art.65-ii'),
        C("Droit d'audit étendu de la Banque chez le prestataire ?", 'Art.65-ii'),
        C('Accès à toute information sur place si nécessaire ?', 'Art.65-ii'),
        C("Reporting régulier de l'activité et de la situation financière ?", 'Art.65-ii'),
        C('Conservation et accessibilité (données, dossiers, archives) ?', 'Art.65-iii'),
        C('Contrôle COBAC sur pièces et sur place prévu au contrat ?', 'Art.66'),
        C("Décision d'externaliser prise par l'organe délibérant (étude avantages/risques) ?", 'Art.67'),
        C('Accord préalable du Secrétaire Général de la COBAC ?', 'Art.69'),
        C('Assurance risque : police valide, copie certifiée communiquée ?', 'Contractuel'),
        C('Reportings réglementaires COBAC produits et transmis dans les délais ?', 'Art.65-ii/66'),
      ],
    },
    {
      titre: '2. Contrôle permanent',
      questions: [
        C("Contrôles sur l'ensemble des processus externalisés ?", 'CP Q1'),
        C('Autocontrôle (1er échelon) et remontée du reporting ?', 'Q2'),
        C("Base incidents avec plans d'actions ?", 'Q3'),
        C('Efficacité des contrôles évaluée périodiquement ?', 'Q4'),
        C('Guides de contrôle disponibles ?', 'Q5'),
        C('Transmission des rapports de contrôle ?', 'Q6'),
        C('Dispositif de contrôle comptable chez le partenaire ?', 'Q7'),
        C("Modalités d'enregistrement assurant la piste d'audit ?", 'Q8'),
        C('Respect du tarifaire et des plafonds réglementaires ?', 'Q9'),
        C('Suivi des comptes dormants ?', 'Q10'),
        C('Archivage numérique et physique ?', 'Q11'),
        C('Facturation correspondant à un travail effectif ?', 'Q12'),
        C('Séparation des tâches dans la validation des opérations ?', 'Q13'),
        C('Respect des SLA ?', 'Q14'),
        C('Sécurité des biens et des personnes ?', 'Q15'),
      ],
    },
    {
      titre: '3. Risques — Organisation, incidents, continuité, finances',
      questions: [
        C("Organisation interne pour l'activité externalisée ?", 'R Q1'),
        C('Dispositif de mise à jour des ressources (plan de formation) ?', 'Q2'),
        C('Séparation des tâches matérialisée ?', 'Q3'),
        C('Dispositifs techniques/logistiques adéquats ?', 'Q4'),
        C('Distinction des opérations First Bank vs autres ?', 'Q5'),
        C('Sécurité/confidentialité des données ?', 'Q6'),
        C('Auto-évaluation + respect fréquence reporting ?', 'Q7'),
        C('Sous-prestataires encadrés (approbation, clauses) ?', 'Q8'),
        C('Documentation encadrant chaque activité externalisée ?', 'Q9'),
        C('Procédures validées par organe délibérant et actualisées ?', 'Q10'),
        C('Cartographie des risques à jour ?', 'Q11'),
        C('Profil de risques (probabilité/impact) défini ?', 'Q12'),
        C('Mesures de mitigation évaluées ?', 'Q13'),
        C('Profil de risque net + mitigations ?', 'Q14'),
        C('Risques majeurs identifiés et évalués ?', 'Q15'),
        C('Fréquence de mise à jour de la cartographie ?', 'Q16'),
        C('Personnel formé à la cartographie des risques ?', 'Q17'),
        C('Outil de collecte des incidents adéquat ?', 'Q18'),
        C('Pertinence des informations collectées par incident ?', 'Q19'),
        C('Fréquence de collecte des incidents ?', 'Q20'),
        C('Analyse des incidents majeurs (RCA) ?', 'Q21-22'),
        C('Incidents utilisés pour mettre à jour la cartographie ?', 'Q23'),
        C('Personnel formé à la collecte des incidents ?', 'Q24'),
        C('Délai de traitement et exhaustivité du reporting incidents ?', 'Q25-26'),
        C('Plan de continuité (PCA) existant ?', 'Q27'),
        C('Dispositif de secours (groupe électrogène, etc.) ?', 'Q28'),
        C('Rapports de test de continuité disponibles ?', 'Q29'),
        C('Procédures mode secours + cellule de crise ?', 'Q30-31'),
        C('Formation à la continuité (backup, remplacement) ?', 'Q32'),
        C("Police d'assurance disponible ?", 'Q33'),
        C('Situation financière et partenaires financiers ?', 'Q34-35'),
      ],
    },
    {
      titre: '4. Spécifique « Agents Banking »',
      questions: [
        C('KYC complet des Agents Banking (identification + bénéficiaires effectifs) ?', 'Règl. 2023/01 Art.20-21'),
        C('Diligences renforcées / surveillance des opérations ?', 'Règl. 2023/01 Art.45,61,63,107'),
        C('Contrat Agents Banking : plafonds, vol, contestation, restitution des fonds ?', 'Règl. 01-20 Art.10 & 19'),
        C("Autorisations préalables de l'autorité monétaire ?", 'R-2023/02'),
        C('Vérifications sanctions / centrale des risques / engagements ?', 'R-2023/02'),
        C("Procédure Agents Banking validée par le Conseil d'administration ?", 'R-2023/02'),
        C('Contrôles chez les Agents Banking (trimestriels) ?', 'R-2023/02'),
        C('Absence de rémunération sur crédits octroyés aux clients de l’agent ?', 'R-2023/02'),
        C('Rémunération des Agents Banking ≤ 3% ?', 'R-2023/02'),
        C("Constitution préalable d'un fonds de garantie ?", 'R-2023/02'),
        C('Cartes professionnelles délivrées (modèle validé par CA) ?', 'R-2023/02'),
        C('Opérations Agents Banking distinctes en comptabilité ?', 'R-2023/02'),
        C('Rapport annuel communiqué à la COBAC et suivi par la Banque ?', 'R-2023/02'),
      ],
    },
    {
      titre: '5. Synthèse du contrôle',
      questions: [
        { libelle: 'Appréciation globale du dispositif du prestataire', type: 'TEXTE_LONG', obligatoire: false },
        { libelle: 'Principaux risques résiduels identifiés', type: 'TEXTE_LONG', obligatoire: false },
        { libelle: 'Date cible de mise en œuvre des actions correctives', type: 'DATE', obligatoire: false },
      ],
    },
  ],
};

export const ALL_DEFS: QuestionnaireDef[] = [AML_DEF, EXT_DEF];
