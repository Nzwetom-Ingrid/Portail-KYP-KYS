/**
 * Recherche et filtres de tableau, dérivés de la définition des colonnes.
 *
 * Chaque page déclarait jusqu'ici ses propres états de filtre, sa propre liste
 * d'options et sa propre expression de recherche — treize fois, avec treize
 * comportements légèrement différents. Ce hook fait le travail à partir de ce
 * que les colonnes déclarent déjà : marquer une colonne `filterable` suffit à
 * lui donner une liste déroulante, et `searchValue` à la rendre cherchable.
 *
 * Les options de filtre sont DÉDUITES des données affichées. Conséquence utile :
 * aucune option morte, et une valeur nouvelle apparue en base est proposée sans
 * qu'on ait à toucher au code.
 */
import { useMemo, useState } from 'react';
import type { Column } from '@/components/common/DataTable';
import type { FilterConfig } from '@/components/common/FilterBar';

/** Minuscules sans accents : « Société » et « societe » doivent se rencontrer. */
function normaliser(valeur: unknown): string {
  return String(valeur ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Valeur retenue pour filtrer une ligne sur une colonne donnée. */
function valeurFiltre<T>(colonne: Column<T>, ligne: T): string {
  const brut = colonne.filterValue?.(ligne) ?? colonne.searchValue?.(ligne);
  return String(brut ?? '').trim();
}

export interface TableFilters<T> {
  /** Texte de la barre de recherche. */
  search: string;
  setSearch: (valeur: string) => void;
  /** Listes déroulantes prêtes à passer à `<FilterBar filters={...} />`. */
  filterConfigs: FilterConfig[];
  /** Lignes après recherche et filtres. */
  rows: T[];
  /** true si au moins un critère est actif — pour proposer « tout effacer ». */
  actif: boolean;
  reset: () => void;
/** Valeurs retenues sur une colonne — pour refléter l'état ailleurs dans la page. */
  getFilter: (key: string) => string[];
  /** true si cette valeur précise est retenue (état actif d'une carte KPI). */
  hasFilter: (key: string, valeur: string) => boolean;
  /** Remplace la sélection d'une colonne par cette seule valeur. */
  setFilter: (key: string, valeur: string) => void;
  /** Ajoute la valeur à la sélection, ou l'en retire si elle y est déjà. */
  toggleFilter: (key: string, valeur: string) => void;
}

export function useTableFilters<T>(
  toutesLesLignes: T[],
  colonnes: Column<T>[],
): TableFilters<T> {
  const [search, setSearch] = useState('');
  // Une colonne peut porter PLUSIEURS valeurs retenues, combinees en « OU ».
  const [valeurs, setValeurs] = useState<Record<string, string[]>>({});

  const colonnesFiltrables = useMemo(
    () => colonnes.filter((c) => c.filterable),
    [colonnes],
  );

  const filterConfigs = useMemo<FilterConfig[]>(() => {
    return colonnesFiltrables.map((colonne) => {
      // Valeurs distinctes réellement présentes, triées pour l'œil humain.
      const distinctes = [
        ...new Set(
          toutesLesLignes.map((ligne) => valeurFiltre(colonne, ligne)).filter((v) => v !== '' && v !== '—'),
        ),
      ].sort((a, b) => a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' }));

      return {
        key: colonne.key,
        label: colonne.header,
        values: valeurs[colonne.key] ?? [],
        onValuesChange: (nouvelles: string[]) =>
          setValeurs((prec) => ({ ...prec, [colonne.key]: nouvelles })),
        // Pas d'option « Tous » : en multi-selection, ne rien cocher signifie
        // deja « tout », et une telle option cohabiterait mal avec les autres.
        options: distinctes.map((v) => ({ label: v, value: v })),
      };
    });
  }, [colonnesFiltrables, toutesLesLignes, valeurs]);

  const rows = useMemo(() => {
    const termes = normaliser(search).trim().split(/\s+/).filter(Boolean);

    return toutesLesLignes.filter((ligne) => {
      // Filtres : tous doivent être satisfaits (ET), un filtre vide ne filtre rien.
      for (const colonne of colonnesFiltrables) {
        const attendues = valeurs[colonne.key];
        if (attendues?.length && !attendues.includes(valeurFiltre(colonne, ligne))) return false;
      }
      if (termes.length === 0) return true;

      // Recherche : tous les termes doivent se retrouver, dans n'importe quelle
      // colonne cherchable et dans n'importe quel ordre.
      const botteDeFoin = normaliser(
        colonnes
          .map((c) => c.searchValue?.(ligne))
          .filter((v) => v !== null && v !== undefined && v !== '')
          .join(' '),
      );
      return termes.every((terme) => botteDeFoin.includes(terme));
    });
  }, [toutesLesLignes, colonnes, colonnesFiltrables, valeurs, search]);

  const actif = search.trim() !== '' || Object.values(valeurs).some((v) => v.length > 0);

  const setFilter = (key: string, valeur: string) =>
    setValeurs((prec) => ({ ...prec, [key]: valeur ? [valeur] : [] }));

  return {
    search,
    setSearch,
    filterConfigs,
    rows,
    actif,
    reset: () => {
      setSearch('');
      setValeurs({});
    },
    getFilter: (key) => valeurs[key] ?? [],
    hasFilter: (key, valeur) => (valeurs[key] ?? []).includes(valeur),
    setFilter,
    toggleFilter: (key, valeur) =>
      setValeurs((prec) => {
        const courant = prec[key] ?? [];
        return {
          ...prec,
          [key]: courant.includes(valeur) ? courant.filter((v) => v !== valeur) : [...courant, valeur],
        };
      }),
  };
}
