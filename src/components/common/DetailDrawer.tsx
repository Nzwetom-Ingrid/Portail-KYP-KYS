import { useState, type ReactNode } from 'react';
import {
  OverlayDrawer,
  DrawerHeader,
  DrawerHeaderTitle,
  DrawerBody,
  Button,
  Badge,
  TabList,
  Tab,
  makeStyles,
  type BadgeProps,
} from '@fluentui/react-components';
import { Dismiss20Regular } from '@fluentui/react-icons';

export interface DrawerTab {
  /** Identifiant du tab. Accepte `id` (usage pages) ou `key` (legacy). */
  id?: string;
  key?: string;
  label: string;
  count?: number;
  alertCount?: number;
  content?: ReactNode;
}

export interface StatusBadge {
  label: string;
  color: BadgeProps['color'];
  appearance?: BadgeProps['appearance'];
}

interface DetailDrawerProps {
  open: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  statusBadges?: StatusBadge[] | ReactNode;
  headerActions?: ReactNode;
  tabs?: DrawerTab[];
  defaultTab?: string;
  /** Onglet actif contrôlé (par `id`/`key`). Si omis, géré en interne. */
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  footer?: ReactNode;
  size?: 'medium' | 'large';
  children?: ReactNode;
}

const useStyles = makeStyles({
  surface: {
    width: '600px',
    maxWidth: '92vw',
    backgroundColor: '#FAF9F6',
    display: 'flex',
    flexDirection: 'column',
    borderLeft: '1px solid #ECEAE4',
    boxShadow: '-12px 0 32px -8px rgba(15, 15, 15, 0.10)',
  },
  surfaceLarge: {
    width: '740px',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #F4F2EC',
    padding: '22px 26px 16px',
    flexShrink: 0,
  },
  headerTopRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '14px',
    marginBottom: '4px',
  },
  eyebrow: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '10.5px',
    fontWeight: 700,
    color: '#c8102e',
    textTransform: 'uppercase',
    letterSpacing: '0.10em',
    marginBottom: '8px',
    padding: '3px 10px',
    backgroundColor: '#FDF0F1',
    borderRadius: '999px',
    border: '1px solid #FDE0E3',
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#0A0A0A',
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
    margin: 0,
    wordBreak: 'break-word',
  },
  subtitle: {
    fontSize: '12.5px',
    color: '#525252',
    marginTop: '8px',
    lineHeight: 1.55,
  },
  closeBtn: {
    flexShrink: 0,
    width: '34px',
    height: '34px',
    minWidth: '34px',
    borderRadius: '10px',
  },
  headerActionsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '14px',
    flexWrap: 'wrap',
  },
  badgeRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    flex: 1,
  },
  tabsWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #F4F2EC',
    padding: '0 16px',
    flexShrink: 0,
  },
  tabCount: {
    display: 'inline-block',
    marginLeft: '6px',
    minWidth: '20px',
    padding: '0 6px',
    fontSize: '10.5px',
    fontWeight: 700,
    lineHeight: '18px',
    textAlign: 'center',
    backgroundColor: '#F4F2EC',
    color: '#525252',
    borderRadius: '999px',
  },
  tabAlert: {
    display: 'inline-block',
    marginLeft: '6px',
    minWidth: '20px',
    padding: '0 6px',
    fontSize: '10.5px',
    fontWeight: 700,
    lineHeight: '18px',
    textAlign: 'center',
    backgroundColor: '#FDF0F1',
    color: '#c8102e',
    borderRadius: '999px',
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '22px 26px 26px',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    borderTop: '1px solid #F4F2EC',
    padding: '16px 26px',
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    alignItems: 'center',
    flexShrink: 0,
    boxShadow: '0 -4px 16px -4px rgba(15, 15, 15, 0.06)',
  },
});

