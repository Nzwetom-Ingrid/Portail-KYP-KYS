/**
 * Données fictives pour le S0 — remplacées au S1 par des hooks Dataverse.
 * Toutes les valeurs sont crédibles et alignées sur le contexte AFB.
 */

export type Risque = 'Low' | 'Medium' | 'High';
export type DossierStatut = 'Brouillon' | 'En revue' | 'Validé' | 'Expiré' | 'Rejeté';
export type PartnerKind = 'Partenaire' | 'Fournisseur' | 'Cible';
export type Direction = 'DCONF' | 'DMG' | 'TRESO' | 'COMEX';

export interface Dossier {
  id: string;
  entite: string;
  type: PartnerKind;
  risque: Risque;
  statut: DossierStatut;
  sla: string;
  direction: Direction;
  dateCreation: string;
  pays?: string;
  charge?: string;
  /** Commentaire / réponse DCONF consigné sur le dossier (afb_commentairedconf). */
  commentaire?: string;
  /** E-mail de contact principal enregistré sur le tiers (afb_emailcontactprincipal). */
  email?: string;
  /** GUID du tiers lié (afb_nomdutiers) — pour charger ses documents & onboarding. */
  tiersId?: string;
  /** Fiche d'onboarding déclarée par le partenaire (issue du tiers lié). */
  onboarding?: {
    formeJuridique?: string;
    rccm?: string;
    ville?: string;
    adresse?: string;
    telephone?: string;
    swift?: string;
    secteur?: string;
  };
  /** Liste JSON des pièces requises personnalisée (tiers.afb_documentsrequis). */
  requiredDocsJson?: string;
}

// ============================================================================
// Dashboard
// ============================================================================
export const mockKPIs = {
  dossiersEnCours: { value: 270, evolution: '+12%', period: 'ce mois' },
  documentsExpires: { value: 23, evolution: 'SLA J-7', period: 'à relancer' },
  alertesScreening: { value: 8, evolution: 'PPE / Sanctions', period: 'à revoir' },
  validesCeMois: { value: 142, evolution: '+9.4%', period: 'vs mois N-1' },
};

export const mockProgression = [
  { mois: 'Oct', recus: 145, traites: 132 },
  { mois: 'Nov', recus: 168, traites: 154 },
  { mois: 'Déc', recus: 152, traites: 148 },
  { mois: 'Jan', recus: 189, traites: 175 },
  { mois: 'Fév', recus: 203, traites: 195 },
  { mois: 'Mar', recus: 218, traites: 208 },
  { mois: 'Avr', recus: 245, traites: 232 },
  { mois: 'Mai', recus: 270, traites: 142 },
];

export const mockRiskDistribution = {
  low: { count: 184, percentage: 68 },
  medium: { count: 67, percentage: 25 },
  high: { count: 19, percentage: 7 },
};

export const mockDossiersRecents: Dossier[] = [
  { id: 'D-2026-0270', entite: 'SOCAPALM SA', type: 'Fournisseur', risque: 'Low', statut: 'Validé', sla: '—', direction: 'DMG', dateCreation: '2026-05-10', pays: 'Cameroun', charge: 'J. Mbarga' },
  { id: 'D-2026-0269', entite: 'Global Trade Cameroun', type: 'Partenaire', risque: 'Medium', statut: 'En revue', sla: 'J-3', direction: 'DCONF', dateCreation: '2026-05-09', pays: 'Cameroun', charge: 'A. Nguele' },
  { id: 'D-2026-0268', entite: 'PetroAfrica Holdings', type: 'Partenaire', risque: 'High', statut: 'En revue', sla: 'J-1', direction: 'DCONF', dateCreation: '2026-05-08', pays: 'Gabon', charge: 'J. Mbarga' },
  { id: 'D-2026-0267', entite: 'Logistics Cameroon Ltd', type: 'Fournisseur', risque: 'Low', statut: 'Brouillon', sla: '—', direction: 'DMG', dateCreation: '2026-05-08', pays: 'Cameroun', charge: 'A. Nguele' },
  { id: 'D-2026-0266', entite: 'Sahel Imports SARL', type: 'Fournisseur', risque: 'Medium', statut: 'Expiré', sla: 'Dépassé', direction: 'DMG', dateCreation: '2026-04-20', pays: 'Tchad', charge: 'J. Mbarga' },
  { id: 'D-2026-0265', entite: 'Atlantic Bank CI', type: 'Partenaire', risque: 'Medium', statut: 'Validé', sla: '—', direction: 'TRESO', dateCreation: '2026-05-06', pays: 'Côte d’Ivoire', charge: 'C. Eyenga' },
  { id: 'D-2026-0264', entite: 'CFAO Motors Cameroun', type: 'Fournisseur', risque: 'Low', statut: 'Validé', sla: '—', direction: 'COMEX', dateCreation: '2026-05-05', pays: 'Cameroun', charge: 'A. Nguele' },
];

