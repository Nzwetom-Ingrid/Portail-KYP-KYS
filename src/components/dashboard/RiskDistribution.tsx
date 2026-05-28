import { makeStyles } from '@fluentui/react-components';
import { mockRiskDistribution } from '@/lib/mockData';

const useStyles = makeStyles({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: '14px',
    padding: '24px 26px',
    border: '1px solid #ECEAE4',
    boxShadow: '0 1px 2px rgba(15, 15, 15, 0.03)',
    transition: 'border-color 220ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 220ms',
    ':hover': {
      borderTopColor: '#E0DDD3', borderRightColor: '#E0DDD3', borderBottomColor: '#E0DDD3', borderLeftColor: '#E0DDD3',
      boxShadow: '0 2px 6px rgba(15, 15, 15, 0.04)',
    },
  },
  title: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1A1A1A',
    letterSpacing: '-0.01em',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '12px',
    color: '#737373',
    marginBottom: '24px',
    lineHeight: 1.4,
  },
  row: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '18px',
    ':last-child': { marginBottom: 0 },
    cursor: 'pointer',
    padding: '4px 6px',
    margin: '-4px -6px 14px',
    borderRadius: '8px',
    transition: 'background-color 180ms cubic-bezier(0.16, 1, 0.3, 1)',
    ':hover': {
      backgroundColor: '#FAF9F6',
    },
  },
  rowHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
  },
  rowLabelGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  rowDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  rowLabel: {
    fontWeight: 600,
    color: '#1A1A1A',
    letterSpacing: '-0.005em',
  },
  rowValue: {
    fontWeight: 700,
    color: '#1A1A1A',
    fontVariantNumeric: 'tabular-nums',
  },
  rowPct: {
    fontWeight: 500,
    color: '#737373',
    fontSize: '12px',
    marginLeft: '6px',
  },
  bar: {
    height: '8px',
    backgroundColor: '#F4F2EC',
    borderRadius: '999px',
    overflow: 'hidden',
    position: 'relative',
  },
  barFill: {
    height: '100%',
    borderRadius: '999px',
    transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.3)',
  },
});

interface RiskDistributionProps {
  /** Comptes réels par niveau de risque. Par défaut : données mock. */
  counts?: { low: number; medium: number; high: number };
}

export function RiskDistribution({ counts }: RiskDistributionProps = {}) {
  const styles = useStyles();
  const low = counts ? { count: counts.low } : mockRiskDistribution.low;
  const medium = counts ? { count: counts.medium } : mockRiskDistribution.medium;
  const high = counts ? { count: counts.high } : mockRiskDistribution.high;
  const total = low.count + medium.count + high.count || 1;

  const rows = [
    { label: 'Low',    count: low.count,    color: '#15803D', gradient: 'linear-gradient(90deg, #15803D 0%, #22A856 100%)' },
    { label: 'Medium', count: medium.count, color: '#B45309', gradient: 'linear-gradient(90deg, #B45309 0%, #D97706 100%)' },
    { label: 'High',   count: high.count,   color: '#C20012', gradient: 'linear-gradient(90deg, #C20012 0%, #ED4C58 100%)' },
  ];

  return (
    <div className={styles.card}>
      <div className={styles.title}>Indicateurs de risque</div>
      <div className={styles.subtitle}>Distribution des scores · {total} dossiers actifs</div>

      {rows.map(row => {
        const pct = Math.round((row.count / total) * 100);
        return (
          <div key={row.label} className={styles.row} role="button" tabIndex={0}>
            <div className={styles.rowHeader}>
              <span className={styles.rowLabelGroup}>
                <span className={styles.rowDot} style={{ backgroundColor: row.color }} />
                <span className={styles.rowLabel}>{row.label}</span>
              </span>
              <span>
                <span className={styles.rowValue}>{row.count}</span>
                <span className={styles.rowPct}>· {pct}%</span>
              </span>
            </div>
            <div className={styles.bar}>
              <div
                className={styles.barFill}
                style={{ width: `${pct}%`, background: row.gradient }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
