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
    id: 'charge-conformite',
    label: 'Chargé de conformité',
    level: 3,
    direction: 'DCONF',
    description: 'Validation des dossiers, screening, décisions',
    permissions: [
      'dashboard.view',
      'partners.view', 'partners.edit',
      'dossiers.validate', 'dossiers.reject',
      'screening.view', 'screening.run',
      'ubo.view', 'ubo.validate',
      'questionnaires.view',
      'reports.export',
    ],
  },
  {
    id: 'charge-relation',
    label: 'Chargé de relation',
    level: 3,
    description: 'Crée les tiers et envoie les invitations — pas de validation',
    permissions: [
      'dashboard.view',
      'partners.view', 'partners.create', 'partners.edit',
      'ubo.view',
      'questionnaires.view',
      'reports.export',
    ],
  },
  {
    id: 'analyste-questionnaires',
    label: 'Analyste questionnaires',
    level: 3,
    direction: 'DCONF',
    description: 'Revue et validation des réponses aux questionnaires',
    permissions: [
      'dashboard.view',
      'partners.view',
      'questionnaires.view', 'questionnaires.create', 'questionnaires.assign',
    ],
  },
  {
    id: 'visiteur',
    label: 'Visiteur',
    level: 3,
    description: 'Lecture seule — audit interne, COMDIR',
    permissions: [
      'dashboard.view',
      'partners.view',
      'screening.view',
      'ubo.view',
      'questionnaires.view',
    ],
  },
  {
    id: 'auditeur-externe',
    label: 'Auditeur externe · COBAC/ANIF',
    level: 3,
    description: 'Accès lecture seule temporaire pour le régulateur',
    permissions: [
      'dashboard.view',
      'partners.view',
      'screening.view',
      'ubo.view',
      'questionnaires.view',
    ],
  },
  {
    id: 'partenaire-externe',
    label: 'Partenaire / Fournisseur',
    level: 3,
    description: 'Vue Power Pages simulée — espace partenaire externe',
    permissions: ['dashboard.view'],
  },
];

export function hasPermission(role: Role, perm: Permission): boolean {
  if (role.permissions.includes('admin.full')) return true;
  return role.permissions.includes(perm);
}