export const mockSLAAlerts = {
  windowDays: 7,
  expiringCount: 23,
  overdueCount: 3,
  message: '3 dossiers dépassent le SLA réglementaire — relance automatique programmée.',
};

export const mockSLAWeek = [
  { jour: 'Lun', count: 4 },
  { jour: 'Mar', count: 6 },
  { jour: 'Mer', count: 3 },
  { jour: 'Jeu', count: 8 },
  { jour: 'Ven', count: 12 },
  { jour: 'Sam', count: 2 },
  { jour: 'Dim', count: 0 },
];

// ============================================================================
// Partenaires
// ============================================================================
export interface Partenaire {
  id: string;
  raisonSociale: string;
  code: string;
  type: PartnerKind;
  typeJuridique: string;
  pays: string;
  risque: Risque;
  statut: 'Actif' | 'Inactif';
  direction: Direction;
  dateCreation: string;
  dernierUpdate: string;
}

export const mockPartenaires: Partenaire[] = [
  { id: 'P-1001', raisonSociale: 'SOCAPALM SA', code: 'SOCAPALM', type: 'Fournisseur', typeJuridique: 'SA', pays: 'Cameroun', risque: 'Low', statut: 'Actif', direction: 'DMG', dateCreation: '2023-01-12', dernierUpdate: '2026-05-10' },
  { id: 'P-1002', raisonSociale: 'Global Trade Cameroun', code: 'GTC-CMR', type: 'Partenaire', typeJuridique: 'SARL', pays: 'Cameroun', risque: 'Medium', statut: 'Actif', direction: 'DCONF', dateCreation: '2024-03-22', dernierUpdate: '2026-05-09' },
  { id: 'P-1003', raisonSociale: 'PetroAfrica Holdings', code: 'PETRO-AF', type: 'Partenaire', typeJuridique: 'SA', pays: 'Gabon', risque: 'High', statut: 'Actif', direction: 'DCONF', dateCreation: '2022-11-04', dernierUpdate: '2026-05-08' },
  { id: 'P-1004', raisonSociale: 'Logistics Cameroon Ltd', code: 'LOGI-CMR', type: 'Fournisseur', typeJuridique: 'SARL', pays: 'Cameroun', risque: 'Low', statut: 'Actif', direction: 'DMG', dateCreation: '2024-09-30', dernierUpdate: '2026-05-08' },
  { id: 'P-1005', raisonSociale: 'Sahel Imports SARL', code: 'SAHEL-IM', type: 'Fournisseur', typeJuridique: 'SARL', pays: 'Tchad', risque: 'Medium', statut: 'Inactif', direction: 'DMG', dateCreation: '2021-06-18', dernierUpdate: '2026-04-20' },
  { id: 'P-1006', raisonSociale: 'Atlantic Bank CI', code: 'ATLANT-CI', type: 'Partenaire', typeJuridique: 'BANK_CORR', pays: 'Côte d’Ivoire', risque: 'Medium', statut: 'Actif', direction: 'TRESO', dateCreation: '2020-02-14', dernierUpdate: '2026-05-06' },
  { id: 'P-1007', raisonSociale: 'CFAO Motors Cameroun', code: 'CFAO-CMR', type: 'Fournisseur', typeJuridique: 'SA', pays: 'Cameroun', risque: 'Low', statut: 'Actif', direction: 'COMEX', dateCreation: '2019-07-01', dernierUpdate: '2026-05-05' },
  { id: 'P-1008', raisonSociale: 'Ecobank Transnational', code: 'ECOBK-TG', type: 'Partenaire', typeJuridique: 'BANK_CORR', pays: 'Togo', risque: 'Low', statut: 'Actif', direction: 'TRESO', dateCreation: '2018-10-21', dernierUpdate: '2026-04-28' },
  { id: 'P-1009', raisonSociale: 'Yara Tropicale Cameroun', code: 'YARA-CMR', type: 'Cible', typeJuridique: 'SARL', pays: 'Cameroun', risque: 'Medium', statut: 'Actif', direction: 'COMEX', dateCreation: '2025-12-03', dernierUpdate: '2026-05-12' },
  { id: 'P-1010', raisonSociale: 'Cameroon Tea Estates', code: 'CTE-CMR', type: 'Fournisseur', typeJuridique: 'SA', pays: 'Cameroun', risque: 'Low', statut: 'Actif', direction: 'DMG', dateCreation: '2022-04-15', dernierUpdate: '2026-04-30' },
  { id: 'P-1011', raisonSociale: 'Express Money Africa', code: 'EME-AFR', type: 'Partenaire', typeJuridique: 'EMF', pays: 'Sénégal', risque: 'High', statut: 'Actif', direction: 'DCONF', dateCreation: '2023-08-09', dernierUpdate: '2026-05-11' },
  { id: 'P-1012', raisonSociale: 'Coopérative Café Bamoun', code: 'COOP-CB', type: 'Fournisseur', typeJuridique: 'COOP', pays: 'Cameroun', risque: 'Low', statut: 'Actif', direction: 'DMG', dateCreation: '2024-01-19', dernierUpdate: '2026-04-22' },
];

