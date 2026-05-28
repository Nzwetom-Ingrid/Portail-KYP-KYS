import { makeStyles } from '@fluentui/react-components';
import type { ReactNode } from 'react';

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
      boxShadow: 'inset 3px 0 0 #C20012',
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
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({ columns, rows, rowKey, emptyMessage = 'Aucun résultat', onRowClick }: DataTableProps<T>) {
  const styles = useStyles();
  if (rows.length === 0) {
    return <div className={styles.empty}>{emptyMessage}</div>;
  }
  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={`${styles.th} ${c.align === 'right' ? styles.thRight : ''}`}
                style={c.width ? { width: c.width } : undefined}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className={`${styles.tr} ${onRowClick ? styles.trClickable : ''}`}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={onRowClick ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onRowClick(row);
                }
              } : undefined}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`${styles.td} ${c.align === 'right' ? styles.tdRight : ''}`}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
