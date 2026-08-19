import { makeStyles } from '@fluentui/react-components';
import type { ReactNode } from 'react';
import { useT } from '@/i18n/i18n';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '32px',
    gap: '24px',
    flexWrap: 'wrap',
    paddingBottom: '4px',
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    fontSize: '10.5px',
    fontWeight: 700,
    color: 'var(--accent)',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    marginBottom: '12px',
    padding: '4px 12px',
    backgroundColor: 'rgba(200, 16, 46, 0.06)',
    borderRadius: '999px',
    border: '1px solid rgba(200, 16, 46, 0.14)',
  },
  title: {
    fontSize: '33px',
    fontWeight: 700,
    color: '#141414',
    margin: 0,
    marginBottom: '10px',
    lineHeight: 1.12,
    letterSpacing: '-0.03em',
  },
  subtitle: {
    fontSize: '14.5px',
    color: '#5A5A5A',
    lineHeight: 1.6,
    margin: 0,
    maxWidth: '780px',
  },
  actions: {
    display: 'flex',
    gap: '10px',
    flexShrink: 0,
    alignItems: 'center',
  },
});

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, subtitle, actions }: PageHeaderProps) {
  const styles = useStyles();
  const { t } = useT();
  return (
    <div className={styles.root}>
      <div className={styles.titleBlock}>
        {eyebrow && <div className={styles.eyebrow}>{t(eyebrow)}</div>}
        <h1 className={styles.title}>{t(title)}</h1>
        {subtitle && <p className={styles.subtitle}>{typeof subtitle === 'string' ? t(subtitle) : subtitle}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
