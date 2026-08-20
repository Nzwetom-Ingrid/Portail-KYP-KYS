import { makeStyles, Input, Dropdown, Option } from '@fluentui/react-components';
import { Search20Regular, Search16Regular } from '@fluentui/react-icons';
import { useState, type ReactNode } from 'react';
import { useT } from '@/i18n/i18n';
import { normaliser } from '@/lib/tables/useTableFilters';

/**
 * Nombre d'options à partir duquel une liste déroulante reçoit son propre champ
 * de recherche. En dessous, tout tient à l'écran et le champ serait du bruit ;
 * au-delà — la liste des chargés en compte une quinzaine — chercher à l'œil
 * devient pénible.
 */
const SEUIL_RECHERCHE_OPTIONS = 8;

const useStyles = makeStyles({
  bar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    alignItems: 'center',
    padding: '16px 22px',
    backgroundColor: '#FFFFFF',
    border: '1px solid rgba(20, 20, 20, 0.05)',
    borderRadius: '18px',
    boxShadow: '0 1px 3px rgba(20, 20, 20, 0.04), 0 12px 32px -20px rgba(20, 20, 20, 0.12)',
    marginBottom: '20px',
    transition: 'border-color 220ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 220ms',
    ':focus-within': {
      borderTopColor: 'rgba(200, 16, 46, 0.16)', borderRightColor: 'rgba(200, 16, 46, 0.16)', borderBottomColor: 'rgba(200, 16, 46, 0.16)', borderLeftColor: 'rgba(200, 16, 46, 0.16)',
      boxShadow: '0 2px 6px rgba(20, 20, 20, 0.05), 0 16px 40px -22px rgba(20, 20, 20, 0.16)',
    },
  },
  searchField: {
    flex: 1,
    minWidth: '260px',
  },
  filterGroup: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  dropdown: {
    minWidth: '170px',
  },
  // Le champ reste visible pendant qu'on fait défiler une longue liste.
  rechercheOptions: {
    width: 'calc(100% - 8px)',
    margin: '4px',
    position: 'sticky',
    top: 0,
    zIndex: 1,
  },
  aucuneOption: {
    padding: '10px 12px',
    fontSize: '12.5px',
    color: 'var(--text-muted)',
  },
  trailing: {
    marginLeft: 'auto',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
});

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
  /**
   * Valeurs retenues. Plusieurs valeurs se combinent en « OU » : cocher
   * « Validé » et « Rejeté » montre les deux, ce qu'un filtre à choix unique
   * obligeait à faire en deux passes. Tableau vide = aucun filtre.
   */
  values: string[];
  onValuesChange: (values: string[]) => void;
}

interface FilterBarProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  trailing?: ReactNode;
}

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Rechercher…',
  filters = [],
  trailing,
}: FilterBarProps) {
  const styles = useStyles();
  const { t } = useT();
  // Une recherche par liste déroulante, conservée tant que la barre est montée.
  const [recherches, setRecherches] = useState<Record<string, string>>({});
  return (
    <div className={styles.bar}>
      {onSearchChange !== undefined && (
        <Input
          className={styles.searchField}
          contentBefore={<Search20Regular style={{ color: '#737373' }} />}
          placeholder={t(searchPlaceholder)}
          value={search ?? ''}
          onChange={(_, data) => onSearchChange(data.value)}
        />
      )}
      <div className={styles.filterGroup}>
        {filters.map((f) => {
          const recherche = recherches[f.key] ?? '';
          const q = normaliser(recherche).trim();
          const visibles = q
            ? f.options.filter((o) => normaliser(o.label).includes(q))
            : f.options;
          // Libellé du champ : le nom seul quand rien n'est coché, la valeur
          // quand il n'y en a qu'une, et un décompte au-delà — afficher trois
          // valeurs concaténées deviendrait illisible dans une liste étroite.
          const libelle =
            f.values.length === 0
              ? t(f.label)
              : f.values.length === 1
                ? t(f.options.find((o) => o.value === f.values[0])?.label ?? f.values[0])
                : `${t(f.label)} · ${f.values.length}`;
          return (
            <Dropdown
              key={f.key}
              multiselect
              className={styles.dropdown}
              placeholder={t(f.label)}
              value={libelle}
              selectedOptions={f.values}
              onOptionSelect={(_, data) => f.onValuesChange(data.selectedOptions)}
            >
              {f.options.length > SEUIL_RECHERCHE_OPTIONS && (
                <Input
                  className={styles.rechercheOptions}
                  size="small"
                  contentBefore={<Search16Regular />}
                  placeholder={t('Filtrer la liste…')}
                  value={recherche}
                  onChange={(_, data) =>
                    setRecherches((prec) => ({ ...prec, [f.key]: data.value }))
                  }
                  // Sans cela, les touches saisies pilotent la navigation de la
                  // liste déroulante au lieu d'alimenter le champ.
                  onKeyDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              {visibles.map((o) => (
                <Option key={o.value} value={o.value} text={t(o.label)}>
                  {t(o.label)}
                </Option>
              ))}
              {visibles.length === 0 && (
                <div className={styles.aucuneOption}>{t('Aucune valeur ne correspond.')}</div>
              )}
            </Dropdown>
          );
        })}
      </div>
      {trailing && <div className={styles.trailing}>{trailing}</div>}
    </div>
  );
}
