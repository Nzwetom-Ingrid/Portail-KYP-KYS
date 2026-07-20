/**
 * Verrouillage de session par inactivité (back-office).
 *
 * Après 15 minutes sans interaction, un écran opaque plein écran masque toutes
 * les données et bloque l'application. L'utilisateur doit cliquer « Reprendre la
 * session », ce qui recharge l'app et re-valide la session côté Power Platform.
 *
 * Limite assumée : une app Power Apps (code app) ne peut pas forcer seule une
 * ré-authentification. Ce verrou masque les données et coupe l'accès sur poste
 * partagé ; pour une ré-auth imposée, compléter par une politique d'accès
 * conditionnel « fréquence de connexion » côté Entra (admin).
 */
import { useCallback, useState } from 'react';
import { Button, makeStyles, tokens, Text } from '@fluentui/react-components';
import { LockClosed24Filled } from '@fluentui/react-icons';
import { useIdleTimer } from '@/hooks/useIdleTimer';

/** Délai d'inactivité avant verrouillage (15 min). */
const IDLE_MS = 15 * 60 * 1000;

const useStyles = makeStyles({
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 99999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    // Fond opaque : masque entièrement les données sensibles affichées.
    backgroundColor: tokens.colorNeutralBackground1,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    maxWidth: '420px',
    padding: '40px 32px',
    textAlign: 'center',
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorNeutralBackground2,
    boxShadow: tokens.shadow16,
  },
  badge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorBrandForeground1,
  },
  title: { fontWeight: tokens.fontWeightSemibold },
  text: { color: tokens.colorNeutralForeground3 },
});

export function IdleLock() {
  const styles = useStyles();
  const [locked, setLocked] = useState(false);

  useIdleTimer(IDLE_MS, useCallback(() => setLocked(true), []), !locked);

  if (!locked) return null;

  return (
    <div className={styles.overlay} role="alertdialog" aria-modal="true" aria-label="Session verrouillée">
      <div className={styles.card}>
        <div className={styles.badge}>
          <LockClosed24Filled />
        </div>
        <Text as="h2" size={500} className={styles.title}>
          Session verrouillée
        </Text>
        <Text className={styles.text}>
          Par sécurité, votre session a été verrouillée après 15 minutes d'inactivité.
          Reprenez pour continuer — vous devrez peut-être vous ré-identifier.
        </Text>
        <Button appearance="primary" onClick={() => window.location.reload()}>
          Reprendre la session
        </Button>
      </div>
    </div>
  );
}
