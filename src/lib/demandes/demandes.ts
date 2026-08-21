/**
 * Demandes du partenaire — modèle et regroupement en fils de discussion.
 *
 * Une demande de revue n'est PAS un document, et elle apparaissait pourtant
 * dans la liste des pièces déposées, entre deux statuts et deux boutons de
 * validation qui n'avaient aucun sens pour elle. Le back-office n'avait par
 * ailleurs aucun moyen d'y répondre : le partenaire écrivait dans le vide.
 *
 * Faute de table dédiée, la demande est stockée dans `afb_document` avec un
 * marqueur de type et une URL conventionnelle `request://`. Ce module isole
 * cette convention : c'est le SEUL endroit à changer le jour où une table
 * `afb_demande` sera créée. Aucun écran ne connaît le détail du stockage.
 *
 * Fonctions PURES, testables seules (charte AFB_PS03 § 22.1).
 */

/** Types de demandes émises par le partenaire depuis son espace. */
export const TYPE_DEMANDE = {
  /** « Mon dossier a changé, réexaminez-le. » */
  revue: 'demande-revue',
  /** « Il me manque une pièce que la banque doit me fournir. » */
  document: 'demande-document',
} as const;

/**
 * Préfixe du marqueur porté par une réponse du back-office.
 *
 * Le rattachement passe par le TYPE, sous la forme `reponse-demande:<id>`, et
 * non par le lookup `afb_versionprecedente`. C'est la convention déjà utilisée
 * par le portail pour les réponses du tiers (`reponse:<id>`) : elle fonctionne,
 * elle survit à un enregistrement créé en deux temps, et elle évite d'écrire un
 * lookup dont l'association peut être refusée par le Web API.
 */
export const PREFIXE_REPONSE = 'reponse-demande:';

/** Marqueur complet d'une réponse à la demande donnée. */
export function marqueurReponse(demandeId: string): string {
  return `${PREFIXE_REPONSE}${demandeId}`;
}

/** Préfixe d'URL conventionnel : distingue une demande d'un vrai fichier. */
export const URL_DEMANDE = 'request://';

export const LIBELLE_DEMANDE: Record<string, string> = {
  [TYPE_DEMANDE.revue]: 'Demande de revue du dossier',
  [TYPE_DEMANDE.document]: 'Demande de document à la banque',
};

/** Valeurs de choix `afb_statutdevalidite`, réutilisées telles quelles. */
export const STATUT_DEMANDE = { traitee: 0, ouverte: 1 } as const;

/** Sous-ensemble d'`afb_document` nécessaire ici. */
export interface DocumentBrut {
  afb_documentid?: string;
  afb_typededocument?: string;
  afb_nomdufichier?: string;
  afb_motifderejet?: string;
  afb_urlsharepoint?: string;
  afb_statutdevalidite?: number;
  afb_datedeteleversement?: string;
  _afb_versionprecedente_value?: string;
  createdon?: string;
  owneridname?: string;
}

export interface Reponse {
  id: string;
  texte: string;
  date?: string;
  auteur?: string;
}

export interface Demande {
  id: string;
  type: string;
  libelle: string;
  /** Ce que le partenaire a écrit. Vide s'il n'a rien précisé. */
  message: string;
  date?: string;
  traitee: boolean;
  reponses: Reponse[];
}

/** Une demande porte un marqueur de type connu. */
export function estDemande(d: DocumentBrut): boolean {
  const type = String(d.afb_typededocument ?? '');
  return type === TYPE_DEMANDE.revue || type === TYPE_DEMANDE.document;
}

/** Une réponse du back-office, rattachée à sa demande. */
export function estReponse(d: DocumentBrut): boolean {
  return String(d.afb_typededocument ?? '').startsWith(PREFIXE_REPONSE);
}