// ============================================================================
// Documents & expirations
// ============================================================================
export interface DocExpiration {
  id: string;
  partenaire: string;
  typeDoc: string;
  reference: string;
  emisLe: string;
  expireLe: string;
  joursRestants: number;
  statut: 'Valide' | 'À renouveler' | 'Expiré';
  charge: string;
}

export const mockExpirations: DocExpiration[] = [
  { id: 'DOC-2026-091', partenaire: 'Sahel Imports SARL', typeDoc: 'RCCM', reference: 'TC/N°RC/2021', emisLe: '2021-06-18', expireLe: '2026-05-10', joursRestants: -7, statut: 'Expiré', charge: 'J. Mbarga' },
  { id: 'DOC-2026-092', partenaire: 'PetroAfrica Holdings', typeDoc: 'Attestation fiscale', reference: 'AT-FISC/24-0991', emisLe: '2024-05-20', expireLe: '2026-05-18', joursRestants: 1, statut: 'À renouveler', charge: 'A. Nguele' },
  { id: 'DOC-2026-093', partenaire: 'Global Trade Cameroun', typeDoc: 'CNI dirigeant', reference: 'CNI-CMR/118209332', emisLe: '2018-11-12', expireLe: '2026-05-20', joursRestants: 3, statut: 'À renouveler', charge: 'A. Nguele' },
  { id: 'DOC-2026-094', partenaire: 'Express Money Africa', typeDoc: 'Agrément BEAC', reference: 'BEAC/EME-2023-04', emisLe: '2023-04-01', expireLe: '2026-05-24', joursRestants: 7, statut: 'À renouveler', charge: 'C. Eyenga' },
  { id: 'DOC-2026-095', partenaire: 'Yara Tropicale Cameroun', typeDoc: 'Statuts à jour', reference: 'NOT-DLA/25-0118', emisLe: '2025-12-03', expireLe: '2026-06-03', joursRestants: 17, statut: 'À renouveler', charge: 'C. Eyenga' },
  { id: 'DOC-2026-096', partenaire: 'SOCAPALM SA', typeDoc: 'KBIS / Registre', reference: 'RC/CMR/SOCA-21', emisLe: '2023-01-12', expireLe: '2026-07-02', joursRestants: 46, statut: 'Valide', charge: 'J. Mbarga' },
  { id: 'DOC-2026-097', partenaire: 'Atlantic Bank CI', typeDoc: 'Wolfsberg', reference: 'WB-2024-ATL', emisLe: '2024-09-12', expireLe: '2026-09-12', joursRestants: 118, statut: 'Valide', charge: 'C. Eyenga' },
  { id: 'DOC-2026-098', partenaire: 'CFAO Motors Cameroun', typeDoc: 'Attestation TVA', reference: 'TVA-CMR/26-220', emisLe: '2026-01-15', expireLe: '2027-01-15', joursRestants: 243, statut: 'Valide', charge: 'A. Nguele' },
];

// ============================================================================
// UBO — Bénéficiaires effectifs
// ============================================================================
export interface UBO {
  id: string;
  nom: string;
  nationalite: string;
  partenaire: string;
  partPct: number;
  natureControle: 'Direct' | 'Indirect' | 'Effectif';
  ppe: boolean;
  dateNaissance: string;
  validation: 'Validé' | 'En attente' | 'À revoir';
  // Détails réels (fiche / drawer)
  typeEntite?: string;
  moral?: boolean;
  paysResidence?: string;
  partIndirecte?: number;
  screening?: string;
  validePar?: string;
  dateValidation?: string;
}

export const mockUBOs: UBO[] = [
  { id: 'UBO-001', nom: 'Pierre Etoundi', nationalite: 'Camerounaise', partenaire: 'Global Trade Cameroun', partPct: 42.5, natureControle: 'Direct', ppe: false, dateNaissance: '1968-04-12', validation: 'Validé' },
  { id: 'UBO-002', nom: 'Marie-Claire Ndong', nationalite: 'Gabonaise', partenaire: 'PetroAfrica Holdings', partPct: 28.0, natureControle: 'Indirect', ppe: true, dateNaissance: '1972-11-30', validation: 'À revoir' },
  { id: 'UBO-003', nom: 'Jean-Baptiste Kamga', nationalite: 'Camerounaise', partenaire: 'PetroAfrica Holdings', partPct: 31.5, natureControle: 'Direct', ppe: false, dateNaissance: '1965-09-04', validation: 'En attente' },
  { id: 'UBO-004', nom: 'Sara Mbarga', nationalite: 'Camerounaise', partenaire: 'SOCAPALM SA', partPct: 51.0, natureControle: 'Effectif', ppe: false, dateNaissance: '1979-02-22', validation: 'Validé' },
  { id: 'UBO-005', nom: 'Adama Diop', nationalite: 'Sénégalaise', partenaire: 'Express Money Africa', partPct: 33.3, natureControle: 'Direct', ppe: false, dateNaissance: '1980-06-15', validation: 'En attente' },
  { id: 'UBO-006', nom: 'François Bekolo', nationalite: 'Camerounaise', partenaire: 'Yara Tropicale Cameroun', partPct: 25.0, natureControle: 'Direct', ppe: false, dateNaissance: '1974-08-09', validation: 'Validé' },
];

