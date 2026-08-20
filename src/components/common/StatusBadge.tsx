import { makeStyles, mergeClasses } from '@fluentui/react-components';
import { useT } from '@/i18n/i18n';

type Risque = 'Low' | 'Medium' | 'High';
type Statut = 'Brouillon' | 'En revue' | 'Validé' | 'Expiré' | 'Rejeté' | 'Actif' | 'Inactif';

const useBadgeStyles = makeStyles({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 11px',
    fontSize: '11px',
    fontWeight: 600,
    borderRadius: '999px',
    letterSpacing: '0.01em',
    lineHeight: 1.3,
    whiteSpace: 'nowrap',
    border: '1px solid transparent',
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  // Risque
  riskLow: {
    backgroundColor: 'var(--success-bg)',
    color: '#0F5E2D',
    borderTopColor: '#C7E9D2', borderRightColor: '#C7E9D2', borderBottomColor: '#C7E9D2', borderLeftColor: '#C7E9D2',
  },
  riskMedium: {
    backgroundColor: 'var(--warning-bg)',
    color: '#854020',
    borderTopColor: '#FAEDC5', borderRightColor: '#FAEDC5', borderBottomColor: '#FAEDC5', borderLeftColor: '#FAEDC5',
  },
  riskHigh: {
    backgroundColor: 'var(--glass-red-bg)',
    color: '#8C040D',
    borderTopColor: '#FDE0E3', borderRightColor: '#FDE0E3', borderBottomColor: '#FDE0E3', borderLeftColor: '#FDE0E3',
  },
  // Statut
  statBrouillon: {
    backgroundColor: 'var(--bg)',
    color: 'var(--text-secondary)',
    borderTopColor: 'var(--glass-border)', borderRightColor: 'var(--glass-border)', borderBottomColor: 'var(--glass-border)', borderLeftColor: 'var(--glass-border)',
  },
  statRevue: {
    backgroundColor: 'var(--warning-bg)',
    color: '#854020',
    borderTopColor: '#FAEDC5', borderRightColor: '#FAEDC5', borderBottomColor: '#FAEDC5', borderLeftColor: '#FAEDC5',
  },
  statValide: {
    backgroundColor: 'var(--success-bg)',
    color: '#0F5E2D',
    borderTopColor: '#C7E9D2', borderRightColor: '#C7E9D2', borderBottomColor: '#C7E9D2', borderLeftColor: '#C7E9D2',
  },
  statExpire: {
    backgroundColor: 'var(--glass-red-bg)',
    color: '#8C040D',
    borderTopColor: '#FDE0E3', borderRightColor: '#FDE0E3', borderBottomColor: '#FDE0E3', borderLeftColor: '#FDE0E3',
  },
  statRejete: {
    backgroundColor: 'var(--glass-red-bg)',
    color: '#8C040D',
    borderTopColor: '#FDE0E3', borderRightColor: '#FDE0E3', borderBottomColor: '#FDE0E3', borderLeftColor: '#FDE0E3',
  },
  statActif: {
    backgroundColor: 'var(--success-bg)',
    color: '#0F5E2D',
    borderTopColor: '#C7E9D2', borderRightColor: '#C7E9D2', borderBottomColor: '#C7E9D2', borderLeftColor: '#C7E9D2',
  },
  statInactif: {
    backgroundColor: 'var(--bg)',
    color: 'var(--text-secondary)',
    borderTopColor: 'var(--glass-border)', borderRightColor: 'var(--glass-border)', borderBottomColor: 'var(--glass-border)', borderLeftColor: 'var(--glass-border)',
  },
});

export function RisqueBadge({ risque }: { risque: Risque }) {
  const styles = useBadgeStyles();
  const { t } = useT();
  const variant =
    risque === 'Low' ? styles.riskLow
    : risque === 'Medium' ? styles.riskMedium
    : styles.riskHigh;
  const dotColor =
    risque === 'Low' ? '#15803D'
    : risque === 'Medium' ? 'var(--warning)'
    : 'var(--accent)';
  return (
    <span className={mergeClasses(styles.base, variant)}>
      <span className={styles.dot} style={{ backgroundColor: dotColor }} />
      {t('Risque')} {risque}
    </span>
  );
}

export function StatutBadge({ statut }: { statut: Statut }) {
  const styles = useBadgeStyles();
  const { t } = useT();
  const variantMap = {
    Brouillon: styles.statBrouillon,
    'En revue': styles.statRevue,
    Validé: styles.statValide,
    Expiré: styles.statExpire,
    Rejeté: styles.statRejete,
    Actif: styles.statActif,
    Inactif: styles.statInactif,
  } as const;
  return <span className={mergeClasses(styles.base, variantMap[statut])}>{t(statut)}</span>;
}

export function SLABadge({ value }: { value: string }) {
  const { t } = useT();
  if (value === '—' || !value) {
    return <span style={{ color: '#C8C8C8' }}>—</span>;
  }
  const isOverdue = value === 'Dépassé' || value.startsWith('-');
  const isClose = /^J-?[1-3]$/.test(value);
  const color = isOverdue ? 'var(--accent)' : isClose ? 'var(--warning)' : '#404040';
  const bg = isOverdue ? '#FDF0F1' : isClose ? '#FDF6E3' : 'transparent';
  const border = isOverdue ? '#FDE0E3' : isClose ? '#FAEDC5' : 'transparent';
  const weight = isOverdue ? 700 : isClose ? 600 : 500;
  if (isOverdue || isClose) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '3px 9px',
          fontSize: '11px',
          fontWeight: weight,
          color,
          backgroundColor: bg,
          border: `1px solid ${border}`,
          borderRadius: '999px',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {t(value)}
      </span>
    );
  }
  return <span style={{ color, fontWeight: weight, fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>{t(value)}</span>;
}
