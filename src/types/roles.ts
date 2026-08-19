export type RoleLevel = 1 | 2 | 3;

export type Direction = 'DCONF' | 'DMG' | 'TRESO' | 'COMEX' | 'DRISQUE';

export type Permission =
  | 'dashboard.view'
  | 'partners.view' | 'partners.create' | 'partners.edit' | 'partners.delete'
  | 'dossiers.validate' | 'dossiers.reject'
  | 'dossiers.confirm'
  | 'screening.view' | 'screening.run'
  | 'ubo.view' | 'ubo.validate'
  | 'questionnaires.view' | 'questionnaires.create' | 'questionnaires.assign'
  | 'reports.export'
  | 'users.create' | 'users.manage'
  | 'roles.create' | 'roles.manage'
  | 'admin.full';

export interface Role {
  id: string;
  label: string;
  level: RoleLevel;
  direction?: Direction;
  permissions: Permission[];
  description: string;
}

/** Socle de lecture seule, partagé par les rôles qui ne modifient rien. Défini
 *  une fois : deux listes recopiées finissent toujours par diverger. */
const READ_ONLY: Permission[] = [
  'dashboard.view',
  'partners.view',
  'screening.view',
  'ubo.view',
  'questionnaires.view',
];

export const DEMO_ROLES: Role[] = [
  {
    id: 'super-admin',
    label: 'Super Admin · DCONF',
    level: 1,
    direction: 'DCONF',
    description: 'Tous droits — peut créer admins et rôles personnalisés',
    permissions: ['admin.full'],
  },
  {
    id: 'admin-direction',
    label: 'Admin Direction',
    level: 2,
    description: 'Valide en second niveau les dossiers de sa direction (validation effective)',
    permissions: [
      'dashboard.view',
      'partners.view', 'partners.create', 'partners.edit',
      'dossiers.validate', 'dossiers.reject', 'dossiers.confirm',
      'screening.view',
      'ubo.view',
      // Création/affectation de questionnaires réservée à la DCONF (retiré ici).
      'questionnaires.view',
      'reports.export',
      'users.create', 'users.manage',
      'roles.create',
    ],
  },
  {
    id: 'charge-kyc',
    label: 'Chargé KYC',
    level: 3,
    direction: 'DCONF',
    description:
      'Crée les tiers, instruit les dossiers, mène le screening et les questionnaires — propose une décision, ne la rend pas effective',
    permissions: [
      'dashboard.view',
      'partners.view', 'partners.create', 'partners.edit',
      // ATTENTION — 'dossiers.confirm' est volontairement ABSENT. C'est cette
      // absence, et elle seule, qui déclenche la double validation : sans cette
      // permission, DossiersValidation enregistre une PROPOSITION et laisse le
      // dossier « En revue ». La confirmation revient à l'Admin Direction.
      // Ajouter 'dossiers.confirm' ici supprimerait le contrôle à quatre yeux.
      'dossiers.validate', 'dossiers.reject',
      'screening.view', 'screening.run',
      'ubo.view', 'ubo.validate',
      'questionnaires.view', 'questionnaires.create', 'questionnaires.assign',
      'reports.export',
    ],
  },
  {
    id: 'utilisateur-afb',
    label: 'Utilisateur AFB',
    level: 3,
    description: 'Lecture seule — collaborateur de la banque, audit interne, COMDIR',
    permissions: READ_ONLY,
  },
  {
    // Mêmes droits qu'un Utilisateur AFB, conservé comme rôle distinct pour une
    // raison de traçabilité et non de permissions : le journal d'audit enregistre
    // l'auteur d'une action, pas son rôle. Le rôle porté par la fiche utilisateur
    // est donc le seul endroit qui permette de distinguer un accès régulateur
    // d'un accès collaborateur lorsqu'on relit le journal.
    id: 'auditeur-externe',
    label: 'Auditeur externe · COBAC/ANIF',
    level: 3,
    description: 'Accès lecture seule pour le régulateur — révocation manuelle en fin de mission',
    permissions: READ_ONLY,
  },
];

export function hasPermission(role: Role, perm: Permission): boolean {
  if (role.permissions.includes('admin.full')) return true;
  return role.permissions.includes(perm);
}