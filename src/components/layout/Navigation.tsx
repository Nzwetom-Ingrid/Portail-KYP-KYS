import { NavLink, useLocation } from 'react-router-dom';
import { makeStyles, mergeClasses, Badge, Tooltip } from '@fluentui/react-components';
import afrilandLogo from '@/assets/afriland-logo.jpg';
import {
  Home24Regular,
  Building24Regular,
  ClipboardTaskListLtr24Regular,
  CalendarLtr24Regular,
  PeopleTeam24Regular,
  ShieldCheckmark24Regular,
  ClipboardCheckmark24Regular,
  DocumentBulletList24Regular,
  DocumentPdf24Regular,
  Person24Regular,
  History24Regular,
  ShieldTask24Regular,
  Share24Regular,
} from '@fluentui/react-icons';
import { useRoleStore } from '@/store/roleStore';
import { useT } from '@/i18n/i18n';
import type { Permission, Direction } from '@/types/roles';
import type { ReactNode } from 'react';

const useStyles = makeStyles({
  sidebar: {
    width: 'var(--sidebar-width)',
    flexShrink: 0,
    backgroundColor: 'var(--sidebar-bg)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderRight: '1px solid var(--glass-border)',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 16px 16px',
    overflowY: 'auto',
    position: 'relative',
  },
  brandCard: {
    position: 'relative',
    padding: '16px',
    marginBottom: '20px',
    borderRadius: 'var(--radius-lg)',
    cursor: 'pointer',
    backgroundColor: 'var(--glass-bg)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid var(--glass-border)',
    boxShadow: 'var(--glass-shadow)',
    transition: 'background-color var(--transition-normal), border-color var(--transition-normal)',
    ':hover': {
      backgroundColor: 'var(--glass-hover-bg)',
      borderTopColor: 'var(--glass-hover-border)', borderRightColor: 'var(--glass-hover-border)', borderBottomColor: 'var(--glass-hover-border)', borderLeftColor: 'var(--glass-hover-border)',
    },
  },
  brandHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  brandLogoWrap: {
    width: '100%',
    height: '64px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: '8px 12px',
  },
  brandLogo: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    display: 'block',
  },
  brandTextBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minWidth: 0,
  },
  brandEyebrow: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    lineHeight: 1,
    width: 'fit-content',
  },
  brandEyebrowDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent)',
    boxShadow: '0 0 8px var(--accent-glow)',
    flexShrink: 0,
    animation: 'pulse 1500ms ease-in-out infinite',
  },
  brandText: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--text)',
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  brandTextHighlight: {
    color: 'var(--accent)',
  },
  brandFooterDivider: {
    height: '1px',
    backgroundColor: 'var(--glass-border)',
    margin: '14px 0 12px',
  },
  brandFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    flexWrap: 'wrap',
  },
  brandChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '4px 10px',
    backgroundColor: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-full)',
    fontSize: '11px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    lineHeight: 1.3,
  },
  brandChipLabel: {
    color: 'var(--text-muted)',
    fontWeight: 400,
  },
  brandChipValue: {
    color: 'var(--text)',
    fontWeight: 600,
  },
  brandComplianceChip: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 9px',
    backgroundColor: 'var(--glass-red-bg)',
    border: '1px solid var(--glass-red-border)',
    borderRadius: 'var(--radius-full)',
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--accent-light)',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    fontFamily: '"JetBrains Mono", monospace',
    lineHeight: 1.3,
  },
  sectionLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    padding: '16px 12px 8px',
    userSelect: 'none',
  },
  sectionLabelFirst: {
    paddingTop: '6px',
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    borderRadius: 'var(--radius-md)',
    marginBottom: '4px',
    position: 'relative',
    transition: 'background-color var(--transition-fast), color var(--transition-fast)',
    cursor: 'pointer',
    ':hover': {
      backgroundColor: 'var(--glass-hover-bg)',
      color: 'var(--text)',
    },
    ':focus-visible': {
      outline: 'none',
      boxShadow: '0 0 0 3px var(--accent-ring)',
    },
  },
  // Élément actif : pastille rouge pleine arrondie, ombre rouge douce, texte blanc
  linkActive: {
    backgroundColor: 'var(--accent)',
    color: '#ffffff',
    fontWeight: 600,
    boxShadow: '0 6px 18px -6px var(--accent-glow), 0 2px 6px -2px rgba(200, 16, 46, 0.30)',
    ':hover': {
      backgroundColor: 'var(--accent-dark)',
      color: '#ffffff',
    },
  },
  linkIcon: {
    flexShrink: 0,
    fontSize: '20px',
    display: 'inline-flex',
  },
  linkLabel: {
    flex: 1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  footer: {
    marginTop: 'auto',
    padding: '16px 12px 6px',
    borderTop: '1px solid var(--glass-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    alignItems: 'flex-start',
  },
  footerCompliance: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontWeight: 500,
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
});

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  permission?: Permission;
  /** Si présent, l'item n'est visible que pour ces directions internes. */
  directions?: Direction[];
  /** Si présent, l'item n'est visible que pour ces rôles (par id). */
  roles?: string[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Pilotage',
    items: [
      { to: '/dashboard',         label: 'Dashboard',                icon: <Home24Regular />, permission: 'dashboard.view' },
      { to: '/mes-dossiers',      label: 'Mes dossiers',             icon: <ClipboardTaskListLtr24Regular />, roles: ['charge-relation'] },
      { to: '/dossiers',          label: 'Dossiers',                 icon: <ClipboardTaskListLtr24Regular />, permission: 'dossiers.validate' },
      { to: '/validations-dconf', label: 'Validation',               icon: <ShieldTask24Regular />, permission: 'dossiers.confirm' },
      { to: '/calendar',          label: 'Calendrier expirations',   icon: <CalendarLtr24Regular /> },
      { to: '/document-share',    label: 'Documents partagés',       icon: <Share24Regular />, directions: ['DCONF', 'DMG'] },
    ],
  },
  {
    title: 'Référentiel',
    items: [
      { to: '/ubo',      label: 'Bénéficiaires UBO',    icon: <PeopleTeam24Regular />, permission: 'ubo.view' },
      { to: '/admin/partner-types', label: 'Types de partenaires', icon: <Building24Regular />, permission: 'admin.full' },
    ],
  },
  {
    title: 'Évaluations',
    items: [
      { to: '/screening',      label: 'Screening PPE', icon: <ShieldCheckmark24Regular />, permission: 'screening.view' },
      { to: '/evaluations',    label: 'Évaluations',   icon: <ClipboardCheckmark24Regular />, permission: 'questionnaires.view' },
      { to: '/questionnaires', label: 'Questionnaires', icon: <DocumentBulletList24Regular />, permission: 'questionnaires.view' },
    ],
  },
  {
    title: 'Reporting',
    items: [
      { to: '/reports', label: 'Rapports PDF', icon: <DocumentPdf24Regular />, permission: 'reports.export' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { to: '/users',         label: 'Utilisateurs',  icon: <Person24Regular />,   permission: 'users.manage' },
      { to: '/audit-logs',    label: 'Logs d’audit',  icon: <History24Regular />,  permission: 'admin.full' },
    ],
  },
];

