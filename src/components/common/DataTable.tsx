import { Checkbox, makeStyles } from '@fluentui/react-components';
import {
  ArrowDown12Regular,
  ArrowSortDownLines16Regular,
  ArrowUp12Regular,
} from '@fluentui/react-icons';
import { useMemo, useState, type ReactNode } from 'react';
import { useT } from '@/i18n/i18n';

const useStyles = makeStyles({
  wrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: 0,
  },
  th: {
    textAlign: 'left',
    padding: '14px 26px',
    fontSize: '10.5px',
    fontWeight: 700,
    color: '#8A8A8A',
    textTransform: 'uppercase',
    letterSpacing: '0.09em',
    borderBottom: '1px solid #F1EFE9',
    backgroundColor: '#FCFBF9',
    whiteSpace: 'nowrap',
    position: 'sticky',
    top: 0,
    zIndex: 1,
  },
  thRight: {
    textAlign: 'right',
  },
  thCheck: {
    width: '44px',
    paddingRight: 0,
  },
  // L'en-tête triable est un vrai bouton : accessible au clavier et annoncé
  // comme actionnable, ce qu'un <th> muni d'un onClick ne serait pas.
  sortBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    background: 'none',
    border: 'none',
    padding: 0,
    margin: 0,
    font: 'inherit',
    color: 'inherit',
    textTransform: 'inherit',
    letterSpacing: 'inherit',
    cursor: 'pointer',
    ':hover': { color: 'var(--text)' },
    ':focus-visible': {
      outline: '2px solid var(--accent)',
      outlineOffset: '2px',
      borderRadius: '3px',
    },
  },
  sortBtnActive: {
    color: 'var(--accent)',
  },
  // L'indicateur de tri disponible reste discret tant que la colonne n'est pas
  // active : douze en-têtes fléchés à pleine opacité feraient un tableau bruyant.
  sortHint: {
    opacity: 0.25,
  },
  trSelected: {
    backgroundColor: 'var(--glass-red-bg)',
  },
  td: {
    padding: '17px 26px',
    fontSize: '13.5px',
    color: '#3A3A3A',
    borderBottom: '1px solid #F4F2EC',
    verticalAlign: 'middle',
  },
  tdRight: {
    textAlign: 'right',
  },
  tr: {
    transition: 'background-color 180ms cubic-bezier(0.16, 1, 0.3, 1)',
    ':hover': { backgroundColor: '#FAF9F6' },
    ':last-child > td': { borderBottom: 'none' },
  },
  trClickable: {
    cursor: 'pointer',
    position: 'relative',
    ':hover': {
      backgroundColor: '#FDF0F1',
    },
    ':active': {
      backgroundColor: '#FDE0E3',
    },
    ':focus-visible': {
      outline: 'none',
      backgroundColor: '#FDF0F1',
      boxShadow: 'inset 3px 0 0 var(--accent)',
    },
  },
  empty: {
    padding: '48px 24px',
    textAlign: 'center',
    color: '#737373',
    fontSize: '13px',
  },
});

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right';
  width?: string;
  /**
   * Valeur servant au tri. Fournir cette fonction rend la colonne triable ;
   * l'omettre la laisse figée. On ne trie pas sur le rendu : `render` renvoie du
   * JSX (badges, avatars), et trier des éléments React n'a pas de sens.
   */
  sortValue?: (row: T) => string | number | Date | null | undefined;
  /**
   * Texte pris en compte par la recherche globale. Même raison que pour le tri :
   * la barre de recherche ne peut pas fouiller dans du JSX.
   */
  searchValue?: (row: T) => string | null | undefined;
  /**
   * Ajoute une liste déroulante de filtre pour cette colonne. Les valeurs
   * proposées sont DÉDUITES des données affichées : pas de liste à maintenir en
   * parallèle, et aucune option morte qui ne correspondrait à aucune ligne.
   */
  filterable?: boolean;
  /**
   * Valeur servant au filtrage, si elle diffère de `searchValue`. Utile quand
   * l'affichage est enrichi (« Risque Low ») mais qu'on filtre sur « Low ».
   */
  filterValue?: (row: T) => string | null | undefined;
}

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  key: string;
  direction: SortDirection;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  /** Tri initial. Sans lui, l'ordre d'origine des lignes est conservé. */
  defaultSort?: SortState;
  /** Affiche la colonne de cases à cocher et active la sélection multiple. */
  selectable?: boolean;
  /** Clés des lignes sélectionnées — piloté par la page, qui décide des actions. */
  selectedKeys?: ReadonlySet<string>;
  onSelectionChange?: (keys: Set<string>) => void;
}

