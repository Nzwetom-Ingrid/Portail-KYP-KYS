// Données factices utilisées quand USE_DATAVERSE = false (dev local).
// Le shape mimique les enregistrements Dataverse pour que les composants
// n'aient pas à connaître la différence.

export const MOCK_TIERS = {
  afb_tiersid: 'mock-tiers-1',
  afb_nom: 'Sahel Logistics SARL',
  afb_type: 'KYP',
  afb_niveau_risque: 'Standard',
  afb_statut: 'EnCoursOnboarding',
  afb_horodatage_maj: '2026-05-20T10:00:00Z',
}

export const MOCK_DOSSIER = {
  afb_dossierid: 'mock-dossier-1',
  _afb_tiers_value: 'mock-tiers-1',
  afb_statut: 'EnCours',
  afb_taux_complet: 68,
  afb_date_soumission: null,
  afb_version: 1,
}

export const MOCK_DOCUMENT_CATEGORIES = [
  { id: 'cat-iden', label: 'Identification' },
  { id: 'cat-loca', label: 'Localisation' },
  { id: 'cat-just', label: 'Justificatifs' },
  { id: 'cat-comp', label: 'Compléments' },
  { id: 'cat-conv', label: 'Conventions' },
  { id: 'cat-audi', label: 'Audit' },
  { id: 'cat-assu', label: 'Assurance' },
  { id: 'cat-autr', label: 'Autres' },
]

export const MOCK_UBOS = [
  { afb_uboid: 'u1', afb_nomouraisonsociale: 'Jean-Pierre Mbarga',        afb_nationalite: 'Camerounaise', afb_datedenaissance: '1972-03-14', afb_pourcentagededetentiondirecte: 35, afb_typedentite: 1, afb_statutdevalidation: 0, afb_statutppe: 0, createdon: '2026-05-19T10:00:00Z' },
  { afb_uboid: 'u2', afb_nomouraisonsociale: 'Aïssatou Diallo',           afb_nationalite: 'Sénégalaise',  afb_datedenaissance: '1980-11-02', afb_pourcentagededetentiondirecte: 22, afb_typedentite: 1, afb_statutdevalidation: 1, afb_statutppe: 1, createdon: '2026-05-20T09:00:00Z' },
  { afb_uboid: 'u3', afb_nomouraisonsociale: 'Holdings International Ltd.', afb_nationalite: 'Jersey',       afb_datedenaissance: null,         afb_pourcentagededetentiondirecte: 43, afb_typedentite: 0, afb_statutdevalidation: 1, afb_statutppe: 0, createdon: '2026-05-21T08:00:00Z' },
]

// Évaluations validées vues par le tiers (shape = sortie de mapEvaluation).
export const MOCK_EVALUATIONS = [
  {
    id: 'ev1',
    reference: 'EVAL-2026-001',
    date: '2026-05-28T10:00:00Z',
    periodeDebut: '2026-01-01',
    periodeFin: '2026-03-31',
    note: 82,
    noteMax: 100,
    pourcentage: 82,
    risque: 'Modéré',
    tendance: 'Amélioration',
    avis: "Bonne qualité de service sur la période. Respect des SLA satisfaisant, quelques retards ponctuels de transmission documentaire à corriger. Coopération conforme aux attentes de la Direction.",
    plan: "Réduire les délais de réponse aux demandes de complément à moins de 5 jours ouvrés.",
    decision: 'Maintenir',
    dateValidation: '2026-05-30T09:00:00Z',
  },
  {
    id: 'ev2',
    reference: 'EVAL-2025-004',
    date: '2025-11-15T10:00:00Z',
    periodeDebut: '2025-07-01',
    periodeFin: '2025-09-30',
    note: 64,
    noteMax: 100,
    pourcentage: 64,
    risque: 'Élevé',
    tendance: 'Dégradation',
    avis: "Dégradation du niveau de service constatée. Plusieurs incidents non résolus dans les délais. Mise sous surveillance renforcée recommandée.",
    plan: "Plan de remédiation à fournir sous 30 jours. Point de suivi mensuel avec la Direction.",
    decision: 'Sous surveillance',
    dateValidation: '2025-11-20T09:00:00Z',
  },
]