/** Identifiant de la demande à laquelle cette réponse répond. */
export function demandeVisee(d: DocumentBrut): string | undefined {
  const type = String(d.afb_typededocument ?? '');
  if (!type.startsWith(PREFIXE_REPONSE)) return undefined;
  return type.slice(PREFIXE_REPONSE.length) || undefined;
}

/**
 * Ni demande ni réponse : une vraie pièce justificative.
 *
 * C'est ce prédicat que les listes de documents doivent appliquer — côté
 * back-office comme côté portail — pour cesser d'afficher les demandes parmi
 * les pièces.
 */
export function estPieceJustificative(d: DocumentBrut): boolean {
  const type = String(d.afb_typededocument ?? '');
  // Les réponses du tiers à une demande de pièce portent « reponse:<clé> » et
  // relèvent d'un autre écran ; elles étaient déjà écartées.
  return !estDemande(d) && !estReponse(d) && !type.startsWith('reponse:');
}

/** Date exploitable d'un enregistrement, quelle que soit la colonne remplie. */
function dateDe(d: DocumentBrut): string | undefined {
  return d.afb_datedeteleversement || d.createdon || undefined;
}

/** Horodatage exploitable, ou null si la date est absente ou illisible. */
function instant(d?: string): number | null {
  if (!d) return null;
  const t = new Date(d).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * Compare deux dates dans le sens demandé — mais les enregistrements
 * indatables partent TOUJOURS en fin de liste.
 *
 * Le piège : un comparateur croissant dont on inverse les arguments pour
 * obtenir un tri décroissant inverse aussi le sort des indatables, qui
 * remontent alors en tête. Le sens est donc un paramètre, pas une inversion
 * des arguments.
 *
 * @param sens 1 = du plus ancien au plus récent, -1 = l'inverse.
 */
function comparerDates(a: string | undefined, b: string | undefined, sens: 1 | -1): number {
  const ia = instant(a);
  const ib = instant(b);
  if (ia === null && ib === null) return 0;
  if (ia === null) return 1;
  if (ib === null) return -1;
  return (ia - ib) * sens;
}

/**
 * Reconstitue les fils : chaque demande avec ses réponses, la plus récente
 * demande en tête — c'est celle qui attend une réaction.
 */
export function construireDemandes(docs: DocumentBrut[]): Demande[] {
  const reponsesParDemande = new Map<string, Reponse[]>();

  for (const d of docs) {
    if (!estReponse(d)) continue;
    const parent = demandeVisee(d);
    // Une réponse orpheline — demande supprimée entre-temps — n'a plus rien à
    // dire : l'afficher seule induirait en erreur.
    if (!parent || !d.afb_documentid) continue;
    const reponse: Reponse = {
      id: d.afb_documentid,
      texte: d.afb_motifderejet ?? '',
      date: dateDe(d),
      auteur: d.owneridname,
    };
    const liste = reponsesParDemande.get(parent);
    if (liste) liste.push(reponse);
    else reponsesParDemande.set(parent, [reponse]);
  }

  return docs
    .filter((d) => estDemande(d) && d.afb_documentid)
    .map((d) => {
      // Le filtre ci-dessus garantit l'identifiant et un type connu : aucun
      // repli n'est nécessaire ici, et un repli inatteignable serait du code
      // mort que la couverture signalerait à juste titre.
      const id = d.afb_documentid as string;
      const type = d.afb_typededocument as string;
      return {
        id,
        type,
        libelle: LIBELLE_DEMANDE[type],
        message: d.afb_motifderejet ?? '',
        date: dateDe(d),
        traitee: d.afb_statutdevalidite === STATUT_DEMANDE.traitee,
        reponses: (reponsesParDemande.get(id) ?? []).sort((a, b) =>
          comparerDates(a.date, b.date, 1),
        ),
      };
    })
    .sort((a, b) => comparerDates(a.date, b.date, -1));
}

/** Combien de demandes attendent encore une réponse. */
export function compterOuvertes(demandes: Demande[]): number {
  return demandes.filter((d) => !d.traitee).length;
}
