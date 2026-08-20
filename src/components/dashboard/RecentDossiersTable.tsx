import { Link } from 'react-router-dom';
import { makeStyles } from '@fluentui/react-components';
import { ArrowRight16Regular } from '@fluentui/react-icons';
import { mockDossiersRecents, type Dossier } from '@/lib/mockData';
import { RisqueBadge, StatutBadge, SLABadge } from '@/components/common/StatusBadge';

const useStyles = makeStyles({
  card: {
    backgroundColor: 'var(--glass-bg)',
    borderRadius: '14px',
    border: '1px solid var(--glass-border)',
    boxShadow: '0 1px 2px rgba(15, 15, 15, 0.03)',
    overflow: 'hidden',
    transition: 'border-color 220ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 220ms',
    ':hover': {
      borderTopColor: 'var(--glass-border)', borderRightColor: 'var(--glass-border)', borderBottomColor: 'var(--glass-border)', borderLeftColor: 'var(--glass-border)',
      boxShadow: '0 2px 6px rgba(15, 15, 15, 0.04)',
    },
  },
  header: {
    padding: '20px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--glass-border)',
  },
  title: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--text)',
    letterSpacing: '-0.01em',
  },
  viewAll: {
    fontSize: '12.5px',
    color: 'var(--accent)',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontWeight: 600,
    padding: '5px 10px',
    borderRadius: '8px',
    transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)',
    ':hover': {
      backgroundColor: 'var(--glass-red-bg)',
      gap: '6px',
    },
  },
  table: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: 0,
  },
  th: {
    textAlign: 'left',
    padding: '12px 24px',
    fontSize: '10.5px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    borderBottom: '1px solid var(--glass-border)',
    backgroundColor: 'var(--bg)',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '14px 24px',
    fontSize: '13px',
    color: 'var(--text-secondary)',
    borderBottom: '1px solid var(--glass-border)',
    verticalAlign: 'middle',
  },
  tr: {
    transition: 'background-color 180ms cubic-bezier(0.16, 1, 0.3, 1)',
    cursor: 'pointer',
    ':hover': { backgroundColor: 'var(--glass-red-bg)' },
    ':last-child > td': { borderBottom: 'none' },
    ':focus-visible': {
      outline: 'none',
      backgroundColor: 'var(--glass-red-bg)',
      boxShadow: 'inset 3px 0 0 var(--accent)',
    },
  },
  entiteName: {
    fontWeight: 600,
    color: 'var(--text)',
    letterSpacing: '-0.005em',
  },
  entiteRef: {
    fontSize: '10.5px',
    color: 'var(--text-muted)',
    fontFamily: '"JetBrains Mono", monospace',
    fontWeight: 500,
    marginTop: '2px',
    letterSpacing: '0.02em',
  },
});

interface RecentDossiersTableProps {
  onRowClick?: (row: Dossier) => void;
  /** Lignes à afficher. Par défaut, les données mock (fallback hors-ligne). */
  rows?: Dossier[];
}

export function RecentDossiersTable({ onRowClick, rows }: RecentDossiersTableProps) {
  const styles = useStyles();
  const data = rows ?? mockDossiersRecents;
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>Dossiers récents</span>
        <Link to="/dossiers" className={styles.viewAll}>
          Voir tout <ArrowRight16Regular />
        </Link>
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>Entité</th>
            <th className={styles.th}>Type</th>
            <th className={styles.th}>Risque</th>
            <th className={styles.th}>Statut</th>
            <th className={styles.th}>SLA</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr
              key={d.id}
              className={styles.tr}
              onClick={onRowClick ? () => onRowClick(d) : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={onRowClick ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onRowClick(d);
                }
              } : undefined}
            >
              <td className={styles.td}>
                <div className={styles.entiteName}>{d.entite}</div>
                <div className={styles.entiteRef}>{d.id}</div>
              </td>
              <td className={styles.td}>{d.type}</td>
              <td className={styles.td}><RisqueBadge risque={d.risque} /></td>
              <td className={styles.td}><StatutBadge statut={d.statut} /></td>
              <td className={styles.td}><SLABadge value={d.sla} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
