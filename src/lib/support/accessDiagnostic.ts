/**
 * Diagnostic d'accès d'un partenaire externe au portail.
 *
 * Répond à la question que le support reçoit au téléphone : « je n'arrive pas à
 * me connecter ». Plutôt que de faire ouvrir Dataverse, Azure et Power Pages à
 * l'agent, on lit les traces déjà présentes sur `afb_tiersexterneb2c` et on en
 * déduit la cause la plus probable, avec la manœuvre correspondante.
 *
 * Fonction PURE et sans dépendance à React : c'est une règle métier, elle doit
 * pouvoir être testée seule (charte § 22.1).
 */

/** Durée de validité du lien d'invitation, annoncée au tiers dans l'e-mail. */
export const INVITATION_VALIDITE_HEURES = 72;

/** Seuil au-delà duquel Azure AD B2C verrouille le compte. */
export const TENTATIVES_AVANT_BLOCAGE = 5;

/** Valeurs de choix `afb_statutducompte`. */
export const STATUT_COMPTE = { actif: 0, bloque: 747010001, desactive: 747010002 } as const;

export type DiagnosticCode =
  | 'tiers-non-rattache'
  | 'compte-desactive'
  | 'compte-bloque'
  | 'invitation-jamais-envoyee'
  | 'invitation-expiree'
  | 'inscription-inachevee'
  | 'jamais-connecte'
  | 'ok';

export type Severite = 'bloquant' | 'attention' | 'info' | 'ok';

export interface Diagnostic {
  code: DiagnosticCode;
  severite: Severite;
  /** Formulation courte, affichable dans un tableau. */
  libelle: string;
  /** Ce qui se passe côté utilisateur — ce qu'il décrit au téléphone. */
  symptome: string;
  /** La manœuvre à effectuer. C'est la seule ligne que l'agent doit lire. */
  action: string;
}

/** Sous-ensemble des champs nécessaires — le diagnostic ne dépend pas du reste. */
export interface CompteExterne {
  afb_emaildauthentification?: string;
  afb_identifiantb2c?: string;
  afb_datedinvitation?: string;
  afb_derniereconnexion?: string;
  afb_nombredetentativesechouees?: number;
  afb_statutducompte?: number;
  _afb_nomdutiers_value?: string;
}

function heuresDepuis(iso: string | undefined, maintenant: Date): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return (maintenant.getTime() - d.getTime()) / 3_600_000;
}

/**
 * Établit le diagnostic. L'ordre des tests est significatif : on renvoie la
 * cause la plus en amont, celle qu'il faut traiter en premier. Inutile de
 * signaler une invitation expirée si le compte est désactivé.
 *
 * @param maintenant injectable pour rendre les tests déterministes.
 */
export function diagnostiquer(compte: CompteExterne, maintenant: Date = new Date()): Diagnostic {
  // 1. Aucun tiers rattaché — cause la plus fréquente et la plus déroutante :
  // l'utilisateur s'authentifie SANS erreur, puis tombe sur un portail vide.
  // Le portail affiche « Aucune fiche tiers rattachée à votre compte ».
  if (!compte._afb_nomdutiers_value) {
    return {
      code: 'tiers-non-rattache',
      severite: 'bloquant',
      libelle: 'Aucun tiers rattaché',
      symptome:
        'La connexion réussit, mais le portail reste vide : aucun dossier, aucun document, aucun téléversement possible.',
      action:
        'Renseigner le tiers sur cette identité externe, ou vérifier le lookup afb_Tiers de la fiche Contact.',
    };
  }

  if (compte.afb_statutducompte === STATUT_COMPTE.desactive) {
    return {
      code: 'compte-desactive',
      severite: 'bloquant',
      libelle: 'Compte désactivé',
      symptome: 'La connexion est refusée dès la saisie de l’adresse e-mail.',
      action: 'Réactiver le compte depuis cette page si l’accès est toujours légitime.',
    };
  }

  const tentatives = compte.afb_nombredetentativesechouees ?? 0;
  if (compte.afb_statutducompte === STATUT_COMPTE.bloque || tentatives >= TENTATIVES_AVANT_BLOCAGE) {
    return {
      code: 'compte-bloque',
      severite: 'bloquant',
      libelle: 'Compte bloqué',
      symptome: `Compte verrouillé après ${tentatives} tentatives infructueuses.`,
      action:
        'Débloquer le compte côté Azure AD B2C, puis remettre le statut à « Actif » depuis cette page.',
    };
  }

  if (!compte.afb_datedinvitation) {
    return {
      code: 'invitation-jamais-envoyee',
      severite: 'bloquant',
      libelle: 'Invitation jamais envoyée',
      symptome: 'Le partenaire n’a jamais rien reçu — il attend un e-mail qui n’est pas parti.',
      action: 'Déclencher l’invitation. Vérifier au passage que le flux « Invitation Tiers » s’exécute.',
    };
  }

  const heuresDepuisInvitation = heuresDepuis(compte.afb_datedinvitation, maintenant);
  const jamaisConnecte = !compte.afb_derniereconnexion;

  // Identifiant B2C absent = le compte n'existe pas côté Azure : le partenaire
  // a reçu le lien mais n'est jamais allé au bout de son inscription.
  if (!compte.afb_identifiantb2c) {
    const expiree =
      heuresDepuisInvitation !== null && heuresDepuisInvitation > INVITATION_VALIDITE_HEURES;
    return expiree
      ? {
          code: 'invitation-expiree',
          severite: 'bloquant',
          libelle: 'Invitation expirée',
          symptome: `Lien reçu il y a ${Math.floor(heuresDepuisInvitation! / 24)} jours et jamais utilisé — sa validité était de ${INVITATION_VALIDITE_HEURES} h.`,
          action: 'Renvoyer une invitation : le lien d’origine ne fonctionne plus.',
        }
      : {
          code: 'inscription-inachevee',
          severite: 'attention',
          libelle: 'Inscription non finalisée',
          symptome:
            'L’invitation est partie, mais le compte n’a pas encore été créé côté Azure AD B2C.',
          action: `Aucune action pour l’instant : le lien reste valable ${INVITATION_VALIDITE_HEURES} h. Relancer le partenaire par téléphone.`,
        };
  }

  if (jamaisConnecte) {
    return {
      code: 'jamais-connecte',
      severite: 'info',
      libelle: 'Jamais connecté',
      symptome: 'Le compte existe et fonctionne, mais aucune connexion n’a encore été enregistrée.',
      action: 'Rien à corriger. Un simple rappel au partenaire suffit.',
    };
  }

  return {
    code: 'ok',
    severite: 'ok',
    libelle: 'Accès opérationnel',
    symptome: 'Aucune anomalie détectée sur ce compte.',
    action: 'Si le partenaire signale malgré tout un problème, il porte sur un écran précis — le qualifier.',
  };
}

/** Regroupe les comptes par sévérité, pour les compteurs en tête de page. */
export function compterParSeverite(diagnostics: Diagnostic[]): Record<Severite, number> {
  const total: Record<Severite, number> = { bloquant: 0, attention: 0, info: 0, ok: 0 };
  for (const d of diagnostics) total[d.severite] += 1;
  return total;
}
