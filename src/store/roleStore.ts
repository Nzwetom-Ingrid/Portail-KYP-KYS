import { create } from 'zustand';
import { DEMO_ROLES, type Role, type Permission, hasPermission } from '@/types/roles';

/** Identité de l'utilisateur réellement connecté (renseignée par la détection). */
export interface Identity {
  fullName?: string;
  email?: string;
  /** Direction réelle de l'utilisateur (issue de sa fiche), ex. 'DMG'. */
  direction?: string;
  /** GUID de la fiche afb_utilisateurinterne (pour filtrer « mes » décisions). */
  utilisateurInterneId?: string;
}

interface RoleStore {
  /** Rôle actuellement ACTIF (celui qui pilote les permissions/l'affichage). */
  currentRole: Role;
  /** Rôle RÉEL de la personne connectée — ne change pas quand un Super Admin
   *  visualise l'app « en tant que » un autre rôle (impersonation). */
  realRoleId: string;
  identity: Identity;
  /** Passe à true quand la détection du rôle réel est terminée (pour piloter la
   *  redirection d'accueil selon le rôle, sans partir trop tôt sur le Dashboard). */
  roleResolved: boolean;
  /** Impersonation : change uniquement le rôle actif (le rôle réel est conservé). */
  setRole: (roleId: string) => void;
  /** Définit le rôle RÉEL de l'utilisateur détecté (+ aligne le rôle actif dessus). */
  setRealRole: (roleId: string) => void;
  markRoleResolved: () => void;
  setIdentity: (identity: Identity) => void;
  can: (perm: Permission) => boolean;
}

// Rôle par défaut AVANT résolution de l'identité connectée :
// - en dev local (`npm run dev`) → Super Admin, pour tester confortablement ;
// - en PROD (app déployée via pac code push) → moindre privilège (Visiteur), pour
//   qu'un utilisateur non résolu / non habilité ne voie PAS tout par défaut.
//   (Sécurité : sans ça, un compte dont l'e-mail ne matche aucune fiche tombait
//   sur Super Admin.)
const DEFAULT_ROLE = import.meta.env.DEV
  ? DEMO_ROLES[0]
  : (DEMO_ROLES.find((r) => r.id === 'visiteur') ?? DEMO_ROLES[0]);

export const useRoleStore = create<RoleStore>((set, get) => ({
  currentRole: DEFAULT_ROLE,
  realRoleId: DEFAULT_ROLE.id,
  identity: {},
  roleResolved: false,
  setRole: (roleId) => {
    const role = DEMO_ROLES.find(r => r.id === roleId);
    if (role) set({ currentRole: role });
  },
  setRealRole: (roleId) => {
    const role = DEMO_ROLES.find(r => r.id === roleId);
    if (role) set({ currentRole: role, realRoleId: role.id });
  },
  markRoleResolved: () => set({ roleResolved: true }),
  setIdentity: (identity) => set({ identity }),
  can: (perm) => hasPermission(get().currentRole, perm),
}));