export function DetailDrawer({
  open,
  onClose,
  onOpenChange,
  eyebrow,
  title,
  subtitle,
  statusBadges,
  headerActions,
  tabs,
  defaultTab,
  activeTab: activeTabProp,
  onTabChange,
  footer,
  size = 'medium',
  children,
}: DetailDrawerProps) {
  const styles = useStyles();
  const tabList = tabs ?? [];
  const tabKey = (t: DrawerTab) => t.id ?? t.key ?? '';
  const [internalTab, setInternalTab] = useState<string>(defaultTab ?? tabKey(tabList[0] ?? ({} as DrawerTab)));
  const activeTab = activeTabProp ?? internalTab;
  const selectTab = (value: string) => {
    onTabChange?.(value);
    if (activeTabProp === undefined) setInternalTab(value);
  };

  const surfaceClassName = `${styles.surface} ${size === 'large' ? styles.surfaceLarge : ''}`;
  const currentTab = tabList.find((t) => tabKey(t) === activeTab) ?? tabList[0];
  const handleClose = () => {
    onClose?.();
    onOpenChange?.(false);
  };
  const isStructuredBadges =
    Array.isArray(statusBadges) &&
    statusBadges.every((b) => b && typeof b === 'object' && 'label' in (b as object));
  const hasBadges = isStructuredBadges
    ? (statusBadges as StatusBadge[]).length > 0
    : !!statusBadges;

  return (
    <OverlayDrawer
      open={open}
      onOpenChange={(_, data) => !data.open && handleClose()}
      position="end"
      surfaceMotion={null}
      modalType="non-modal"
      className={surfaceClassName}
    >
      <DrawerHeader className={styles.header}>
        <div className={styles.headerTopRow}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {eyebrow && <div className={styles.eyebrow}>{eyebrow}</div>}
            <DrawerHeaderTitle className={styles.title} heading={undefined}>
              {title}
            </DrawerHeaderTitle>
            {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
          </div>
          <Button
            appearance="subtle"
            icon={<Dismiss20Regular />}
            onClick={handleClose}
            aria-label="Fermer"
            className={styles.closeBtn}
          />
        </div>

        {(hasBadges || headerActions) && (
          <div className={styles.headerActionsRow}>
            {hasBadges && (
              <div className={styles.badgeRow}>
                {isStructuredBadges
                  ? (statusBadges as StatusBadge[]).map((b, i) => (
                      <Badge
                        key={`${b.label}-${i}`}
                        appearance={b.appearance ?? 'tint'}
                        color={b.color}
                        size="medium"
                      >
                        {b.label}
                      </Badge>
                    ))
                  : (statusBadges as ReactNode)}
              </div>
            )}
            {headerActions && <div style={{ display: 'flex', gap: '6px' }}>{headerActions}</div>}
          </div>
        )}
      </DrawerHeader>

      {tabList.length > 1 && (
        <div className={styles.tabsWrapper}>
          <TabList
            selectedValue={activeTab}
            onTabSelect={(_, data) => selectTab(data.value as string)}
            size="medium"
          >
            {tabList.map((t) => (
              <Tab key={tabKey(t)} value={tabKey(t)}>
                {t.label}
                {typeof t.count === 'number' && <span className={styles.tabCount}>{t.count}</span>}
                {typeof t.alertCount === 'number' && t.alertCount > 0 && (
                  <span className={styles.tabAlert}>{t.alertCount}</span>
                )}
              </Tab>
            ))}
          </TabList>
        </div>
      )}

      <DrawerBody className={styles.body}>
        {currentTab?.content ?? children}
      </DrawerBody>

      {footer && <div className={styles.footer}>{footer}</div>}
    </OverlayDrawer>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers de composition                                              */
/* ------------------------------------------------------------------ */

const useSectionStyles = makeStyles({
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #F4F2EC',
    padding: '20px 22px',
    marginBottom: '14px',
    boxShadow: '0 1px 2px rgba(15, 15, 15, 0.03)',
    transition: 'border-color 220ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 220ms',
    ':hover': {
      borderTopColor: '#ECEAE4', borderRightColor: '#ECEAE4', borderBottomColor: '#ECEAE4', borderLeftColor: '#ECEAE4',
      boxShadow: '0 2px 6px rgba(15, 15, 15, 0.04)',
    },
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    marginBottom: '14px',
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#737373',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  fieldGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    rowGap: '14px',
    columnGap: '20px',
    '@media (max-width: 520px)': {
      gridTemplateColumns: '1fr',
    },
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  fieldLabel: {
    fontSize: '10.5px',
    fontWeight: 600,
    color: '#A3A3A3',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '5px',
  },
  fieldValue: {
    fontSize: '13.5px',
    fontWeight: 500,
    color: '#1A1A1A',
    wordBreak: 'break-word',
  },
  fieldValueMono: {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '12.5px',
    fontWeight: 600,
    color: '#404040',
    backgroundColor: '#F4F2EC',
    padding: '2px 8px',
    borderRadius: '5px',
    display: 'inline-block',
    width: 'fit-content',
  },
});

interface DrawerSectionProps {
  title: string;
  action?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}

export function DrawerSection({ title, action, description, children }: DrawerSectionProps) {
  const styles = useSectionStyles();
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>{title}</span>
        {action}
      </div>
      {description && (
        <p style={{ fontSize: '12.5px', color: '#525252', margin: '0 0 12px', lineHeight: 1.55 }}>
          {description}
        </p>
      )}
      {children}
    </section>
  );
}

type FieldGridItem = { label: string; value: ReactNode; mono?: boolean; full?: boolean };

interface FieldGridProps {
  fields?: FieldGridItem[];
  items?: FieldGridItem[];
}

export function FieldGrid({ fields, items }: FieldGridProps) {
  const styles = useSectionStyles();
  const list = fields ?? items ?? [];
  return (
    <div className={styles.fieldGrid}>
      {list.map((f, i) => (
        <div
          key={`${f.label}-${i}`}
          className={styles.field}
          style={f.full ? { gridColumn: '1 / -1' } : undefined}
        >
          <span className={styles.fieldLabel}>{f.label}</span>
          <span className={f.mono ? styles.fieldValueMono : styles.fieldValue}>
            {f.value ?? '—'}
          </span>
        </div>
      ))}
    </div>
  );
}

/* Timeline ------------------------------ */

const useTimelineStyles = makeStyles({
  timeline: {
    position: 'relative',
    paddingLeft: '24px',
    '::before': {
      content: '""',
      position: 'absolute',
      left: '9px',
      top: '10px',
      bottom: '8px',
      width: '2px',
      background: 'linear-gradient(180deg, #FDE0E3 0%, #F4F2EC 100%)',
      borderRadius: '999px',
    },
  },
  item: {
    position: 'relative',
    paddingBottom: '20px',
    ':last-child': { paddingBottom: 0 },
  },
  dot: {
    position: 'absolute',
    left: '-19px',
    top: '5px',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: '#FFFFFF',
    border: '2px solid #c8102e',
    boxShadow: '0 0 0 3px #FFFFFF, 0 0 8px rgba(200, 16, 46, 0.20)',
  },
  itemHeader: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '10px',
    marginBottom: '3px',
    flexWrap: 'wrap',
  },
  itemTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#1A1A1A',
    letterSpacing: '-0.005em',
  },
  itemMeta: {
    fontSize: '11px',
    color: '#A3A3A3',
    fontFamily: '"JetBrains Mono", monospace',
    fontWeight: 500,
  },
  itemBody: {
    fontSize: '12.5px',
    color: '#525252',
    lineHeight: 1.55,
  },
});

export interface TimelineEvent {
  id?: string;
  date?: string;
  when?: string;
  title: string;
  author?: string;
  description?: ReactNode;
  detail?: ReactNode;
  color?: string;
}

export function DrawerTimeline({ events }: { events: TimelineEvent[] }) {
  const styles = useTimelineStyles();
  return (
    <div className={styles.timeline}>
      {events.map((e, i) => {
        const meta = e.date ?? e.when ?? '';
        const body = e.description ?? e.detail;
        return (
          <div key={e.id ?? `${e.title}-${i}`} className={styles.item}>
            <span className={styles.dot} style={e.color ? { borderTopColor: e.color, borderRightColor: e.color, borderBottomColor: e.color, borderLeftColor: e.color} : undefined} />
            <div className={styles.itemHeader}>
              <span className={styles.itemTitle}>{e.title}</span>
              <span className={styles.itemMeta}>
                {meta}
                {e.author ? ` · ${e.author}` : ''}
              </span>
            </div>
            {body && <div className={styles.itemBody}>{body}</div>}
          </div>
        );
      })}
    </div>
  );
}
