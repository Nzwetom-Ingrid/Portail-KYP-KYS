/**
 * Vue consolidée des accès au portail partenaire.
 *
 * La console support ne lisait que `afb_tiersexterneb2c`. Cette table est un
 * MIROIR alimenté par le flux d'invitation : elle ne contient que les personnes
 * passées par ce flux, et elle ne porte aucune trace d'authentification réelle.
 * Cinq lignes s'y affichaient pour une quarantaine de tiers.
 *
 * L'authentification Power Pages, elle, s'appuie sur la table CONTACT et sur ses
 * colonnes `adx_identity_*` : connexion autorisée ou non, verrouillage, dernière
 * connexion réussie, compteur d'échecs. C'est la source de vérité.
 *
 * Ce module fusionne les trois voies d'accès — exactement celles que le portail
 * explore lui-même dans `loadAccessibleTiers` — et regroupe par PERSONNE plutôt
 * que par enregistrement. Une même adresse pilotant trois sociétés donne une
 * seule ligne portant ses trois entreprises, au lieu de trois lignes muettes.
 *
 * Fonctions PURES, testables seules (charte AFB_PS03 § 22.1).
 */
import {
  diagnostiquer,
  TENTATIVES_AVANT_BLOCAGE,
  type CompteExterne,
  type Diagnostic,
} from './accessDiagnostic';

/** Traces d'authentification Power Pages portées par la fiche Contact. */
export interface ContactPortail {
  contactid: string;
  emailaddress1?: string;
  fullname?: string;
  /** 0 = actif, 1 = désactivé. Un contact désactivé ne peut plus se connecter. */
  statecode?: number;
  _afb_tiers_value?: string;
  adx_identity_logonenabled?: boolean;
  adx_identity_emailaddress1confirmed?: boolean;
  adx_identity_lastsuccessfullogin?: string;
  adx_identity_accessfailedcount?: number;
  adx_identity_lockoutenddate?: string;
}

/** Sous-ensemble de `afb_tiers` utile ici. */
export interface TiersMinimal {
  afb_tiersid: string;
  afb_nomdupartenaire?: string;
  afb_emailcontactprincipal?: string;
}

/** Identité externe (miroir du flux d'invitation), avec son identifiant. */
export type CompteB2c = CompteExterne & { afb_tiersexterneb2cid: string };

/** Par quelle voie cette personne peut atteindre le portail. */
export type CanalAcces = 'contact' | 'identite-externe' | 'email-principal';

export const CANAL_LABEL: Record<CanalAcces, string> = {
  contact: 'Compte portail (Contact)',
  'identite-externe': 'Identité externe',
  'email-principal': 'E-mail contact principal',
};

export interface EntrepriseAcces {
  id: string;
  nom: string;
}

export interface AccesPortail {
  /** Adresse de connexion normalisée — c'est la clé d'agrégation. */
  email: string;
  /** Nom de la personne, quand la fiche Contact le porte. */
  nom?: string;
  /** Entreprises atteignables avec cette adresse, dédoublonnées et triées. */
  entreprises: EntrepriseAcces[];
  canaux: CanalAcces[];
  contactId?: string;
  compteB2cId?: string;
  diagnostic: Diagnostic;
  /** Dates ISO brutes — le formatage appartient à la vue, le tri à ces valeurs. */
  invitation?: string;
  derniereConnexion?: string;
  tentatives: number;
  compteB2cCree: boolean;
}

function cle(email?: string): string {
  return String(email ?? '').trim().toLowerCase();
}

/** Verrouillage Power Pages : la date de fin est dans le futur. */
function estVerrouille(contact: ContactPortail, maintenant: Date): boolean {
  if (!contact.adx_identity_lockoutenddate) return false;
  const fin = new Date(contact.adx_identity_lockoutenddate);
  return !Number.isNaN(fin.getTime()) && fin.getTime() > maintenant.getTime();
}

/**
 * Diagnostic d'une personne, toutes voies confondues.
 *
 * L'ordre des tests est significatif, comme dans `diagnostiquer` : on renvoie la
 * cause la plus en amont. Signaler « jamais connecté » à propos d'un compte
 * verrouillé ferait perdre son temps à l'agent.
 */