// ============================================================================
// Screening PPE / Sanctions
// ============================================================================
export interface ScreeningAlert {
  id: string;
  recordId?: string; // GUID afb_resultatscreeningid — pour les mutations (décisions)
  cible: string;
  typeCible: 'Personne physique' | 'Personne morale';
  source: 'ONU' | 'OFAC' | 'UE' | 'PPE' | 'Interpol';
  match: 'Exact' | 'Fort' | 'Faible';
  score: number;
  detecteLe: string;
  statut: 'Nouveau' | 'En revue' | 'Faux positif' | 'Confirmé';
  charge: string;
}

export const mockScreeningAlerts: ScreeningAlert[] = [
  { id: 'SCR-2026-118', cible: 'Marie-Claire Ndong', typeCible: 'Personne physique', source: 'PPE', match: 'Fort', score: 91, detecteLe: '2026-05-12', statut: 'En revue', charge: 'J. Mbarga' },
  { id: 'SCR-2026-117', cible: 'PetroAfrica Holdings', typeCible: 'Personne morale', source: 'OFAC', match: 'Faible', score: 62, detecteLe: '2026-05-11', statut: 'Nouveau', charge: 'C. Eyenga' },
  { id: 'SCR-2026-116', cible: 'Sahel Imports SARL', typeCible: 'Personne morale', source: 'UE', match: 'Faible', score: 58, detecteLe: '2026-05-10', statut: 'Faux positif', charge: 'A. Nguele' },
  { id: 'SCR-2026-115', cible: 'Adama Diop', typeCible: 'Personne physique', source: 'PPE', match: 'Exact', score: 100, detecteLe: '2026-05-09', statut: 'Confirmé', charge: 'J. Mbarga' },
  { id: 'SCR-2026-114', cible: 'Express Money Africa', typeCible: 'Personne morale', source: 'ONU', match: 'Faible', score: 47, detecteLe: '2026-05-08', statut: 'Faux positif', charge: 'C. Eyenga' },
  { id: 'SCR-2026-113', cible: 'Pierre Etoundi', typeCible: 'Personne physique', source: 'Interpol', match: 'Faible', score: 41, detecteLe: '2026-05-07', statut: 'En revue', charge: 'A. Nguele' },
  { id: 'SCR-2026-112', cible: 'Global Trade Cameroun', typeCible: 'Personne morale', source: 'UE', match: 'Fort', score: 78, detecteLe: '2026-05-06', statut: 'En revue', charge: 'J. Mbarga' },
];

export const mockScreeningSources = [
  { source: 'ONU', count: 1, color: '#1A1A1A' },
  { source: 'OFAC', count: 1, color: '#c8102e' },
  { source: 'UE', count: 2, color: '#767676' },
  { source: 'PPE', count: 2, color: '#a30f24' },
  { source: 'Interpol', count: 1, color: '#C8C8C8' },
];

// ============================================================================
// Évaluations prestataires
// ============================================================================
export interface Evaluation {
  id: string;
  partenaire: string;
  typeEval: 'SLA' | 'OPS' | 'RISK' | 'EXT';
  score: number;
  scoreMax: number;
  statut: 'Conforme' | 'À améliorer' | 'Non conforme';
  evaluateur: string;
  date: string;
  recordId?: string;   // GUID afb_evaluationpartenaireid — pour les mutations
  tiersId?: string;    // GUID du tiers évalué — pour la décision de partenariat
  statutEval?: string; // libellé du statut (Brouillon / En revue / Validée / Rejetée)
  decision?: string;   // libellé décision partenariat (Maintenir / Sous surveillance / Annuler)
  publie?: boolean;    // publiée au tiers (push) — afb_datedevalidation renseignée
}

