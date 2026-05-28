import { makeStyles, Input, Dropdown, Option } from '@fluentui/react-components';
import { Search20Regular } from '@fluentui/react-icons';
import type { ReactNode } from 'react';

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
      borderTopColor: 'rgba(227, 6, 19, 0.16)', borderRightColor: 'rgba(227, 6, 19, 0.16)', borderBottomColor: 'rgba(227, 6, 19, 0.16)', borderLeftColor: 'rgba(227, 6, 19, 0.16)',
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
  value: string;
  onChange: (value: string) => void;
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
  return (
    <div className={styles.bar}>
      {onSearchChange !== undefined && (
        <Input
          className={styles.searchField}
          contentBefore={<Search20Regular style={{ color: '#737373' }} />}
          placeholder={searchPlaceholder}
          value={search ?? ''}
          onChange={(_, data) => onSearchChange(data.value)}
        />
      )}
      <div className={styles.filterGroup}>
        {filters.map((f) => (
          <Dropdown
            key={f.key}
            className={styles.dropdown}
            placeholder={f.label}
            value={f.options.find((o) => o.value === f.value)?.label ?? f.label}
            selectedOptions={[f.value]}
            onOptionSelect={(_, data) => f.onChange(data.optionValue ?? '')}
          >
            {f.options.map((o) => (
              <Option key={o.value} value={o.value}>
                {o.label}
              </Option>
            ))}
          </Dropdown>
        ))}
      </div>
      {trailing && <div className={styles.trailing}>{trailing}</div>}
    </div>
  );
}
