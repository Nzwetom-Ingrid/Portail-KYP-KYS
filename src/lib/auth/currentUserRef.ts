/**
 * Référence module-singleton de l'utilisateur connecté.
 *
 * Le `auditLogger` (appelé tout en bas de la couche données, hors contexte React)
 * a besoin de savoir QUI agit pour renseigner l'auteur dans `afb_journalaudit`.
 * `useResolveCurrentRole` alimente cette référence dès que l'identité est résolue.
 */
export interface CurrentUserRef {
  /** GUID de la fiche `afb_utilisateurinterne` correspondant à l'utilisateur connecté. */
  utilisateurInterneId?: string;
  name?: string;
  email?: string;
}

let current: CurrentUserRef = {};

export function setCurrentUser(u: CurrentUserRef): void {
  current = u;
}

export function getCurrentUser(): CurrentUserRef {
  return current;
}