export const mockEvaluations: Evaluation[] = [
  { id: 'EV-2026-022', partenaire: 'SOCAPALM SA', typeEval: 'SLA', score: 92, scoreMax: 100, statut: 'Conforme', evaluateur: 'J. Mbarga', date: '2026-05-08' },
  { id: 'EV-2026-021', partenaire: 'CFAO Motors Cameroun', typeEval: 'OPS', score: 88, scoreMax: 100, statut: 'Conforme', evaluateur: 'A. Nguele', date: '2026-05-06' },
  { id: 'EV-2026-020', partenaire: 'Atlantic Bank CI', typeEval: 'RISK', score: 74, scoreMax: 100, statut: 'À améliorer', evaluateur: 'C. Eyenga', date: '2026-05-04' },
  { id: 'EV-2026-019', partenaire: 'Logistics Cameroon Ltd', typeEval: 'SLA', score: 81, scoreMax: 100, statut: 'Conforme', evaluateur: 'A. Nguele', date: '2026-05-02' },
  { id: 'EV-2026-018', partenaire: 'Sahel Imports SARL', typeEval: 'EXT', score: 48, scoreMax: 100, statut: 'Non conforme', evaluateur: 'J. Mbarga', date: '2026-04-28' },
  { id: 'EV-2026-017', partenaire: 'Express Money Africa', typeEval: 'RISK', score: 69, scoreMax: 100, statut: 'À améliorer', evaluateur: 'C. Eyenga', date: '2026-04-25' },
  { id: 'EV-2026-016', partenaire: 'Yara Tropicale Cameroun', typeEval: 'OPS', score: 85, scoreMax: 100, statut: 'Conforme', evaluateur: 'A. Nguele', date: '2026-04-22' },
];

export const mockEvaluationsKPIs = {
  total: { value: 87, label: 'Évaluations 2026' },
  conformes: { value: 64, label: 'Conformes', pct: 73 },
  ameliorer: { value: 18, label: 'À améliorer', pct: 21 },
  nonConformes: { value: 5, label: 'Non conformes', pct: 6 },
};

// ============================================================================
// Questionnaires
// ============================================================================
export interface Questionnaire {
  id: string;
  nom: string;
  famille: 'AML' | 'KYC' | 'EXT' | 'RISK';
  version: string;
  nbQuestions: number;
  affectations: number;
  statut: 'Publié' | 'Brouillon' | 'Archivé';
  dernierMaj: string;
}

export const mockQuestionnaires: Questionnaire[] = [
  { id: 'QST-001', nom: 'KYC Personne morale standard', famille: 'KYC', version: '3.2', nbQuestions: 32, affectations: 124, statut: 'Publié', dernierMaj: '2026-04-15' },
  { id: 'QST-002', nom: 'Wolfsberg AML — Banques correspondantes', famille: 'AML', version: '2.0', nbQuestions: 48, affectations: 22, statut: 'Publié', dernierMaj: '2026-03-30' },
  { id: 'QST-003', nom: 'Évaluation SLA prestataires IT', famille: 'EXT', version: '1.4', nbQuestions: 18, affectations: 42, statut: 'Publié', dernierMaj: '2026-04-22' },
  { id: 'QST-004', nom: 'Risk Assessment Agent Banking', famille: 'RISK', version: '2.1', nbQuestions: 26, affectations: 9, statut: 'Publié', dernierMaj: '2026-05-02' },
  { id: 'QST-005', nom: 'KYC Personne physique nationale', famille: 'KYC', version: '4.0', nbQuestions: 22, affectations: 312, statut: 'Publié', dernierMaj: '2026-05-10' },
  { id: 'QST-006', nom: 'Due diligence renforcée — PPE', famille: 'AML', version: '1.3', nbQuestions: 35, affectations: 6, statut: 'Brouillon', dernierMaj: '2026-05-12' },
  { id: 'QST-007', nom: 'Évaluation fournisseurs logistiques (legacy)', famille: 'EXT', version: '0.9', nbQuestions: 14, affectations: 0, statut: 'Archivé', dernierMaj: '2025-11-08' },
];

// ============================================================================
// Reports / Exports PDF
// ============================================================================
export interface Report {
  id: string;
  nom: string;
  type: 'Dossier complet' | 'Synthèse mensuelle' | 'Audit régulateur' | 'État UBO';
  perimetre: string;
  generePar: string;
  date: string;
  taille: string;
  statut: 'Disponible' | 'En cours' | 'Échec';
}