export const MOCK_DOCUMENTS = [
  { afb_documentid: 'd1', afb_nomfichier: 'Registre de commerce (RCCM)',          afb_typedocument: 'PDF · 1,2 Mo', afb_categorie_label: 'Légal',     afb_statutvalidite: 'Valide',     createdon: '2026-05-20T10:00:00Z' },
  { afb_documentid: 'd2', afb_nomfichier: 'Statuts de la société',                afb_typedocument: 'PDF · 3,4 Mo', afb_categorie_label: 'Légal',     afb_statutvalidite: 'Valide',     createdon: '2026-05-20T11:00:00Z' },
  { afb_documentid: 'd3', afb_nomfichier: 'Attestation fiscale 2025',             afb_typedocument: 'PDF · 0,8 Mo', afb_categorie_label: 'Fiscal',    afb_statutvalidite: 'EnRevue',    createdon: '2026-05-21T09:00:00Z' },
  { afb_documentid: 'd4', afb_nomfichier: 'Pièce d’identité — représentant',     afb_typedocument: 'JPG · 2,1 Mo', afb_categorie_label: 'Identité',  afb_statutvalidite: 'Rejete',     createdon: '2026-05-18T14:00:00Z' },
  { afb_documentid: 'd5', afb_nomfichier: 'Relevé d’identité bancaire',           afb_typedocument: 'PDF · 0,3 Mo', afb_categorie_label: 'Bancaire',  afb_statutvalidite: 'EnRevue',    createdon: '2026-05-21T15:00:00Z' },
  { afb_documentid: 'd6', afb_nomfichier: 'Bilan comptable 2025',                 afb_typedocument: '—',            afb_categorie_label: 'Financier', afb_statutvalidite: 'Requis',     createdon: null },
  { afb_documentid: 'd7', afb_nomfichier: 'Organigramme du groupe',               afb_typedocument: '—',            afb_categorie_label: 'Structure', afb_statutvalidite: 'Requis',     createdon: null },
]

export const MOCK_QUESTIONNAIRES = [
  { afb_questionnaireid: 'q1', afb_code: 'KYP',   afb_intitule: 'Connaissance partenaire (KYP)',  afb_sous_titre: 'Identité & relation d’affaires',  afb_statut: 'EnCours',  afb_progression: 60,  afb_echeance: '2026-05-30', afb_nb_questions: 12 },
  { afb_questionnaireid: 'q2', afb_code: 'AML',   afb_intitule: 'Lutte anti-blanchiment (LAB/FT)', afb_sous_titre: 'Origine des fonds & conformité',  afb_statut: 'AFaire',   afb_progression: 0,   afb_echeance: '2026-06-05', afb_nb_questions: 10 },
  { afb_questionnaireid: 'q3', afb_code: 'RISK',  afb_intitule: 'Évaluation des risques',         afb_sous_titre: 'Exposition & pays d’activité',    afb_statut: 'AFaire',   afb_progression: 20,  afb_echeance: '2026-06-05', afb_nb_questions: 8  },
  { afb_questionnaireid: 'q4', afb_code: 'UBO',   afb_intitule: 'Bénéficiaires effectifs',         afb_sous_titre: 'Structure de détention',          afb_statut: 'Soumis',   afb_progression: 100, afb_echeance: '2026-05-15', afb_nb_questions: 6  },
  { afb_questionnaireid: 'q5', afb_code: 'COMP',  afb_intitule: 'Déclaration de conformité',       afb_sous_titre: 'Engagements réglementaires',      afb_statut: 'Valide',   afb_progression: 100, afb_echeance: '2026-05-02', afb_nb_questions: 5  },
]

export const MOCK_QUESTIONS = [
  { afb_questionid: 'qq1', afb_ordre: 1, afb_libelle: 'Votre entreprise exerce-t-elle dans un secteur réglementé ?',          afb_type: 'OUI_NON',     options: ['Oui', 'Non'] },
  { afb_questionid: 'qq2', afb_ordre: 2, afb_libelle: 'Quel est le chiffre d’affaires annuel estimé ?',                       afb_type: 'CHOIX_UNIQUE', options: ['< 100M', '100M – 1Md', '> 1Md FCFA'] },
  { afb_questionid: 'qq3', afb_ordre: 3, afb_libelle: 'Réalisez-vous des opérations à l’international ?',                     afb_type: 'CHOIX_UNIQUE', options: ['Oui, régulièrement', 'Occasionnellement', 'Non'] },
  { afb_questionid: 'qq4', afb_ordre: 4, afb_libelle: 'Disposez-vous d’une politique de conformité interne ?',                afb_type: 'CHOIX_UNIQUE', options: ['Oui', 'En cours', 'Non'] },
]
