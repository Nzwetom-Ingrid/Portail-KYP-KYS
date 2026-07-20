import { makeStyles, mergeClasses } from '@fluentui/react-components';
import type { ReactNode } from 'react';
import { useT } from '@/i18n/i18n';

const useStyles = makeStyles({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: '20px',
    border: '1px solid rgba(20, 20, 20, 0.05)',
    boxShadow: '0 1px 3px rgba(20, 20, 20, 0.04), 0 12px 32px -18px rgba(20, 20, 20, 0.14)',
    overflow: 'hidden',
    transition: 'border-color 260ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 260ms, transform 260ms',
    ':hover': {
      boxShadow: '0 2px 6px rgba(20, 20, 20, 0.05), 0 18px 44px -22px rgba(20, 20, 20, 0.18)',
    },
  },
  interactive: {
    cursor: 'pointer',
    ':hover': {
      borderTopColor: 'rgba(200, 16, 46, 0.16)', borderRightColor: 'rgba(200, 16, 46, 0.16)', borderBottomColor: 'rgba(200, 16, 46, 0.16)', borderLeftColor: 'rgba(200, 16, 46, 0.16)',
      boxShadow: '0 4px 14px rgba(20, 20, 20, 0.06), 0 28px 60px -26px rgba(20, 20, 20, 0.24)',
      transform: 'translateY(-2px)',
    },
    ':active': {
      transform: 'translateY(0)',
    },
  },
  header: {
    padding: '20px 26px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    borderBottom: '1px solid #F4F2EC',
    backgroundColor: '#FFFFFF',
  },
  headerNoBorder: {
    borderBottom: 'none',
    paddingBottom: '4px',
  },
  titleBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    minWidth: 0,
  },
  title: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1A1A1A',
    lineHeight: 1.3,
    letterSpacing: '-0.01em',
  },
  subtitle: {
    fontSize: '12px',
    color: '#737373',
    lineHeight: 1.45,
  },
  body: {
    padding: '22px 26px',
  },
  bodyFlush: {
    padding: 0,
  },
  actions: {
    display: 'flex',
    gap: '8px',
    flexShrink: 0,
    alignItems: 'center',
  },
});

interface CardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  flush?: boolean;
  noHeaderBorder?: boolean;
  className?: string;
  onClick?: () => void;
}

export function Card({
  title,
  subtitle,
  actions,
  children,
  flush,
  noHeaderBorder,
  className,
  onClick,
}: CardProps) {
  const styles = useStyles();
  const { t } = useT();
  return (
    <div
      className={mergeClasses(styles.card, onClick && styles.interactive, className)}
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
      {(title || actions) && (
        <div
          className={mergeClasses(
            styles.header,
            noHeaderBorder && styles.headerNoBorder,
          )}
        >
          <div className={styles.titleBlock}>
            {title && <span className={styles.title}>{typeof title === 'string' ? t(title) : title}</span>}
            {subtitle && <span className={styles.subtitle}>{typeof subtitle === 'string' ? t(subtitle) : subtitle}</span>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      )}
      <div className={flush ? styles.bodyFlush : styles.body}>{children}</div>
    </div>
  );
}