/**
 * Comparateur générique. Les valeurs absentes sont toujours reléguées en fin de
 * liste, quel que soit le sens du tri : une ligne sans date n'est ni « avant »
 * ni « après », elle est simplement non renseignée et l'utilisateur la cherche
 * en bas. Les chaînes se comparent en français, pour que les accents et la
 * casse ne créent pas d'ordre surprenant.
 */
function comparer(a: unknown, b: unknown): number {
  const videA = a === null || a === undefined || a === '';
  const videB = b === null || b === undefined || b === '';
  if (videA && videB) return 0;
  if (videA) return 1;
  if (videB) return -1;

  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'fr', { numeric: true, sensitivity: 'base' });
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = 'Aucun résultat',
  onRowClick,
  defaultSort,
  selectable = false,
  selectedKeys,
  onSelectionChange,
}: DataTableProps<T>) {
  const styles = useStyles();
  const { t } = useT();
  const [sort, setSort] = useState<SortState | null>(defaultSort ?? null);

  const colonneTriee = sort ? columns.find((c) => c.key === sort.key) : undefined;

  const lignes = useMemo(() => {
    if (!sort || !colonneTriee?.sortValue) return rows;
    const facteur = sort.direction === 'asc' ? 1 : -1;
    // Copie avant tri : muter le tableau reçu en props ferait diverger l'ordre
    // affiché de celui que la page croit détenir.
    return [...rows].sort(
      (a, b) => comparer(colonneTriee.sortValue!(a), colonneTriee.sortValue!(b)) * facteur,
    );
  }, [rows, sort, colonneTriee]);

  /** Trois états successifs : croissant, décroissant, puis retour à l'ordre
   *  d'origine — qui porte souvent un sens métier (file de priorité). */
  const basculerTri = (key: string) => {
    setSort((actuel) => {
      if (actuel?.key !== key) return { key, direction: 'asc' };
      if (actuel.direction === 'asc') return { key, direction: 'desc' };
      return null;
    });
  };

  const cles = lignes.map(rowKey);
  const selection = selectedKeys ?? new Set<string>();
  const toutSelectionne = cles.length > 0 && cles.every((k) => selection.has(k));
  const partiellement = !toutSelectionne && cles.some((k) => selection.has(k));

  const basculerTout = () => {
    if (!onSelectionChange) return;
    // On ne coche que les lignes VISIBLES : après un filtrage, « tout
    // sélectionner » ne doit pas embarquer des lignes que l'utilisateur ne voit pas.
    onSelectionChange(toutSelectionne ? new Set() : new Set(cles));
  };

  const basculerLigne = (cle: string) => {
    if (!onSelectionChange) return;
    const suivante = new Set(selection);
    if (suivante.has(cle)) suivante.delete(cle);
    else suivante.add(cle);
    onSelectionChange(suivante);
  };

  if (rows.length === 0) {
    return <div className={styles.empty}>{t(emptyMessage)}</div>;
  }

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {selectable && (
              <th className={`${styles.th} ${styles.thCheck}`}>
                <Checkbox
                  checked={partiellement ? 'mixed' : toutSelectionne}
                  onChange={basculerTout}
                  aria-label={t('Tout sélectionner')}
                />
              </th>
            )}
            {columns.map((c) => {
              const triable = Boolean(c.sortValue);
              const actif = sort?.key === c.key;
              return (
                <th
                  key={c.key}
                  className={`${styles.th} ${c.align === 'right' ? styles.thRight : ''}`}
                  style={c.width ? { width: c.width } : undefined}
                  aria-sort={actif ? (sort!.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  {triable ? (
                    <button
                      type="button"
                      className={`${styles.sortBtn} ${actif ? styles.sortBtnActive : ''}`}
                      onClick={() => basculerTri(c.key)}
                      title={t('Trier par cette colonne')}
                    >
                      {t(c.header)}
                      {actif ? (
                        sort!.direction === 'asc' ? (
                          <ArrowUp12Regular />
                        ) : (
                          <ArrowDown12Regular />
                        )
                      ) : (
                        <ArrowSortDownLines16Regular className={styles.sortHint} />
                      )}
                    </button>
                  ) : (
                    t(c.header)
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {lignes.map((row) => {
            const cle = rowKey(row);
            const coche = selection.has(cle);
            return (
              <tr
                key={cle}
                className={`${styles.tr} ${onRowClick ? styles.trClickable : ''} ${coche ? styles.trSelected : ''}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={onRowClick ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onRowClick(row);
                  }
                } : undefined}
              >
                {selectable && (
                  // La case ne doit pas ouvrir la ligne : cocher pour agir en lot
                  // et ouvrir le détail sont deux intentions distinctes.
                  <td className={styles.td} onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={coche}
                      onChange={() => basculerLigne(cle)}
                      aria-label={t('Sélectionner cette ligne')}
                    />
                  </td>
                )}
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`${styles.td} ${c.align === 'right' ? styles.tdRight : ''}`}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