export const mockReports: Report[] = [
  { id: 'RPT-2026-118', nom: 'Synthèse COBAC — Mai 2026', type: 'Synthèse mensuelle', perimetre: 'Tous dossiers', generePar: 'J. Mbarga', date: '2026-05-15', taille: '2.4 MB', statut: 'Disponible' },
  { id: 'RPT-2026-117', nom: 'Dossier PetroAfrica Holdings', type: 'Dossier complet', perimetre: 'D-2026-0268', generePar: 'J. Mbarga', date: '2026-05-14', taille: '8.1 MB', statut: 'Disponible' },
  { id: 'RPT-2026-116', nom: 'État UBO Q2 2026', type: 'État UBO', perimetre: '286 entités', generePar: 'C. Eyenga', date: '2026-05-13', taille: '4.2 MB', statut: 'Disponible' },
  { id: 'RPT-2026-115', nom: 'Audit interne — Conformité KYP', type: 'Audit régulateur', perimetre: 'Période 2025-2026', generePar: 'Système', date: '2026-05-12', taille: '12.6 MB', statut: 'Disponible' },
  { id: 'RPT-2026-114', nom: 'Dossier Global Trade Cameroun', type: 'Dossier complet', perimetre: 'D-2026-0269', generePar: 'A. Nguele', date: '2026-05-11', taille: '—', statut: 'En cours' },
  { id: 'RPT-2026-113', nom: 'Synthèse COBAC — Avril 2026', type: 'Synthèse mensuelle', perimetre: 'Tous dossiers', generePar: 'J. Mbarga', date: '2026-04-30', taille: '2.2 MB', statut: 'Disponible' },
  { id: 'RPT-2026-112', nom: 'Dossier Sahel Imports SARL', type: 'Dossier complet', perimetre: 'D-2026-0266', generePar: 'J. Mbarga', date: '2026-04-22', taille: '—', statut: 'Échec' },
];

export const mockReportTemplates = [
  { id: 'TPL-A', nom: 'Dossier complet partenaire', description: 'Identité, UBO, screening, questionnaires, décisions, documents.', icon: 'document' },
  { id: 'TPL-B', nom: 'Synthèse mensuelle COBAC', description: 'KPI conformité, alertes SLA, écarts règlement R-2023/01.', icon: 'chart' },
  { id: 'TPL-C', nom: 'État UBO global', description: 'Cartographie des bénéficiaires effectifs et seuils franchis.', icon: 'people' },
  { id: 'TPL-D', nom: 'Audit régulateur', description: 'Traces de décisions, validations, exceptions documentées.', icon: 'shield' },
];

// ============================================================================
// Validations DCONF — file de validation hiérarchique
// ============================================================================
export interface ValidationDecision {
  id: string;
  dossier: string;
  entite: string;
  type: PartnerKind;
  niveau: 'Standard' | 'Élevé' | 'Critique';
  risque: Risque;
  scoreComposite: number;
  soumisLe: string;
  soumisPar: string;
  sla: string;
  statut: 'En attente' | 'En cours' | 'Validé' | 'Rejeté';
  commentaire?: string;
}

export const mockValidations: ValidationDecision[] = [
  { id: 'VAL-2026-058', dossier: 'D-2026-0268', entite: 'PetroAfrica Holdings', type: 'Partenaire', niveau: 'Critique', risque: 'High', scoreComposite: 78, soumisLe: '2026-05-14', soumisPar: 'A. Nguele', sla: 'J-1', statut: 'En attente' },
  { id: 'VAL-2026-057', dossier: 'D-2026-0269', entite: 'Global Trade Cameroun', type: 'Partenaire', niveau: 'Élevé', risque: 'Medium', scoreComposite: 62, soumisLe: '2026-05-13', soumisPar: 'A. Nguele', sla: 'J-3', statut: 'En cours', commentaire: 'Vérifier statuts à jour' },
  { id: 'VAL-2026-056', dossier: 'D-2026-0266', entite: 'Sahel Imports SARL', type: 'Fournisseur', niveau: 'Élevé', risque: 'Medium', scoreComposite: 71, soumisLe: '2026-05-10', soumisPar: 'J. Mbarga', sla: 'Dépassé', statut: 'En attente' },
  { id: 'VAL-2026-055', dossier: 'D-2026-0270', entite: 'SOCAPALM SA', type: 'Fournisseur', niveau: 'Standard', risque: 'Low', scoreComposite: 22, soumisLe: '2026-05-09', soumisPar: 'J. Mbarga', sla: 'J-5', statut: 'Validé' },
  { id: 'VAL-2026-054', dossier: 'D-2026-0265', entite: 'Atlantic Bank CI', type: 'Partenaire', niveau: 'Élevé', risque: 'Medium', scoreComposite: 54, soumisLe: '2026-05-07', soumisPar: 'C. Eyenga', sla: 'J-4', statut: 'Validé' },
  { id: 'VAL-2026-053', dossier: 'D-2026-0264', entite: 'CFAO Motors Cameroun', type: 'Fournisseur', niveau: 'Standard', risque: 'Low', scoreComposite: 18, soumisLe: '2026-05-06', soumisPar: 'A. Nguele', sla: 'J-2', statut: 'Validé' },
  { id: 'VAL-2026-052', dossier: 'D-2026-0263', entite: 'Express Money Africa', type: 'Partenaire', niveau: 'Critique', risque: 'High', scoreComposite: 85, soumisLe: '2026-05-05', soumisPar: 'C. Eyenga', sla: 'J-1', statut: 'Rejeté', commentaire: 'Documents BEAC incomplets' },
];

