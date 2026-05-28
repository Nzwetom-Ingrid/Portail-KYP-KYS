import { useState } from 'react';
import { makeStyles, Tooltip, Popover, PopoverSurface, PopoverTrigger } from '@fluentui/react-components';
import {
  Alert24Regular,
  Search20Regular,
  QuestionCircle20Regular,
  Sparkle20Regular,
  WeatherMoon20Regular,
  WeatherSunny20Regular,
} from '@fluentui/react-icons';
import { RoleSwitcher } from './RoleSwitcher';
import { useThemeStore } from '@/store/themeStore';

const useStyles = makeStyles({
  header: {
    height: 'var(--header-height)',
    backgroundColor: 'var(--glass-bg)',
    backdropFilter: 'var(--glass-blur)',
    WebkitBackdropFilter: 'var(--glass-blur)',
    borderBottom: '1px solid var(--glass-border)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 24px',
    justifyContent: 'space-between',
    gap: '16px',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    transition: 'background-color var(--transition-normal), border-color var(--transition-normal)',
  },
  leftZone: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flex: 1,
    maxWidth: '420px',
  },
  searchPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 16px',
    backgroundColor: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)',
    width: '100%',
    cursor: 'pointer',
    transition: 'background-color var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast), color var(--transition-fast)',
    color: 'var(--text-muted)',
    fontSize: '14px',
    ':hover': {
      backgroundColor: 'var(--glass-hover-bg)',
      borderTopColor: 'var(--glass-hover-border)', borderRightColor: 'var(--glass-hover-border)', borderBottomColor: 'var(--glass-hover-border)', borderLeftColor: 'var(--glass-hover-border)',
      color: 'var(--text-secondary)',
    },
    ':focus-visible': {
      outline: 'none',
      borderTopColor: 'var(--accent)', borderRightColor: 'var(--accent)', borderBottomColor: 'var(--accent)', borderLeftColor: 'var(--accent)',
      boxShadow: '0 0 0 3px var(--accent-ring)',
      color: 'var(--text)',
    },
  },
  searchKbd: {
    marginLeft: 'auto',
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    fontSize: '11px',
    fontFamily: '"JetBrains Mono", monospace',
    fontWeight: 500,
    color: 'var(--text-muted)',
    backgroundColor: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-sm)',
  },
  rightZone: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  iconBtn: {
    position: 'relative',
    cursor: 'pointer',
    padding: '0',
    width: '40px',
    height: '40px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--radius-md)',
    border: '1px solid transparent',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    transition: 'background-color var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast)',
    ':hover': {
      backgroundColor: 'var(--glass-hover-bg)',
      borderTopColor: 'var(--glass-border)', borderRightColor: 'var(--glass-border)', borderBottomColor: 'var(--glass-border)', borderLeftColor: 'var(--glass-border)',
      color: 'var(--text)',
    },
    ':active': {
      transform: 'scale(0.96)',
    },
    ':focus-visible': {
      outline: 'none',
      boxShadow: '0 0 0 3px var(--accent-ring)',
    },
  },
  notifDot: {
    position: 'absolute',
    top: '9px',
    right: '9px',
    width: '8px',
    height: '8px',
    backgroundColor: 'var(--accent)',
    borderRadius: '50%',
    boxShadow: '0 0 8px var(--accent-glow)',
    animation: 'pulse 1500ms ease-in-out infinite',
  },
  divider: {
    width: '1px',
    height: '24px',
    backgroundColor: 'var(--glass-border)',
    margin: '0 6px',
  },
  popoverSurface: {
    padding: 0,
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--glass-border)',
    backgroundColor: 'var(--glass-bg)',
    backdropFilter: 'var(--glass-blur)',
    WebkitBackdropFilter: 'var(--glass-blur)',
    boxShadow: 'var(--glass-shadow)',
    overflow: 'hidden',
    minWidth: '340px',
  },
  popoverHeader: {
    padding: '14px 18px 10px',
    borderBottom: '1px solid var(--glass-border)',
  },
  popoverTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text)',
    letterSpacing: '-0.01em',
  },
  popoverSub: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  popoverList: {
    maxHeight: '320px',
    overflowY: 'auto',
  },
  notifItem: {
    display: 'flex',
    gap: '12px',
    padding: '12px 18px',
    borderBottom: '1px solid var(--glass-border)',
    cursor: 'pointer',
    transition: 'background-color var(--transition-fast)',
    ':last-child': { borderBottom: 'none' },
    ':hover': { backgroundColor: 'var(--glass-hover-bg)' },
  },
  notifDotInline: {
    width: '8px',
    height: '8px',
    backgroundColor: 'var(--accent)',
    borderRadius: '50%',
    boxShadow: '0 0 8px var(--accent-glow)',
    flexShrink: 0,
    marginTop: '6px',
  },
  notifBody: {
    flex: 1,
    minWidth: 0,
  },
  notifTitle: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text)',
    marginBottom: '2px',
  },
  notifDesc: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
  },
  notifTime: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginTop: '4px',
    fontFamily: 'monospace',
  },
  popoverFooter: {
    padding: '10px 18px',
    borderTop: '1px solid var(--glass-border)',
    textAlign: 'center',
    fontSize: '12px',
    color: 'var(--accent)',
    fontWeight: 600,
    cursor: 'pointer',
    backgroundColor: 'var(--glass-bg)',
    transition: 'background-color var(--transition-fast)',
    ':hover': { backgroundColor: 'var(--glass-hover-bg)' },
  },
});

