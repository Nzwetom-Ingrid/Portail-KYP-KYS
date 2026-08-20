import { makeStyles, mergeClasses } from '@fluentui/react-components';
import type { ReactNode } from 'react';
import {
  ArrowTrending20Filled,
  Warning20Filled,
  ArrowRight16Regular,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  card: {
    position: 'relative',
    backgroundColor: 'var(--glass-bg)',
    borderRadius: '20px',
    padding: '24px 24px 20px',
    border: '1px solid var(--glass-border)',
    boxShadow: '0 1px 3px rgba(20, 20, 20, 0.04), 0 12px 32px -18px rgba(20, 20, 20, 0.14)',
    transition: 'transform 280ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 280ms, border-color 280ms',
    cursor: 'pointer',
    overflow: 'hidden',
    minHeight: '138px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    ':hover': {
      transform: 'translateY(-3px)',
      boxShadow: '0 4px 14px rgba(20, 20, 20, 0.06), 0 28px 60px -26px rgba(20, 20, 20, 0.22)',
      borderTopColor: 'rgba(200, 16, 46, 0.14)', borderRightColor: 'rgba(200, 16, 46, 0.14)', borderBottomColor: 'rgba(200, 16, 46, 0.14)', borderLeftColor: 'rgba(200, 16, 46, 0.14)',
    },
    ':active': {
      transform: 'translateY(0)',
    },
    ':focus-visible': {
      outline: 'none',
      boxShadow: '0 0 0 3px rgba(200, 16, 46, 0.16), 0 4px 12px -2px rgba(15, 15, 15, 0.06)',
    },
    '::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '3px',
      backgroundColor: 'transparent',
      transition: 'background-color 280ms',
    },
    ':hover::after': {
      opacity: 1,
    },
    '::after': {
      content: '""',
      position: 'absolute',
      top: '16px',
      right: '16px',
      width: '22px',
      height: '22px',
      borderRadius: '999px',
      backgroundColor: 'var(--bg)',
      backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'14\' height=\'14\' viewBox=\'0 0 16 16\' fill=\'none\'><path d=\'M6 3l5 5-5 5\' stroke=\'%23737373\' stroke-width=\'1.6\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/></svg>")',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      opacity: 0,
      transition: 'opacity 280ms cubic-bezier(0.16, 1, 0.3, 1)',
    },
  },
  cardCritical: {
    '::before': {
      backgroundColor: 'var(--accent)',
    },
  },
  cardWarning: {
    '::before': {
      backgroundColor: 'var(--warning)',
    },
  },
  cardPositive: {
    '::before': {
      backgroundColor: '#15803D',
    },
  },
  label: {
    fontSize: '11.5px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '8px',
  },
  value: {
    fontSize: '40px',
    fontWeight: 700,
    color: 'var(--text)',
    lineHeight: 1,
    letterSpacing: '-0.03em',
    marginBottom: '6px',
    fontVariantNumeric: 'tabular-nums',
  },
  valueCritical: {
    color: 'var(--accent)',
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginTop: 'auto',
  },
  metaPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    borderRadius: '999px',
    fontSize: '11.5px',
    fontWeight: 600,
  },
  metaPositive: {
    color: 'var(--success)',
    backgroundColor: 'var(--success-bg)',
  },
  metaWarning: {
    color: 'var(--warning)',
    backgroundColor: 'var(--warning-bg)',
  },
  metaCritical: {
    color: 'var(--danger)',
    backgroundColor: 'var(--glass-red-bg)',
  },
  period: {
    color: 'var(--text-muted)',
    fontSize: '11.5px',
  },
  cta: {
    position: 'absolute',
    bottom: '12px',
    right: '12px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--accent)',
    opacity: 0,
    transform: 'translateX(-4px)',
    transition: 'opacity 240ms cubic-bezier(0.16, 1, 0.3, 1), transform 240ms cubic-bezier(0.16, 1, 0.3, 1)',
  },
});

interface KPICardProps {
  label: string;
  value: number | string;
  evolution: string;
  period: string;
  variant?: 'default' | 'critical' | 'positive' | 'warning';
  icon?: ReactNode;
  onClick?: () => void;
}

export function KPICard({ label, value, evolution, period, variant = 'default', onClick }: KPICardProps) {
  const styles = useStyles();
  const variantClass =
    variant === 'critical' ? styles.cardCritical
    : variant === 'warning' ? styles.cardWarning
    : variant === 'positive' ? styles.cardPositive
    : '';

  const metaPillClass =
    variant === 'positive' ? styles.metaPositive
    : variant === 'warning' ? styles.metaWarning
    : variant === 'critical' ? styles.metaCritical
    : '';

  const TrendIcon =
    variant === 'positive' ? ArrowTrending20Filled
    : variant === 'critical' ? Warning20Filled
    : variant === 'warning' ? Warning20Filled
    : ArrowTrending20Filled;

  return (
    <div
      className={mergeClasses(styles.card, variantClass)}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className={styles.label}>{label}</div>
      <div className={mergeClasses(styles.value, variant === 'critical' && styles.valueCritical)}>
        {value}
      </div>
      <div className={styles.meta}>
        {metaPillClass && (
          <span className={mergeClasses(styles.metaPill, metaPillClass)}>
            <TrendIcon style={{ width: 13, height: 13 }} />
            {evolution}
          </span>
        )}
        {!metaPillClass && <span>{evolution}</span>}
        <span className={styles.period}>· {period}</span>
      </div>
      {onClick && (
        <span className={styles.cta}>
          Détails <ArrowRight16Regular />
        </span>
      )}
    </div>
  );
}
