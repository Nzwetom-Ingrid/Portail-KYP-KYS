import { makeStyles, Input, Dropdown, Option } from '@fluentui/react-components';
import { Search20Regular } from '@fluentui/react-icons';
import type { ReactNode } from 'react';
import { useT } from '@/i18n/i18n';

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
              {f.options.map((o) => (
                <Option key={o.value} value={o.value} text={t(o.label)}>
                  {t(o.label)}
                </Option>
              ))}
            </Dropdown>
          );
        })}
      </div>
      {trailing && <div className={styles.trailing}>{trailing}</div>}
    </div>
  );
}
