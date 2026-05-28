import { create } from 'zustand';
import { DEMO_ROLES, type Role, type Permission, hasPermission } from '@/types/roles';

interface RoleStore {
  currentRole: Role;
  setRole: (roleId: string) => void;
  can: (perm: Permission) => boolean;
}

export const useRoleStore = create<RoleStore>((set, get) => ({
  currentRole: DEMO_ROLES[0], // Super Admin par défaut
  setRole: (roleId) => {
    const role = DEMO_ROLES.find(r => r.id === roleId);
    if (role) set({ currentRole: role });
  },
  can: (perm) => hasPermission(get().currentRole, perm),
}));