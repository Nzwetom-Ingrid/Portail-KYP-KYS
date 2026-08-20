/**
 * Série mensuelle « dossiers reçus / traités » du tableau de bord.
 *
 * Le graphique affichait jusqu'ici une série écrite en dur dans les données de
 * démonstration : elle annonçait 270 dossiers reçus en mai alors que la base
 * n'en comptait que 46 au total. Un tableau de bord qui invente ses chiffres
 * est pire qu'un tableau de bord vide — on y prend des décisions.
 *
 * Fonction PURE : c'est une règle de calcul, elle doit se tester seule.
 */

/** Mois abrégés, indexés comme getMonth() : 0 = janvier. */
const MOIS_COURTS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

export interface PointProgression {
  mois: string;
  recus: number;
  traites: number;
}

/** Ce que la fonction lit d'un dossier — rien de plus. */
export interface DossierDate {
  /** Date de soumission par le tiers ; à défaut, date de création. */
  afb_datedesoumission?: string | null;
  createdon?: string | null;
  /** Date à laquelle la conformité a rendu sa décision. */
  afb_datededernierevalidation?: string | null;
}

/** Clé « année-mois », pour regrouper sans confondre mai 2025 et mai 2026. */
function cleMois(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function dateValide(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Construit la série des `nbMois` derniers mois, le mois courant inclus.
 *
 * « Reçus » compte les dossiers soumis dans le mois, « traités » ceux dont la
 * conformité a rendu sa décision dans le mois. Un même dossier peut donc être
 * reçu en mars et traité en avril : ce sont bien deux événements distincts, et
 * c'est précisément ce que le graphique doit montrer.
 *
 * @param maintenant injectable pour rendre les tests déterministes.
 */
export function construireProgression(
  dossiers: DossierDate[],
  nbMois = 8,
  maintenant: Date = new Date(),
): PointProgression[] {
  const recusParMois = new Map<string, number>();
  const traitesParMois = new Map<string, number>();

  for (const d of dossiers) {
    const recu = dateValide(d.afb_datedesoumission) ?? dateValide(d.createdon);
    if (recu) recusParMois.set(cleMois(recu), (recusParMois.get(cleMois(recu)) ?? 0) + 1);

    const traite = dateValide(d.afb_datededernierevalidation);
    if (traite) traitesParMois.set(cleMois(traite), (traitesParMois.get(cleMois(traite)) ?? 0) + 1);
  }

  const serie: PointProgression[] = [];
  for (let i = nbMois - 1; i >= 0; i--) {
    // Le 1er du mois évite le décalage classique : le 31 mars moins un mois
    // donnerait le 3 mars, et le mois de février serait sauté.
    const d = new Date(maintenant.getFullYear(), maintenant.getMonth() - i, 1);
    const cle = cleMois(d);
    serie.push({
      mois: MOIS_COURTS[d.getMonth()],
      recus: recusParMois.get(cle) ?? 0,
      traites: traitesParMois.get(cle) ?? 0,
    });
  }
  return serie;
}
