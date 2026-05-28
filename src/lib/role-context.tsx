import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type Role = "super-admin" | "admin-direction" | "admin" | "partner";
export type Direction = "DCONF" | "DMG" | "TRESO" | "COMEX";

type AuthUser = { name: string; email: string; role: Role; direction: Direction };

type Ctx = {
  role: Role;
  setRole: (r: Role) => void;
  direction: Direction;
  setDirection: (d: Direction) => void;
  user: AuthUser | null;
};

const defaultUser: AuthUser = {
  name: "J. Mbarga",
  email: "j.mbarga@afrilandfirstbank.com",
  role: "admin",
  direction: "DMG",
};

const RoleContext = createContext<Ctx>({
  role: "admin",
  setRole: () => {},
  direction: "DMG",
  setDirection: () => {},
  user: defaultUser,
});

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("admin");
  const [direction, setDirection] = useState<Direction>("DMG");
  const value = useMemo<Ctx>(() => {
    const effectiveDirection = role === "super-admin" ? "DCONF" : direction;
    const user: AuthUser = { ...defaultUser, role, direction: effectiveDirection };
    return { role, setRole, direction, setDirection, user };
  }, [role, direction]);
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export const useRole = () => useContext(RoleContext);

export const roleLabels: Record<Role, string> = {
  "super-admin": "Super Admin · DCONF",
  "admin-direction": "Admin Direction",
  admin: "Chargé conformité",
  partner: "Partenaire / Fournisseur",
};

export const directionLabels: Record<Direction, string> = {
  DCONF: "DCONF — Conformité",
  DMG: "DMG — Moyens Généraux",
  TRESO: "Trésorerie",
  COMEX: "COMEX — Commerce extérieur",
};
