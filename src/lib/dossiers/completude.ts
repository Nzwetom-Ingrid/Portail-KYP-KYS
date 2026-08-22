/**
 * Complétude d'un dossier — ce qui interdit de le valider.
 *
 * La validation était possible à tout moment. Le tiroir affichait bien « 3/7
 * pièces fournies », mais ce compteur n'était qu'un indicateur : rien
 * n'empêchait de cliquer « Valider » sur un dossier auquel il manquait le
 * registre du commerce. Une décision de conformité prise sur un dossier
 * incomplet n'a aucune valeur devant le régulateur, et c'est précisément ce que
 * la recette a relevé.
 *
 * Deux familles de manques, traitées séparément parce qu'elles se corrigent à
 * deux endroits différents : les PIÈCES, que le partenaire dépose sur son
 * espace, et les CHAMPS d'identité, que le chargé de relation ou le partenaire
 * renseignent sur la fiche.
 *
 * Fonctions PURES, testables seules (charte AFB_PS03 § 22.1).
 */

/** Ce qu'il faut savoir d'un dossier pour juger de sa complétude. */
export interface DossierAControler {
  entite?: string;
  pays?: string;
  email?: string;
  onboarding?: {
    rccm?: string;
    ville?: string;
    adresse?: string;
    telephone?: string;
    swift?: string;
    secteur?: string;
    formeJuridique?: string;
  };
}

/** Une ligne de la checklist des pièces attendues, telle que le tiroir la calcule. */
export interface PieceAttendue {
  key: string;
  name: string;
  mandatory: boolean;
  fourni: boolean;
}

/**
 * Champs d'identité exigés avant toute validation.
 *
 * Le choix est volontairement restreint à ce qui identifie l'entité et permet
 * de la recontacter. Ville, adresse, téléphone et secteur sont utiles mais ne
 * bloquent pas : refuser de valider un dossier complet parce qu'il manque un
 * numéro de téléphone ferait perdre à la règle toute crédibilité, et pousserait
 * à la contourner.
 */
export const CHAMPS_REQUIS: { cle: string; libelle: string; lire: (d: DossierAControler) => string | undefined }[] = [
  { cle: 'entite', libelle: 'Raison sociale', lire: (d) => d.entite },
  { cle: 'pays', libelle: 'Pays', lire: (d) => d.pays },
  { cle: 'rccm', libelle: 'Numéro RCCM / immatriculation', lire: (d) => d.onboarding?.rccm },
  { cle: 'email', libelle: 'E-mail de contact principal', lire: (d) => d.email },
];

/** Vide, blanc ou tiret de remplissage valent « non renseigné ». */
function estVide(v?: string): boolean {
  const s = String(v ?? '').trim();
  return s === '' || s === '—' || s === '-';
}

export interface Completude {
  /** Libellés des champs d'identité manquants. */
  champsManquants: string[];
  /** Libellés des pièces obligatoires non fournies. */
  piecesManquantes: string[];
  /** Nombre de pièces obligatoires fournies, sur le total attendu. */
  piecesFournies: number;
  piecesAttendues: number;
  /** Faux dès qu'il manque quoi que ce soit. */
  validable: boolean;
}

/**
 * Établit ce qui manque.
 *
 * Les pièces non obligatoires sont ignorées : la checklist est éditable à la
 * création du dossier, et le chargé de relation y décoche justement ce qui ne
 * s'applique pas au partenaire.
 */
export function evaluerCompletude(
  dossier: DossierAControler,
  checklist: PieceAttendue[],
): Completude {
  const champsManquants = CHAMPS_REQUIS.filter((c) => estVide(c.lire(dossier))).map((c) => c.libelle);

  const obligatoires = checklist.filter((p) => p.mandatory);
  const piecesManquantes = obligatoires.filter((p) => !p.fourni).map((p) => p.name);

  return {
    champsManquants,
    piecesManquantes,
    piecesFournies: obligatoires.length - piecesManquantes.length,
    piecesAttendues: obligatoires.length,
    validable: champsManquants.length === 0 && piecesManquantes.length === 0,
  };
}

/**
 * Phrase expliquant le refus, destinée à l'infobulle du bouton.
 *
 * Un bouton grisé sans explication se lit comme une panne — c'est le défaut que
 * le portail présentait sur « Soumettre les documents », et il n'y a aucune
 * raison de le reproduire ici.
 */
export function motifDeBlocage(c: Completude): string | null {
  if (c.validable) return null;
  const morceaux: string[] = [];
  if (c.piecesManquantes.length) {
    morceaux.push(
      c.piecesManquantes.length > 1
        ? `${c.piecesManquantes.length} pièces obligatoires manquantes : ${c.piecesManquantes.join(', ')}`
        : `pièce obligatoire manquante : ${c.piecesManquantes[0]}`,
    );
  }
  if (c.champsManquants.length) {
    morceaux.push(
      c.champsManquants.length > 1
        ? `champs non renseignés : ${c.champsManquants.join(', ')}`
        : `champ non renseigné : ${c.champsManquants[0]}`,
    );
  }
  return `Validation impossible — ${morceaux.join(' ; ')}.`;
}
