/**
 * Bandeau d'actions sur une sélection de lignes.
 *
 * N'apparaît que lorsqu'au moins une ligne est cochée : un bandeau permanent
 * vide occuperait de la place et déplacerait le tableau à chaque sélection.
 *
 * Le composant ne décide d'aucune action — il expose un emplacement. Ce qu'on
 * peut faire d'un lot de lignes dépend entièrement de l'écran, et cette
 * décision appartient à la page.
 */
import { Button, makeStyles } from '@fluentui/react-components';
import { Dismiss20Regular } from '@fluentui/react-icons';
import type { ReactNode } from 'react';
import { useT } from '@/i18n/i18n';

const useStyles = makeStyles({
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 16px',
    marginBottom: '12px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--glass-red-bg)',
    border: '1px solid var(--glass-red-border)',
  },
  compte: {
    fontSize: '13.5px',
    fontWeight: 600,
    color: 'var(--text)',
    flexShrink: 0,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginLeft: 'auto',
    flexWrap: 'wrap',
  },
});

interface SelectionBarProps {
  /** Nombre de lignes cochées. À zéro, le bandeau ne s'affiche pas. */
  count: number;
  onClear: () => void;
  /** Boutons propres à l'écran (exporter, réassigner…). */
  children?: ReactNode;
}

export function SelectionBar({ count, onClear, children }: SelectionBarProps) {
  const styles = useStyles();
  const { t } = useT();
  if (count === 0) return null;

  return (
    <div className={styles.bar} role="status">
      <span className={styles.compte}>
        {count} {count > 1 ? t('lignes sélectionnées') : t('ligne sélectionnée')}
      </span>
      <div className={styles.actions}>
        {children}
        <Button appearance="subtle" size="small" icon={<Dismiss20Regular />} onClick={onClear}>
          {t('Tout désélectionner')}
        </Button>
      </div>
    </div>
  );
}
