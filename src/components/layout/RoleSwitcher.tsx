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
import { ChevronDown16Regular } from '@fluentui/react-icons';
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
    border: '1px solid #ECEAE4',
    backgroundColor: '#FFFFFF',
    transition: 'all 220ms cubic-bezier(0.16, 1, 0.3, 1)',
    boxShadow: '0 1px 2px rgba(15, 15, 15, 0.03)',
    ':hover': {
      borderTopColor: '#E0DDD3', borderRightColor: '#E0DDD3', borderBottomColor: '#E0DDD3', borderLeftColor: '#E0DDD3',
      backgroundColor: '#FCFBF8',
      boxShadow: '0 2px 6px rgba(15, 15, 15, 0.06)',
      transform: 'translateY(-1px)',
    },
    ':active': {
      transform: 'translateY(0)',
      boxShadow: '0 1px 2px rgba(15, 15, 15, 0.03)',
    },
    ':focus-visible': {
      outline: 'none',
      borderTopColor: '#C20012', borderRightColor: '#C20012', borderBottomColor: '#C20012', borderLeftColor: '#C20012',
      boxShadow: '0 0 0 3px rgba(227, 6, 19, 0.18)',
    },
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
    color: '#1A1A1A',
    letterSpacing: '-0.005em',
  },
  userRole: {
    fontSize: '10.5px',
    color: '#737373',
    fontWeight: 500,
    marginTop: '1px',
    letterSpacing: '0.02em',
  },
  chevron: {
    color: '#737373',
    transition: 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
  },
  popoverSurface: {
    minWidth: '300px',
    padding: '6px',
    borderRadius: '14px',
    border: '1px solid #ECEAE4',
    boxShadow: '0 16px 40px -8px rgba(15, 15, 15, 0.14)',
  },
  menuLabel: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#A3A3A3',
    textTransform: 'uppercase',
    letterSpacing: '0.10em',
    padding: '10px 12px 6px',
  },
  menuItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '2px',
    padding: '10px 12px',
    width: '100%',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 160ms',
  },
  menuItemLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#1A1A1A',
  },
  menuItemDesc: {
    fontSize: '11px',
    color: '#737373',
    lineHeight: 1.4,
  },
  activeBadge: {
    width: '8px',
    height: '8px',
    backgroundColor: '#C20012',
    borderRadius: '50%',
    marginLeft: 'auto',
    boxShadow: '0 0 0 3px rgba(194, 0, 18, 0.18)',
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
  const currentRole = useRoleStore(s => s.currentRole);
  const setRole = useRoleStore(s => s.setRole);

  return (
    <Menu>
      <MenuTrigger disableButtonEnhancement>
        <button type="button" className={styles.trigger} aria-label="Changer de rôle">
          <Avatar
            name={currentRole.label}
            initials={getInitials(currentRole.label)}
            size={32}
            color="brand"
          />
          <div className={styles.userInfo}>
            <span className={styles.userName}>
              {currentRole.label.split('·')[0].trim()}
            </span>
            <span className={styles.userRole}>
              {currentRole.direction ?? 'Externe'} · Niveau {currentRole.level}
            </span>
          </div>
          <ChevronDown16Regular className={styles.chevron} />
        </button>
      </MenuTrigger>

      <MenuPopover className={styles.popoverSurface}>
        <div className={styles.menuLabel}>Changer de rôle (démo)</div>
        <MenuList>
          {DEMO_ROLES.map((role, idx) => {
            const isActive = role.id === currentRole.id;
            return (
              <div key={role.id}>
                {idx === 1 && <MenuDivider />}
                {idx === 5 && <MenuDivider />}
                <MenuItem onClick={() => setRole(role.id)}>
                  <div className={styles.menuItem}>
                    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <span className={styles.menuItemLabel}>{role.label}</span>
                      {isActive && <span className={styles.activeBadge} />}
                    </div>
                    <span className={styles.menuItemDesc}>{role.description}</span>
                  </div>
                </MenuItem>
              </div>
            );
          })}
        </MenuList>
      </MenuPopover>
    </Menu>
  );
}
