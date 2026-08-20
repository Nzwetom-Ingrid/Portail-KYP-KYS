import {
  makeStyles,
  Avatar,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  MenuDivider,
} from '@fluentui/react-components';
import { ChevronDown16Regular, ArrowUndo16Regular } from '@fluentui/react-icons';
import { useRoleStore } from '@/store/roleStore';
import { DEMO_ROLES } from '@/types/roles';

const useStyles = makeStyles({
  trigger: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '5px 12px 5px 5px',
    borderRadius: '999px',
    cursor: 'pointer',
    border: '1px solid var(--glass-border)',
    backgroundColor: 'var(--glass-bg)',
    transition: 'all 220ms cubic-bezier(0.16, 1, 0.3, 1)',
    boxShadow: '0 1px 2px rgba(15, 15, 15, 0.03)',
    ':hover': {
      borderTopColor: 'var(--glass-border)', borderRightColor: 'var(--glass-border)', borderBottomColor: 'var(--glass-border)', borderLeftColor: 'var(--glass-border)',
      backgroundColor: 'var(--bg)',
      boxShadow: '0 2px 6px rgba(15, 15, 15, 0.06)',
      transform: 'translateY(-1px)',
    },
    ':active': {
      transform: 'translateY(0)',
      boxShadow: '0 1px 2px rgba(15, 15, 15, 0.03)',
    },
    ':focus-visible': {
      outline: 'none',
      borderTopColor: 'var(--accent)', borderRightColor: 'var(--accent)', borderBottomColor: 'var(--accent)', borderLeftColor: 'var(--accent)',
      boxShadow: '0 0 0 3px rgba(200, 16, 46, 0.18)',
    },
  },
  triggerStatic: {
    cursor: 'default',
    ':hover': { transform: 'none', boxShadow: '0 1px 2px rgba(15, 15, 15, 0.03)', backgroundColor: 'var(--glass-bg)' },
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    lineHeight: 1.2,
  },
  userName: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text)',
    letterSpacing: '-0.005em',
  },
  userRole: {
    fontSize: '10.5px',
    color: 'var(--text-muted)',
    fontWeight: 500,
    marginTop: '1px',
    letterSpacing: '0.02em',
  },
  impersonating: {
    color: 'var(--accent)',
    fontWeight: 600,
  },
  chevron: {
    color: 'var(--text-muted)',
  },
  popoverSurface: {
    minWidth: '300px',
    padding: '6px',
    borderRadius: '14px',
    border: '1px solid var(--glass-border)',
    boxShadow: '0 16px 40px -8px rgba(15, 15, 15, 0.14)',
  },
  menuLabel: {
    fontSize: '10px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.10em',
    padding: '10px 12px 6px',
  },
  returnItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    width: '100%',
    borderRadius: '8px',
    color: 'var(--accent)',
    fontSize: '13px',
    fontWeight: 600,
  },
  menuItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '2px',
    padding: '10px 12px',
    width: '100%',
    borderRadius: '8px',
  },
  menuItemLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text)',
  },
  menuItemDesc: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    lineHeight: 1.4,
  },
  activeBadge: {
    width: '8px',
    height: '8px',
    backgroundColor: 'var(--accent)',
    borderRadius: '50%',
    marginLeft: 'auto',
    boxShadow: '0 0 0 3px rgba(200, 16, 46, 0.18)',
  },
});

function getInitials(label: string) {
  const main = label.split('·')[0].trim();
  const parts = main.split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return main.slice(0, 2).toUpperCase();
}

export function RoleSwitcher() {
  const styles = useStyles();
  const currentRole = useRoleStore((s) => s.currentRole);
  const realRoleId = useRoleStore((s) => s.realRoleId);
  const setRole = useRoleStore((s) => s.setRole);
  const identity = useRoleStore((s) => s.identity);

  // Seul un utilisateur RÉELLEMENT Super Admin peut visualiser l'app en tant
  // qu'un autre rôle. Le menu reste dispo MÊME pendant l'impersonation, pour
  // pouvoir revenir (contrairement à avant, où quitter Super Admin bloquait).
  const canImpersonate = realRoleId === 'super-admin';
  const impersonating = currentRole.id !== realRoleId;
  const realRole = DEMO_ROLES.find((r) => r.id === realRoleId) ?? currentRole;

  const roleName = currentRole.label.split('·')[0].trim();
  const direction = identity.direction ?? currentRole.direction ?? 'Externe';

  // Utilisateur non-admin : affichage figé — son NOM, et son RÔLE en dessous.
  // Aucun menu déroulant (pas d'impersonation possible).
  if (!canImpersonate) {
    const displayName = identity.fullName || roleName;
    return (
      <div className={`${styles.trigger} ${styles.triggerStatic}`} aria-label="Profil utilisateur">
        <Avatar name={displayName} initials={getInitials(displayName)} size={32} color="brand" />
        <div className={styles.userInfo}>
          <span className={styles.userName}>{displayName}</span>
          <span className={styles.userRole}>{`${roleName}${direction ? ` · ${direction}` : ''}`}</span>
        </div>
      </div>
    );
  }

  // Super Admin : menu de bascule entre les rôles réels de l'app (+ retour).
  return (
    <Menu>
      <MenuTrigger disableButtonEnhancement>
        <button type="button" className={styles.trigger} aria-label="Changer de rôle">
          <Avatar name={roleName} initials={getInitials(roleName)} size={32} color="brand" />
          <div className={styles.userInfo}>
            <span className={styles.userName}>{roleName}</span>
            <span className={impersonating ? `${styles.userRole} ${styles.impersonating}` : styles.userRole}>
              {impersonating
                ? `Vue en tant que · Niveau ${currentRole.level}`
                : `${direction} · Niveau ${currentRole.level}`}
            </span>
          </div>
          <ChevronDown16Regular className={styles.chevron} />
        </button>
      </MenuTrigger>

      <MenuPopover className={styles.popoverSurface}>
        <MenuList>
          {impersonating && (
            <>
              <MenuItem onClick={() => setRole(realRoleId)}>
                <div className={styles.returnItem}>
                  <ArrowUndo16Regular />
                  Revenir à mon rôle ({realRole.label.split('·')[0].trim()})
                </div>
              </MenuItem>
              <MenuDivider />
            </>
          )}
          <div className={styles.menuLabel}>Voir l'app en tant que</div>
          {DEMO_ROLES.map((role) => {
            const isActive = role.id === currentRole.id;
            return (
              <MenuItem key={role.id} onClick={() => setRole(role.id)}>
                <div className={styles.menuItem}>
                  <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <span className={styles.menuItemLabel}>{role.label}</span>
                    {isActive && <span className={styles.activeBadge} />}
                  </div>
                  <span className={styles.menuItemDesc}>{role.description}</span>
                </div>
              </MenuItem>
            );
          })}
        </MenuList>
      </MenuPopover>
    </Menu>
  );
}