export function diagnostiquerAcces(
  acces: Omit<AccesPortail, 'diagnostic'>,
  contact: ContactPortail | undefined,
  compte: CompteB2c | undefined,
  maintenant: Date = new Date(),
): Diagnostic {
  // 1. Aucune entreprise, quelle que soit la voie : la connexion réussit et le
  // portail reste vide. C'est le symptôme le plus déroutant au téléphone.
  if (!acces.entreprises.length) {
    return {
      code: 'tiers-non-rattache',
      severite: 'bloquant',
      libelle: 'Aucun tiers rattaché',
      symptome:
        'La connexion réussit, mais le portail reste vide : aucun dossier, aucun document, aucun téléversement possible.',
      action:
        'Renseigner le lookup « Tiers » sur la fiche Contact, ou rattacher l’identité externe à une entreprise.',
    };
  }

  if (contact) {
    if (contact.statecode === 1) {
      return {
        code: 'contact-desactive',
        severite: 'bloquant',
        libelle: 'Contact désactivé',
        symptome: 'La fiche Contact est désactivée : toute connexion au portail est refusée.',
        action: 'Réactiver la fiche Contact dans Dataverse si l’accès reste légitime.',
      };
    }

    if (contact.adx_identity_logonenabled === false) {
      return {
        code: 'connexion-desactivee',
        severite: 'bloquant',
        libelle: 'Connexion portail désactivée',
        symptome:
          'Le contact existe, mais « Connexion activée » est à Non : le portail refuse l’authentification.',
        action:
          'Passer « Connexion activée » à Oui sur la fiche Contact (onglet Authentification portail).',
      };
    }

    const echecs = contact.adx_identity_accessfailedcount ?? 0;
    if (estVerrouille(contact, maintenant) || echecs >= TENTATIVES_AVANT_BLOCAGE) {
      return {
        code: 'compte-bloque',
        severite: 'bloquant',
        libelle: 'Compte verrouillé',
        symptome: `Compte verrouillé après ${echecs} tentatives infructueuses.`,
        action:
          'Vider « Date de fin de verrouillage » et remettre le compteur d’échecs à 0 sur la fiche Contact.',
      };
    }

    // 2. Le contact existe et rien ne le bloque. S'il ne s'est jamais connecté,
    // c'est soit qu'il n'a pas confirmé son adresse (invitation non utilisée),
    // soit qu'il n'a tout simplement pas encore essayé.
    if (!contact.adx_identity_lastsuccessfullogin) {
      if (contact.adx_identity_emailaddress1confirmed === false) {
        return {
          code: 'email-non-confirme',
          severite: 'attention',
          libelle: 'Invitation non utilisée',
          symptome:
            'L’adresse n’a jamais été confirmée : le lien d’invitation n’a pas été ouvert, ou il a expiré.',
          action: 'Renvoyer l’invitation depuis la fiche Contact (« Envoyer l’invitation »).',
        };
      }
      return {
        code: 'jamais-connecte',
        severite: 'info',
        libelle: 'Jamais connecté',
        symptome:
          'Le compte portail existe et fonctionne, mais aucune connexion n’a été enregistrée.',
        action: 'Rien à corriger. Un simple rappel au partenaire suffit.',
      };
    }

    return {
      code: 'ok',
      severite: 'ok',
      libelle: 'Accès opérationnel',
      symptome: 'Aucune anomalie détectée sur ce compte portail.',
      action:
        'Si le partenaire signale malgré tout un problème, il porte sur un écran précis — le qualifier.',
    };
  }

  // 3. Pas de fiche Contact. L'identité externe reste exploitable pour situer
  // l'avancement de l'invitation : on lui délègue le diagnostic.
  if (compte) {
    // Le rattachement a déjà été tranché plus haut, toutes voies confondues :
    // on neutralise le test que `diagnostiquer` refait sur la seule table b2c,
    // sinon un tiers connu par le Contact ressortirait « non rattaché ».
    return diagnostiquer({ ...compte, _afb_nomdutiers_value: acces.entreprises[0]?.id }, maintenant);
  }

  // 4. L'entreprise porte une adresse de contact principal, mais aucun compte de
  // connexion n'existe nulle part. Le flux d'invitation ne s'est jamais exécuté.
  return {
    code: 'aucun-compte-portail',
    severite: 'bloquant',
    libelle: 'Aucun compte portail',
    symptome:
      'Cette adresse est déclarée sur la fiche du tiers, mais aucune fiche Contact ni identité externe n’existe : la personne n’a rien reçu et ne peut pas se connecter.',
    action:
      'Déclencher l’invitation. Vérifier que le flux « Invitation Tiers » s’exécute bien sur ce tiers.',
  };
}

