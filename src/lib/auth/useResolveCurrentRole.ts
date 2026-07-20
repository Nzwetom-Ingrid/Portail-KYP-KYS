/**
 * Détection de l'utilisateur réellement connecté (Layer 2 — masquage UI).
 *
 * Au montage, on lit le contexte Power Apps (`getContext`) pour obtenir l'e-mail
 * (userPrincipalName) de l'utilisateur authentifié, puis on retrouve sa fiche
 * `afb_utilisateurinterne` par e-mail et on applique son rôle au `roleStore`.
 *
 * Politique de repli (sans lockout pendant la phase de déploiement) :
 *  - utilisateur identifié ET présent dans le référentiel → son rôle réel est appliqué ;
 *  - utilisateur identifié mais absent du référentiel → rôle minimal « Visiteur » ;
 *  - contexte indisponible (SDK non initialisé, hors hôte Power Apps) → on garde le
 *    rôle par défaut du store (pas de blocage). À durcir une fois la détection validée.
 *
 * La VRAIE protection des données reste assurée par Dataverse (rôles de sécurité + RLS).
 */
import { useEffect, useState } from 'react';
import { getContext } from '@microsoft/power-apps/app';
import { utilisateursInternes } from '@/lib/dataverse/entityHooks';
import { useRoleStore } from '@/store/roleStore';
import { DV_ROLE_CODE, DV_DIRECTION_CODE } from '@/lib/dataverse/userMappers';
import { setCurrentUser } from '@/lib/auth/currentUserRef';

/** Code `afb_direction` Dataverse → libellé court de direction affiché. */
const DV_DIRECTION_TO_LABEL: Record<number, string> = {
  [DV_DIRECTION_CODE.DCONF]: 'DCONF',
  [DV_DIRECTION_CODE.DMG]: 'DMG',
  [DV_DIRECTION_CODE.TRESO]: 'TRESO',
  [DV_DIRECTION_CODE.DSI]: 'DSI',
  [DV_DIRECTION_CODE.DRISQUE]: 'DRISQUE',
};

/** Code `afb_role` Dataverse → identifiant de rôle applicatif (cf. DEMO_ROLES). */
const DV_ROLE_TO_APP_ROLE_ID: Record<number, string> = {
  [DV_ROLE_CODE.SuperadminDCONF]: 'super-admin', // niveau 1 — valide effectivement
  747010005: 'admin-direction', // niveau 2 — Admin direction (valeur de choix à créer dans afb_role)
  [DV_ROLE_CODE.ChargeConformite]: 'charge-conformite', // niveau 3 — propose, validation requise
  [DV_ROLE_CODE.ChargeRelation]: 'charge-relation',
  [DV_ROLE_CODE.Auditeurinterne]: 'visiteur',
  [DV_ROLE_CODE.Auditeurexterne]: 'auditeur-externe',
};

export interface ResolvedIdentity {
  /** true tant que la résolution n'a pas abouti (chargement). */
  resolving: boolean;
  /** Nom affichable de l'utilisateur connecté, si disponible. */
  fullName?: string;
  /** E-mail (UPN) de l'utilisateur connecté, si disponible. */
  email?: string;
  /** true si l'identité a pu être lue depuis l'hôte Power Apps. */
  detected: boolean;
}

export function useResolveCurrentRole(): ResolvedIdentity {
  const { data: users } = utilisateursInternes.useList({ top: 500 });
  const setRealRole = useRoleStore((s) => s.setRealRole);
  const setStoreIdentity = useRoleStore((s) => s.setIdentity);
  const markRoleResolved = useRoleStore((s) => s.markRoleResolved);
  const [identity, setIdentity] = useState<ResolvedIdentity>({ resolving: true, detected: false });

  useEffect(() => {
    if (!users) return;
    let cancelled = false;

    (async () => {
      try {
        const ctx = await getContext();
        const email = (ctx?.user?.userPrincipalName ?? '').trim().toLowerCase();
        const fullName = ctx?.user?.fullName ?? undefined;
        if (cancelled) return;

        if (!email) {
          // Identité illisible → on n'altère pas le rôle par défaut.
          setIdentity({ resolving: false, detected: false, fullName });
          return;
        }

        const me = users.find((u) => (u.afb_adresseemail ?? '').trim().toLowerCase() === email);
        // Nom affichable : priorité au nom du référentiel, sinon celui du contexte.
        const displayName = me?.afb_nomcomplet?.trim() || fullName;
        const direction = me ? DV_DIRECTION_TO_LABEL[me.afb_direction as number] : undefined;
        if (me) {
          setRealRole(DV_ROLE_TO_APP_ROLE_ID[me.afb_role as number] ?? 'visiteur');
        } else {
          // Authentifié mais non habilité dans le référentiel → privilège minimal.
          setRealRole('visiteur');
        }
        // Mémorise l'utilisateur pour la journalisation d'audit (auteur des actions).
        setCurrentUser({ utilisateurInterneId: me?.afb_utilisateurinterneid, name: displayName, email });
        setStoreIdentity({ fullName: displayName, email, direction, utilisateurInterneId: me?.afb_utilisateurinterneid });
        setIdentity({ resolving: false, detected: true, email, fullName: displayName });
      } catch {
        // Contexte Power Apps indisponible → on conserve le rôle par défaut (pas de lockout).
        if (!cancelled) setIdentity({ resolving: false, detected: false });
      } finally {
        // Résolution terminée (quel que soit le chemin) → l'accueil peut rediriger
        // selon le rôle sans partir prématurément sur le Dashboard.
        if (!cancelled) markRoleResolved();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [users, setRealRole, setStoreIdentity, markRoleResolved]);

  return identity;
}
