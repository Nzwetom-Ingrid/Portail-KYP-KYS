/**
 * Renversement de la vue des accès : une ligne par TIERS.
 *
 * `accesPortail` regroupe par personne — utile pour répondre à « untel n'arrive
 * pas à se connecter ». Mais la population de référence du support, c'est la
 * table `afb_tiers` : ce sont les entreprises que la banque suit, et une
 * entreprise dont personne ne peut ouvrir le portail est le cas le plus grave
 * qui soit. Regroupée par personne, elle n'apparaissait tout simplement pas.
 *
 * Cette vue part donc de TOUS les tiers, et raccroche à chacun les personnes
 * qui peuvent l'atteindre. Les identités sans entreprise rattachée — elles
 * existent, et le portail leur ouvre une page vide — sont rassemblées dans une
 * ligne à part plutôt que perdues.
 *
 * Fonction PURE, testable seule (charte AFB_PS03 § 22.1).
 */
import { SEVERITE_ORDRE, type Diagnostic } from './accessDiagnostic';
import type { AccesPortail, TiersMinimal } from './accesPortail';

/** Identifiant conventionnel de la ligne « sans entreprise rattachée ». */
export const SANS_ENTREPRISE = '';

export interface AccesTiers {
  /** Vide pour la ligne des identités orphelines. */
  tiersId: string;
  nom: string;
  pays?: string;
  /** Personnes pouvant atteindre ce tiers, les plus en difficulté d'abord. */
  personnes: AccesPortail[];
  /** État de l'entreprise, pas d'une personne : voir `diagnostiquerTiers`. */
  diagnostic: Diagnostic;
  /** Au moins une de ces personnes pilote aussi d'autres entreprises. */
  accesPartage: boolean;
  /** Nombre de personnes dont l'accès est bloqué. */
  bloquees: number;
  derniereConnexion?: string;
  tentatives: number;
}

const AUCUN_ACCES: Diagnostic = {
  code: 'aucun-acces',
  severite: 'bloquant',
  libelle: 'Aucun accès ouvert',
  symptome:
    'Personne ne peut ouvrir le portail pour cette entreprise : ni fiche Contact, ni identité externe, ni adresse de contact principal.',
  action:
    'Ouvrir un accès depuis cette page, ou renseigner l’e-mail du contact principal sur la fiche du tiers pour que l’invitation parte.',
};

/**
 * Diagnostic d'une ENTREPRISE.
 *
 * C'est le MEILLEUR état parmi ses interlocuteurs, non le pire : si une
 * personne se connecte normalement, l'entreprise est servie, même si l'un de
 * ses collègues a bloqué son mot de passe. Le nombre de personnes en difficulté
 * reste affiché à côté — c'est ce qui déclenche l'ouverture du détail.
 */
export function diagnostiquerTiers(personnes: AccesPortail[]): Diagnostic {
  if (!personnes.length) return AUCUN_ACCES;
  return personnes.reduce((meilleur, p) =>
    SEVERITE_ORDRE[p.diagnostic.severite] > SEVERITE_ORDRE[meilleur.diagnostic.severite] ? p : meilleur,
  ).diagnostic;
}

/** Date la plus récente d'une liste, format ISO. */
function plusRecente(dates: (string | undefined)[]): string | undefined {
  let retenue: string | undefined;
  let repere = -Infinity;
  for (const d of dates) {
    if (!d) continue;
    const ms = new Date(d).getTime();
    if (!Number.isNaN(ms) && ms > repere) {
      repere = ms;
      retenue = d;
    }
  }
  return retenue;
}

/**
 * Une ligne par tiers, plus une ligne pour les identités sans entreprise.
 *
 * @param acces vue par personne, produite par `agregerAcces`
 * @param tousLesTiers population de référence — la table `afb_tiers`
 */
export function agregerParTiers(acces: AccesPortail[], tousLesTiers: TiersMinimal[]): AccesTiers[] {
  const parTiers = new Map<string, AccesPortail[]>();
  const orphelines: AccesPortail[] = [];

  for (const a of acces) {
    if (!a.entreprises.length) {
      orphelines.push(a);
      continue;
    }
    for (const e of a.entreprises) {
      const liste = parTiers.get(e.id);
      if (liste) liste.push(a);
      else parTiers.set(e.id, [a]);
    }
  }

  const composer = (
    tiersId: string,
    nom: string,
    pays: string | undefined,
    personnes: AccesPortail[],
  ): AccesTiers => ({
    tiersId,
    nom,
    pays,
    // Les personnes en difficulté d'abord : c'est ce que le support cherche en
    // ouvrant le détail d'une entreprise.
    personnes: [...personnes].sort(
      (a, b) => SEVERITE_ORDRE[a.diagnostic.severite] - SEVERITE_ORDRE[b.diagnostic.severite],
    ),
    diagnostic: diagnostiquerTiers(personnes),
    accesPartage: personnes.some((p) => p.entreprises.length > 1),
    bloquees: personnes.filter((p) => p.diagnostic.severite === 'bloquant').length,
    derniereConnexion: plusRecente(personnes.map((p) => p.derniereConnexion)),
    tentatives: personnes.reduce((max, p) => Math.max(max, p.tentatives), 0),
  });

  const lignes = tousLesTiers
    .filter((t) => t.afb_tiersid)
    .map((t) =>
      composer(
        t.afb_tiersid,
        t.afb_nomdupartenaire || 'Entreprise sans nom',
        t.afb_pays,
        parTiers.get(t.afb_tiersid) ?? [],
      ),
    )
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));

  // Rangée à part, en tête : ces identités s'authentifient sans rien voir.
  if (orphelines.length) {
    lignes.unshift(composer(SANS_ENTREPRISE, 'Sans entreprise rattachée', undefined, orphelines));
  }

  return lignes;
}