/**
 * Fusionne les trois voies d'accès en une ligne par personne.
 *
 * @param contacts fiches Contact (authentification Power Pages)
 * @param comptes identités externes `afb_tiersexterneb2c`
 * @param tousLesTiers entreprises, pour le nom et l'e-mail de contact principal
 */
export function agregerAcces(
  contacts: ContactPortail[],
  comptes: CompteB2c[],
  tousLesTiers: TiersMinimal[],
  maintenant: Date = new Date(),
): AccesPortail[] {
  const nomParTiers = new Map<string, string>();
  for (const t of tousLesTiers) {
    if (t.afb_tiersid) nomParTiers.set(t.afb_tiersid, t.afb_nomdupartenaire || 'Entreprise sans nom');
  }

  interface Brouillon {
    email: string;
    nom?: string;
    entreprises: Map<string, string>;
    canaux: Set<CanalAcces>;
    contact?: ContactPortail;
    compte?: CompteB2c;
  }
  const parEmail = new Map<string, Brouillon>();
  const obtenir = (email: string): Brouillon => {
    let b = parEmail.get(email);
    if (!b) {
      b = { email, entreprises: new Map(), canaux: new Set() };
      parEmail.set(email, b);
    }
    return b;
  };

  // Voie 1 — fiches Contact. Seule source des traces d'authentification.
  for (const c of contacts) {
    const email = cle(c.emailaddress1);
    if (!email) continue;
    const b = obtenir(email);
    b.canaux.add('contact');
    // Si plusieurs contacts partagent l'adresse, on garde celui qui porte une
    // trace de connexion : c'est celui avec lequel la personne travaille.
    if (
      !b.contact ||
      (!b.contact.adx_identity_lastsuccessfullogin && c.adx_identity_lastsuccessfullogin)
    ) {
      b.contact = c;
    }
    b.nom = b.nom || c.fullname || undefined;
    const id = c._afb_tiers_value;
    if (id) b.entreprises.set(id, nomParTiers.get(id) ?? 'Entreprise inconnue');
  }

  // Voie 2 — identités externes.
  for (const c of comptes) {
    const email = cle(c.afb_emaildauthentification);
    if (!email) continue;
    const b = obtenir(email);
    b.canaux.add('identite-externe');
    b.compte = b.compte ?? c;
    const id = c._afb_nomdutiers_value;
    if (id) b.entreprises.set(id, nomParTiers.get(id) ?? 'Entreprise inconnue');
  }

  // Voie 3 — e-mail de contact principal déclaré sur le tiers. C'est la voie que
  // le portail privilégie, et la seule qui existe pour un tiers fraîchement créé
  // dont le flux d'invitation n'a pas encore tourné.
  for (const t of tousLesTiers) {
    const email = cle(t.afb_emailcontactprincipal);
    if (!email || !t.afb_tiersid) continue;
    const b = obtenir(email);
    b.canaux.add('email-principal');
    b.entreprises.set(t.afb_tiersid, t.afb_nomdupartenaire || 'Entreprise sans nom');
  }

  const ordreCanal: CanalAcces[] = ['contact', 'identite-externe', 'email-principal'];

  return [...parEmail.values()]
    .map((b) => {
      const base: Omit<AccesPortail, 'diagnostic'> = {
        email: b.email,
        nom: b.nom,
        entreprises: [...b.entreprises.entries()]
          .map(([id, nom]) => ({ id, nom }))
          .sort((x, y) => x.nom.localeCompare(y.nom, 'fr')),
        canaux: ordreCanal.filter((c) => b.canaux.has(c)),
        contactId: b.contact?.contactid,
        compteB2cId: b.compte?.afb_tiersexterneb2cid,
        invitation: b.compte?.afb_datedinvitation,
        derniereConnexion:
          b.contact?.adx_identity_lastsuccessfullogin ?? b.compte?.afb_derniereconnexion,
        tentatives:
          b.contact?.adx_identity_accessfailedcount ?? b.compte?.afb_nombredetentativesechouees ?? 0,
        compteB2cCree: Boolean(b.compte?.afb_identifiantb2c),
      };
      return { ...base, diagnostic: diagnostiquerAcces(base, b.contact, b.compte, maintenant) };
    })
    .sort((a, b) => a.email.localeCompare(b.email, 'fr'));
}