const SAMPLE_NOTIFS = [
  { title: '3 dossiers en attente J-2', desc: 'SLA réglementaire COBAC R-2023/01 — relance auto programmée.', time: 'il y a 12 min', unread: true },
  { title: 'Screening : 1 hit potentiel', desc: 'KYC-B-2026-0042 — Sanctions UE, à valider par RCSI.', time: 'il y a 1 h', unread: true },
  { title: 'Document expiré', desc: 'Attestation fiscale — Fournisseur Cybernet Solutions.', time: 'il y a 3 h', unread: false },
  { title: 'Nouveau questionnaire reçu', desc: 'Wolfsberg signé — Citibank N.A. Branch London.', time: 'aujourd’hui 09h12', unread: false },
];

export function Header() {
  const styles = useStyles();
  const [notifOpen, setNotifOpen] = useState(false);
  const theme = useThemeStore(s => s.theme);
  const toggleTheme = useThemeStore(s => s.toggleTheme);
  const isDark = theme === 'dark';

  return (
    <header className={styles.header}>
      <div className={styles.leftZone}>
        <button
          type="button"
          className={styles.searchPill}
          aria-label="Recherche globale"
        >
          <Search20Regular />
          <span>Rechercher un dossier, un partenaire, un UBO…</span>
          <span className={styles.searchKbd}>Ctrl K</span>
        </button>
      </div>

      <div className={styles.rightZone}>
        <Tooltip content="Assistant IA conformité" relationship="label" withArrow>
          <button type="button" className={styles.iconBtn} aria-label="Assistant IA">
            <Sparkle20Regular />
          </button>
        </Tooltip>

        <Tooltip content="Aide & documentation" relationship="label" withArrow>
          <button type="button" className={styles.iconBtn} aria-label="Aide">
            <QuestionCircle20Regular />
          </button>
        </Tooltip>

        <Tooltip content={isDark ? 'Mode clair' : 'Mode sombre'} relationship="label" withArrow>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
            aria-pressed={isDark}
            onClick={toggleTheme}
          >
            {isDark ? <WeatherSunny20Regular /> : <WeatherMoon20Regular />}
          </button>
        </Tooltip>

        <Popover
          open={notifOpen}
          onOpenChange={(_, data) => setNotifOpen(data.open)}
          positioning="below-end"
          withArrow
        >
          <PopoverTrigger disableButtonEnhancement>
            <button
              type="button"
              className={styles.iconBtn}
              aria-label="Notifications"
            >
              <Alert24Regular />
              <span className={styles.notifDot} />
            </button>
          </PopoverTrigger>
          <PopoverSurface className={styles.popoverSurface}>
            <div className={styles.popoverHeader}>
              <div className={styles.popoverTitle}>Notifications</div>
              <div className={styles.popoverSub}>2 non lues · {SAMPLE_NOTIFS.length} au total</div>
            </div>
            <div className={styles.popoverList}>
              {SAMPLE_NOTIFS.map((n, i) => (
                <div key={i} className={styles.notifItem}>
                  {n.unread && <span className={styles.notifDotInline} />}
                  {!n.unread && <span style={{ width: '8px', flexShrink: 0 }} />}
                  <div className={styles.notifBody}>
                    <div className={styles.notifTitle}>{n.title}</div>
                    <div className={styles.notifDesc}>{n.desc}</div>
                    <div className={styles.notifTime}>{n.time}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.popoverFooter}>Voir toutes les notifications →</div>
          </PopoverSurface>
        </Popover>

        <span className={styles.divider} />
        <RoleSwitcher />
      </div>
    </header>
  );
}