// ============================================================================
// Utilisateurs
// ============================================================================
export interface Utilisateur {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: 'Super Admin' | 'Admin Direction' | 'Chargé conformité' | 'Chargé de relation' | 'Visiteur';
  direction: Direction;
  statut: 'Actif' | 'Inactif' | 'Suspendu';
  derniereConnexion: string;
  dossiersTraites: number;
  creeLe: string;
}

export const mockUtilisateurs: Utilisateur[] = [
  { id: 'USR-001', nom: 'Mbarga', prenom: 'Jean-Marie', email: 'jm.mbarga@afriland.cm', role: 'Chargé conformité', direction: 'DCONF', statut: 'Actif', derniereConnexion: '2026-05-17 09:42', dossiersTraites: 142, creeLe: '2023-04-12' },
  { id: 'USR-002', nom: 'Nguele', prenom: 'Anastasie', email: 'a.nguele@afriland.cm', role: 'Chargé conformité', direction: 'DCONF', statut: 'Actif', derniereConnexion: '2026-05-17 08:15', dossiersTraites: 98, creeLe: '2023-06-20' },
  { id: 'USR-003', nom: 'Eyenga', prenom: 'Christelle', email: 'c.eyenga@afriland.cm', role: 'Chargé de relation', direction: 'DCONF', statut: 'Actif', derniereConnexion: '2026-05-16 17:22', dossiersTraites: 56, creeLe: '2024-01-08' },
  { id: 'USR-004', nom: 'Bilong', prenom: 'Paul', email: 'p.bilong@afriland.cm', role: 'Admin Direction', direction: 'DMG', statut: 'Actif', derniereConnexion: '2026-05-17 10:01', dossiersTraites: 0, creeLe: '2022-11-15' },
  { id: 'USR-005', nom: 'Atangana', prenom: 'Sylvie', email: 's.atangana@afriland.cm', role: 'Super Admin', direction: 'DCONF', statut: 'Actif', derniereConnexion: '2026-05-17 07:58', dossiersTraites: 0, creeLe: '2021-09-01' },
  { id: 'USR-006', nom: 'Ngono', prenom: 'Roger', email: 'r.ngono@afriland.cm', role: 'Visiteur', direction: 'COMEX', statut: 'Actif', derniereConnexion: '2026-05-15 14:33', dossiersTraites: 0, creeLe: '2024-09-22' },
  { id: 'USR-007', nom: 'Kemajou', prenom: 'Marc', email: 'm.kemajou@afriland.cm', role: 'Chargé conformité', direction: 'TRESO', statut: 'Inactif', derniereConnexion: '2026-03-12 11:04', dossiersTraites: 31, creeLe: '2023-10-30' },
  { id: 'USR-008', nom: 'Owono', prenom: 'Bertrand', email: 'b.owono@afriland.cm', role: 'Admin Direction', direction: 'TRESO', statut: 'Actif', derniereConnexion: '2026-05-17 09:11', dossiersTraites: 0, creeLe: '2022-02-18' },
  { id: 'USR-009', nom: 'Foning', prenom: 'Béatrice', email: 'b.foning@afriland.cm', role: 'Chargé de relation', direction: 'DCONF', statut: 'Suspendu', derniereConnexion: '2026-04-22 16:45', dossiersTraites: 12, creeLe: '2025-02-03' },
];

// ============================================================================
// Logs d'audit
// ============================================================================
export interface AuditLog {
  id: string;
  horodatage: string;
  utilisateur: string;
  action: string;
  categorie: 'Validation' | 'Connexion' | 'Modification' | 'Export' | 'Administration' | 'Screening';
  cible: string;
  resultat: 'Succès' | 'Échec' | 'Avertissement';
  ip: string;
}

