import { makeStyles } from '@fluentui/react-components';
import { Warning20Filled } from '@fluentui/react-icons';
import { mockSLAAlerts, mockSLAWeek } from '@/lib/mockData';

const useStyles = makeStyles({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: '14px',
    border: '1px solid #ECEAE4',
    boxShadow: '0 1px 2px rgba(15, 15, 15, 0.03)',
    overflow: 'hidden',
    transition: 'border-color 220ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 220ms',
    ':hover': {
      borderTopColor: '#E0DDD3', borderRightColor: '#E0DDD3', borderBottomColor: '#E0DDD3', borderLeftColor: '#E0DDD3',
      boxShadow: '0 2px 6px rgba(15, 15, 15, 0.04)',
    },
  },
  header: {
    padding: '20px 24px 16px',
    borderBottom: '1px solid #F4F2EC',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '4px',
  },
  title: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1A1A1A',
    letterSpacing: '-0.01em',
  },
  badge: {
    fontSize: '10.5px',
    backgroundColor: '#c8102e',
    color: '#FFFFFF',
    padding: '3px 10px',
    borderRadius: '999px',
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    boxShadow: '0 1px 2px rgba(200, 16, 46, 0.20)',
  },
  subtitle: {
    fontSize: '12px',
    color: '#737373',
    lineHeight: 1.4,
  },
  body: {
    padding: '18px 24px 22px',
  },
  chart: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: '8px',
    height: '120px',
    marginBottom: '18px',
  },
  barColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    transition: 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1)',
    ':hover': {
      transform: 'translateY(-2px)',
    },
  },
  barWrapper: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  bar: {
    width: '100%',
    maxWidth: '28px',
    background: 'linear-gradient(180deg, #d8324a 0%, #c8102e 100%)',
    borderRadius: '8px 8px 2px 2px',
    transition: 'height 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms',
    minHeight: '4px',
    boxShadow: '0 1px 3px rgba(200, 16, 46, 0.20)',
  },
  barLabel: {
    fontSize: '10.5px',
    fontWeight: 700,
    color: '#737373',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  callout: {
    background: 'linear-gradient(135deg, #FDF0F1 0%, #FDF5F5 100%)',
    borderRadius: '10px',
    border: '1px solid #FDE0E3',
    padding: '14px 16px',
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  },
  calloutIcon: {
    color: '#c8102e',
    flexShrink: 0,
    marginTop: '1px',
  },
  calloutText: {
    fontSize: '13px',
    color: '#1A1A1A',
    lineHeight: 1.5,
  },
  bold: {
    fontWeight: 700,
    color: '#8C040D',
  },
});

export function SLAAlerts() {
  const styles = useStyles();
  const maxCount = Math.max(...mockSLAWeek.map((d) => d.count), 1);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.title}>Alertes SLA</span>
          <span className={styles.badge}>{mockSLAAlerts.windowDays} jours</span>
        </div>
        <div className={styles.subtitle}>Documents arrivant à expiration</div>
      </div>
      <div className={styles.body}>
        <div className={styles.chart}>
          {mockSLAWeek.map((d) => {
            const height = (d.count / maxCount) * 100;
            return (
              <div key={d.jour} className={styles.barColumn} title={`${d.count} document${d.count > 1 ? 's' : ''}`}>
                <div className={styles.barWrapper}>
                  <div
                    className={styles.bar}
                    style={{
                      height: `${height}%`,
                      opacity: d.count === 0 ? 0.15 : 1,
                    }}
                  />
                </div>
                <span className={styles.barLabel}>{d.jour}</span>
              </div>
            );
          })}
        </div>
        <div className={styles.callout}>
          <Warning20Filled className={styles.calloutIcon} />
          <div className={styles.calloutText}>
            <span className={styles.bold}>{mockSLAAlerts.overdueCount} dossiers</span> dépassent le
            SLA réglementaire — relance automatique programmée.
          </div>
        </div>
      </div>
    </div>
  );
}
