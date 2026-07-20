import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import { makeStyles } from '@fluentui/react-components';
import { mockProgression } from '@/lib/mockData';

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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
    gap: '12px',
  },
  titleBlock: { minWidth: 0 },
  title: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1A1A1A',
    letterSpacing: '-0.01em',
    marginBottom: '3px',
  },
  subtitle: {
    fontSize: '12px',
    color: '#737373',
    lineHeight: 1.4,
  },
  legend: {
    display: 'flex',
    gap: '14px',
    alignItems: 'center',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11.5px',
    color: '#525252',
    fontWeight: 500,
  },
  legendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
  },
});

export function ProgressionChart() {
  const styles = useStyles();
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <div className={styles.title}>Progression des dossiers</div>
          <div className={styles.subtitle}>Volume traité — 8 derniers mois</div>
        </div>
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={styles.legendDot} style={{ backgroundColor: '#c8102e' }} />
            Reçus
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendDot} style={{ backgroundColor: '#404040' }} />
            Traités
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={mockProgression} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
          <defs>
            <linearGradient id="recusGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c8102e" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#c8102e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="traitesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#404040" stopOpacity={0.10} />
              <stop offset="100%" stopColor="#404040" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 4" stroke="#F4F2EC" vertical={false} />
          <XAxis
            dataKey="mois"
            tick={{ fontSize: 11.5, fill: '#737373', fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11.5, fill: '#737373', fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #ECEAE4',
              borderRadius: '10px',
              fontSize: '12px',
              boxShadow: '0 8px 20px -4px rgba(15, 15, 15, 0.10)',
              padding: '10px 14px',
            }}
            labelStyle={{ fontWeight: 700, color: '#1A1A1A', marginBottom: '4px' }}
            cursor={{ stroke: '#ECEAE4', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Area
            type="monotone"
            dataKey="recus"
            stroke="#c8102e"
            strokeWidth={2.5}
            fill="url(#recusGradient)"
            name="Dossiers reçus"
            dot={{ r: 3.5, fill: '#c8102e', strokeWidth: 2, stroke: '#FFFFFF' }}
            activeDot={{ r: 5.5, fill: '#c8102e', strokeWidth: 3, stroke: '#FFFFFF' }}
          />
          <Area
            type="monotone"
            dataKey="traites"
            stroke="#404040"
            strokeWidth={2.5}
            fill="url(#traitesGradient)"
            name="Dossiers traités"
            dot={{ r: 3.5, fill: '#404040', strokeWidth: 2, stroke: '#FFFFFF' }}
            activeDot={{ r: 5.5, fill: '#404040', strokeWidth: 3, stroke: '#FFFFFF' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

