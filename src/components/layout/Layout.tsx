import { Outlet } from 'react-router-dom';
import { makeStyles } from '@fluentui/react-components';
import { Header } from './Header';
import { Navigation } from './Navigation';
import { useResolveCurrentRole } from '@/lib/auth/useResolveCurrentRole';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    height: '100vh',
    // Laisse transparaître le canvas (gradients radiaux) défini sur body
    backgroundColor: 'transparent',
    color: 'var(--text)',
    fontFamily: '"Plus Jakarta Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
  },
  main: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '38px 48px 56px',
    position: 'relative',
    scrollBehavior: 'smooth',
  },
  mainInner: {
    maxWidth: '1440px',
    margin: '0 auto',
    width: '100%',
    animation: 'fadeIn 320ms cubic-bezier(0.16, 1, 0.3, 1)',
  },
});

export function Layout() {
  const styles = useStyles();
  // Détecte l'utilisateur connecté et applique son rôle réel au store (masquage UI).
  useResolveCurrentRole();
  return (
    <div className={styles.root}>
      <Navigation />
      <div className={styles.content}>
        <Header />
        <main className={styles.main}>
          <div className={styles.mainInner}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
