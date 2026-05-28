import { makeStyles } from '@fluentui/react-components';
import type { ReactNode } from 'react';

const useStyles = makeStyles({
  root: {
    padding: '56px 32px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '14px',
  },
  iconWrap: {
    width: '64px',
    height: '64px',
    borderRadius: '18px',
    backgroundColor: '#FAF9F6',
    border: '1px solid #ECEAE4',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#A3A3A3',
    fontSize: '28px',
    boxShadow: '0 1px 2px rgba(15, 15, 15, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
    marginBottom: '4px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1A1A1A',
    letterSpacing: '-0.01em',
  },
  description: {
    fontSize: '13px',
    color: '#737373',
    maxWidth: '440px',
    lineHeight: 1.55,
  },
  action: {
    marginTop: '8px',
  },
});

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const styles = useStyles();
  return (
    <div className={styles.root}>
      {icon && <div className={styles.iconWrap}>{icon}</div>}
      <div className={styles.title}>{title}</div>
      {description && <div className={styles.description}>{description}</div>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