export const mockAuditLogs: AuditLog[] = [
  { id: 'LOG-298411', horodatage: '2026-05-17 10:42:18', utilisateur: 'J. Mbarga', action: 'Validation dossier', categorie: 'Validation', cible: 'D-2026-0268 · PetroAfrica Holdings', resultat: 'Succès', ip: '10.42.18.91' },
  { id: 'LOG-298410', horodatage: '2026-05-17 10:35:02', utilisateur: 'C. Eyenga', action: 'Export rapport PDF', categorie: 'Export', cible: 'RPT-2026-116 · État UBO Q2', resultat: 'Succès', ip: '10.42.18.74' },
  { id: 'LOG-298409', horodatage: '2026-05-17 10:14:55', utilisateur: 'A. Nguele', action: 'Mise à jour partenaire', categorie: 'Modification', cible: 'P-1002 · Global Trade Cameroun', resultat: 'Succès', ip: '10.42.18.62' },
  { id: 'LOG-298408', horodatage: '2026-05-17 09:58:11', utilisateur: 'Système', action: 'Relance screening automatique', categorie: 'Screening', cible: '286 partenaires actifs', resultat: 'Succès', ip: '—' },
  { id: 'LOG-298407', horodatage: '2026-05-17 09:42:33', utilisateur: 'J. Mbarga', action: 'Connexion réussie', categorie: 'Connexion', cible: 'Portail KYP/KYS', resultat: 'Succès', ip: '10.42.18.91' },
  { id: 'LOG-298406', horodatage: '2026-05-17 09:11:08', utilisateur: 'P. Bilong', action: 'Création utilisateur', categorie: 'Administration', cible: 'USR-009 · B. Foning', resultat: 'Succès', ip: '10.42.18.18' },
  { id: 'LOG-298405', horodatage: '2026-05-17 08:33:47', utilisateur: 'B. Foning', action: 'Tentative connexion', categorie: 'Connexion', cible: 'Portail KYP/KYS', resultat: 'Échec', ip: '197.149.21.4' },
  { id: 'LOG-298404', horodatage: '2026-05-17 08:15:29', utilisateur: 'A. Nguele', action: 'Rejet dossier', categorie: 'Validation', cible: 'D-2026-0263 · Express Money', resultat: 'Avertissement', ip: '10.42.18.62' },
  { id: 'LOG-298403', horodatage: '2026-05-16 17:48:12', utilisateur: 'S. Atangana', action: 'Modification rôle', categorie: 'Administration', cible: 'USR-007 · M. Kemajou', resultat: 'Succès', ip: '10.42.18.5' },
  { id: 'LOG-298402', horodatage: '2026-05-16 17:22:51', utilisateur: 'C. Eyenga', action: 'Consultation dossier', categorie: 'Modification', cible: 'D-2026-0269', resultat: 'Succès', ip: '10.42.18.74' },
  { id: 'LOG-298401', horodatage: '2026-05-16 16:05:38', utilisateur: 'J. Mbarga', action: 'Export liste partenaires', categorie: 'Export', cible: '286 entités · CSV', resultat: 'Succès', ip: '10.42.18.91' },
  { id: 'LOG-298400', horodatage: '2026-05-16 15:32:14', utilisateur: 'Système', action: 'Synthèse COBAC mensuelle', categorie: 'Export', cible: 'RPT-2026-118', resultat: 'Succès', ip: '—' },
];

export const mockAuditCounts = {
  total24h: 142,
  succes24h: 134,
  echecs24h: 5,
  avertissements24h: 3,
};

// ============================================================================
// Configuration
// ============================================================================
export interface ConfigItem {
  key: string;
  label: string;
  value: string;
  description: string;
  type: 'text' | 'number' | 'switch' | 'select';
}

export const mockConfigSLA: ConfigItem[] = [
  { key: 'sla_relance_j60', label: 'Relance J-60', value: '60 jours', description: 'Première notification avant expiration des documents.', type: 'number' },
  { key: 'sla_relance_j30', label: 'Relance J-30', value: '30 jours', description: 'Seconde notification — alerte hiérarchique.', type: 'number' },
  { key: 'sla_relance_j7', label: 'Relance J-7', value: '7 jours', description: 'Notification critique — escalade DCONF.', type: 'number' },
  { key: 'sla_validation_critique', label: 'Délai validation Critique', value: '24 heures', description: 'Délai maximal pour validation hiérarchique des dossiers Critiques.', type: 'number' },
];

export const mockConfigScreening: ConfigItem[] = [
  { key: 'screening_onu', label: 'Source ONU', value: 'Activé', description: 'Interrogation quotidienne de la liste consolidée ONU.', type: 'switch' },
  { key: 'screening_ofac', label: 'Source OFAC', value: 'Activé', description: 'Interrogation quotidienne SDN List (US Treasury).', type: 'switch' },
  { key: 'screening_ue', label: 'Source UE', value: 'Activé', description: 'Interrogation quotidienne de la liste consolidée de l’Union européenne.', type: 'switch' },
  { key: 'screening_ppe', label: 'Base PPE', value: 'Activé', description: 'Vérification quotidienne contre la base PPE interne et fournisseur externe.', type: 'switch' },
  { key: 'screening_seuil', label: 'Seuil de match', value: '65 %', description: 'Score minimal de similarité pour générer une alerte.', type: 'number' },
];

export const mockConfigSeuils: ConfigItem[] = [
  { key: 'seuil_ubo_default', label: 'Seuil UBO par défaut', value: '25 %', description: 'Seuil de détention déclenchant l’identification UBO (COBAC).', type: 'number' },
  { key: 'seuil_ubo_high', label: 'Seuil UBO renforcé', value: '10 %', description: 'Applicable aux banques correspondantes et EME.', type: 'number' },
  { key: 'score_risk_critique', label: 'Score risque Critique', value: '≥ 75', description: 'Score composite déclenchant la double validation hiérarchique.', type: 'number' },
  { key: 'score_risk_eleve', label: 'Score risque Élevé', value: '50 – 74', description: 'Score composite avec validation N+1 obligatoire.', type: 'number' },
];