export function Navigation() {
  const styles = useStyles();
  const { t } = useT();
  const location = useLocation();
  const can = useRoleStore(s => s.can);
  const currentRole = useRoleStore(s => s.currentRole);
  const identity = useRoleStore(s => s.identity);

  return (
    <aside className={mergeClasses('afb-rail', styles.sidebar)}>
      <Tooltip content="Portail Conformité Afriland First Bank" relationship="label" withArrow>
        <div className={styles.brandCard} role="button" tabIndex={0}>
          <div className={styles.brandHeader}>
            <div className={styles.brandLogoWrap}>
              <img
                src={afrilandLogo}
                alt="Afriland First Bank"
                className={styles.brandLogo}
              />
            </div>
            <div className={styles.brandTextBlock}>
              <span className={styles.brandEyebrow}>
                <span className={styles.brandEyebrowDot} aria-hidden="true" />
                {t('Session active')}
              </span>
              <span className={styles.brandText}>
                Portail <span className={styles.brandTextHighlight}>KYP / KYS</span>
              </span>
            </div>
          </div>

          <div className={styles.brandFooterDivider} aria-hidden="true" />

          <div className={styles.brandFooter}>
            <span className={styles.brandChip}>
              <span className={styles.brandChipLabel}>{t('Direction')}</span>
              <span className={styles.brandChipValue}>{identity.direction ?? currentRole.direction ?? t('Externe')}</span>
            </span>
            <span className={styles.brandComplianceChip}>COBAC</span>
          </div>
        </div>
      </Tooltip>

      {NAV_SECTIONS.map((section, sectionIdx) => {
        const currentDir = identity.direction ?? currentRole.direction;
        const visibleItems = section.items.filter(
          item =>
            (!item.permission || can(item.permission)) &&
            (!item.directions || (currentDir ? item.directions.includes(currentDir as Direction) : false)) &&
            (!item.roles || item.roles.includes(currentRole.id)),
        );
        if (visibleItems.length === 0) return null;
        return (
          <div key={section.title}>
            <div className={mergeClasses(styles.sectionLabel, sectionIdx === 0 && styles.sectionLabelFirst)}>
              {t(section.title)}
            </div>
            {visibleItems.map(item => {
              const isActive = location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={mergeClasses(styles.link, isActive && styles.linkActive)}
                >
                  <span className={styles.linkIcon}>{item.icon}</span>
                  <span className={styles.linkLabel}>{t(item.label)}</span>
                </NavLink>
              );
            })}
          </div>
        );
      })}

      <div className={styles.footer}>
        <Badge appearance="tint" color="danger" size="small">COBAC R-2023/01</Badge>
        <span className={styles.footerCompliance}>RBAC Dataverse · RLS</span>
      </div>
    </aside>
  );
}
