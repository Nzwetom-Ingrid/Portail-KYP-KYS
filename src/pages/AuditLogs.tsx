import { useMemo, useState } from 'react';
import { Badge, Button, makeStyles, Tooltip } from '@fluentui/react-components';
import {
  ArrowDownload20Regular,
  CheckmarkCircle16Filled,
  ErrorCircle16Filled,
  History20Regular,
  Warning16Filled,
  Eye20Regular,
  LockClosed20Regular,
} from '@fluentui/react-icons';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';
import { FilterBar } from '@/components/common/FilterBar';
import { DataTable, type Column } from '@/components/common/DataTable';
import { type AuditLog } from '@/lib/mockData';
import { journalAudit, utilisateursInternes } from '@/lib/dataverse/entityHooks';
import { toAuditLog } from '@/lib/dataverse/auditMappers';
import {
  DetailDrawer,
  DrawerSection,
  FieldGrid,
} from '@/components/common/DetailDrawer';
import { useNotifications } from '@/components/common/NotificationProvider';
import { exportToCsv } from '@/lib/exportCsv';
import { useT } from '@/i18n/i18n';

const useStyles = makeStyles({
  kpiRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
    marginBottom: '16px',
  },
  kpi: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '18px 20px',
    border: '1px solid #F4F4F4',
    boxShadow: '0 1px 2px rgba(15, 15, 15, 0.04)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    ':hover': { borderTopColor: '#FCE4E6', borderRightColor: '#FCE4E6', borderBottomColor: '#FCE4E6', borderLeftColor: '#FCE4E6'},
  },
  kpiLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#767676',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '6px',
  },
  kpiValue: { fontSize: '28px', fontWeight: 700, lineHeight: 1 },
  kpiMeta: { fontSize: '12px', color: '#767676', marginTop: '6px' },
  resultatCell: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontWeight: 600,
    fontSize: '13px',
  },
  timestampCell: { fontFamily: 'monospace', fontSize: '12px', color: '#404040' },
  ipCell: { fontFamily: 'monospace', fontSize: '12px', color: '#767676' },
  payload: {
    fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
    fontSize: '12px',
    backgroundColor: '#1A1A1A',
    color: '#F4F4F4',
    padding: '14px 16px',
    borderRadius: '8px',
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
    lineHeight: 1.5,
    maxHeight: '320px',
  },
  banner: {
    display: 'flex',
    gap: '10px',
    padding: '12px 14px',
    backgroundColor: '#FAFAFA',
    border: '1px solid #F4F4F4',
    borderRadius: '8px',
    marginBottom: '14px',
  },
});

const CATEGORIE_OPTIONS = [
  { label: 'Toutes catégories', value: '' },
  { label: 'Validation', value: 'Validation' },
  { label: 'Connexion', value: 'Connexion' },
  { label: 'Modification', value: 'Modification' },
  { label: 'Export', value: 'Export' },
  { label: 'Administration', value: 'Administration' },
  { label: 'Screening', value: 'Screening' },
];

const RESULTAT_OPTIONS = [
  { label: 'Tous résultats', value: '' },
  { label: 'Succès', value: 'Succès' },
  { label: 'Échec', value: 'Échec' },
  { label: 'Avertissement', value: 'Avertissement' },
];

function categorieColor(c: AuditLog['categorie']) {
  if (c === 'Validation') return 'brand';
  if (c === 'Administration') return 'danger';
  if (c === 'Screening') return 'warning';
  if (c === 'Export') return 'informative';
  return 'subtle';
}

function ResultatBadge({ r }: { r: AuditLog['resultat'] }) {
  const styles = useStyles();
  const { t } = useT();
  if (r === 'Succès') {
    return (
      <span className={styles.resultatCell} style={{ color: '#15803D' }}>
        <CheckmarkCircle16Filled /> {t('Succès')}
      </span>
    );
  }
  if (r === 'Échec') {
    return (
      <span className={styles.resultatCell} style={{ color: 'var(--accent)' }}>
        <ErrorCircle16Filled /> {t('Échec')}
      </span>
    );
  }
  return (
    <span className={styles.resultatCell} style={{ color: 'var(--warning)' }}>
      <Warning16Filled /> {t('Avertissement')}
    </span>
  );
}

function resultatColor(r: AuditLog['resultat']) {
  if (r === 'Succès') return 'success';
  if (r === 'Échec') return 'danger';
  return 'warning';
}

export default function AuditLogs() {
  const styles = useStyles();
  const { t } = useT();
  const { notifySuccess } = useNotifications();
  const [search, setSearch] = useState('');
  const [categorieFilter, setCategorieFilter] = useState('');
  const [resultatFilter, setResultatFilter] = useState('');
  const [openLog, setOpenLog] = useState<AuditLog | null>(null);
  const [activeTab, setActiveTab] = useState('synthese');

  // Journal d'audit réel depuis Dataverse (afb_journalaudit), trié récents d'abord.
  const { data: rawLogs, isLoading, error } = journalAudit.useList({
    top: 200,
    orderBy: ['afb_horodatage desc'],
  });
  // Utilisateurs internes pour résoudre le nom de l'auteur (le `*name` n'est pas renvoyé).
  const { data: rawUsers } = utilisateursInternes.useList({ top: 500 });
  const usersByGuid = useMemo(
    () => new Map((rawUsers ?? []).map((u) => [u.afb_utilisateurinterneid, u.afb_nomcomplet])),
    [rawUsers],
  );
  const logs = useMemo(
    () => (rawLogs ?? []).map((l) => toAuditLog(l, usersByGuid)),
    [rawLogs, usersByGuid],
  );

  const counts = useMemo(
    () => ({
      total24h: logs.length,
      succes24h: logs.filter((l) => l.resultat === 'Succès').length,
      echecs24h: logs.filter((l) => l.resultat === 'Échec').length,
      avertissements24h: logs.filter((l) => l.resultat === 'Avertissement').length,
    }),
    [logs],
  );

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (categorieFilter && l.categorie !== categorieFilter) return false;
      if (resultatFilter && l.resultat !== resultatFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!l.utilisateur.toLowerCase().includes(q) && !l.action.toLowerCase().includes(q) && !l.cible.toLowerCase().includes(q))
          return false;
      }
      return true;
    });
  }, [logs, search, categorieFilter, resultatFilter]);

  const open = (l: AuditLog) => {
    setOpenLog(l);
    setActiveTab('synthese');
  };

  const columns: Column<AuditLog>[] = [
    { key: 'horodatage', header: 'Horodatage', render: (l) => <span className={styles.timestampCell}>{l.horodatage}</span> },
    { key: 'utilisateur', header: 'Utilisateur', render: (l) => <strong style={{ color: '#1A1A1A' }}>{l.utilisateur}</strong> },
    {
      key: 'categorie',
      header: 'Catégorie',
      render: (l) => (
        <Badge appearance="tint" color={categorieColor(l.categorie)} size="small">
          {l.categorie}
        </Badge>
      ),
    },
    { key: 'cible', header: 'Cible', render: (l) => <span style={{ color: '#767676' }}>{l.cible}</span> },
    { key: 'resultat', header: 'Résultat', render: (l) => <ResultatBadge r={l.resultat} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (l) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Tooltip content={t('Voir le détail')} relationship="label">
            <Button size="small" appearance="subtle" icon={<Eye20Regular />} onClick={() => open(l)} />
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Logs d’audit"
        subtitle="Trace immuable de toutes les actions sensibles — exigence COBAC R-2023/01 article 12, conservation 10 ans."
        actions={
          <Button
            icon={<ArrowDownload20Regular />}
            appearance="outline"
            onClick={() => {
              const ok = exportToCsv(
                `journal-audit-${new Date().toISOString().slice(0, 10)}.csv`,
                filtered.map((l) => ({
                  Horodatage: l.horodatage,
                  Utilisateur: l.utilisateur,
                  Catégorie: l.categorie,
                  Action: l.action,
                  Cible: l.cible,
                  Résultat: l.resultat,
                })),
              );
              notifySuccess(ok ? t('Export généré') : t('Aucune donnée'), {
                description: ok ? `${filtered.length} ${t('événements exportés (CSV).')}` : t('Aucun événement à exporter.'),
              });
            }}
          >
            {t('Export CSV')}
          </Button>
        }
      />

      <div className={styles.kpiRow}>
        <div className={styles.kpi} onClick={() => { setCategorieFilter(''); setResultatFilter(''); }}>
          <div className={styles.kpiLabel}>{t('Événements 24h')}</div>
          <div className={styles.kpiValue}>{counts.total24h}</div>
          <div className={styles.kpiMeta}>{t('toutes catégories')}</div>
        </div>
        <div className={styles.kpi} onClick={() => setResultatFilter('Succès')}>
          <div className={styles.kpiLabel}>{t('Succès')}</div>
          <div className={styles.kpiValue} style={{ color: '#15803D' }}>{counts.succes24h}</div>
          <div className={styles.kpiMeta}>{t('actions abouties')}</div>
        </div>
        <div className={styles.kpi} onClick={() => setResultatFilter('Avertissement')}>
          <div className={styles.kpiLabel}>{t('Avertissements')}</div>
          <div className={styles.kpiValue} style={{ color: 'var(--warning)' }}>{counts.avertissements24h}</div>
          <div className={styles.kpiMeta}>{t('à examiner')}</div>
        </div>
        <div className={styles.kpi} onClick={() => setResultatFilter('Échec')}>
          <div className={styles.kpiLabel}>{t('Échecs')}</div>
          <div className={styles.kpiValue} style={{ color: 'var(--danger)' }}>{counts.echecs24h}</div>
          <div className={styles.kpiMeta}>{t('connexions / actions refusées')}</div>
        </div>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher par utilisateur, action ou cible…"
        filters={[
          { key: 'categorie', label: 'Catégorie', value: categorieFilter, options: CATEGORIE_OPTIONS, onChange: setCategorieFilter },
          { key: 'resultat', label: 'Résultat', value: resultatFilter, options: RESULTAT_OPTIONS, onChange: setResultatFilter },
        ]}
      />

      <Card
        flush
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <History20Regular /> {t('Journal d’audit')}
          </span>
        }
        subtitle={`${filtered.length} sur ${logs.length} événements`}
      >
        {error ? (
          <div style={{ padding: '24px', color: 'var(--accent)', fontSize: '13px' }}>
            {t('Erreur de chargement depuis Dataverse :')} {error.message}
          </div>
        ) : isLoading ? (
          <div style={{ padding: '24px', color: '#767676', fontSize: '13px' }}>{t('Chargement du journal…')}</div>
        ) : (
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(l) => l.id}
            onRowClick={open}
            emptyMessage="Aucun événement ne correspond aux filtres."
          />
        )}
      </Card>

      {/* Drawer détail événement — read-only */}
      <DetailDrawer
        open={openLog !== null}
        onOpenChange={(o) => !o && setOpenLog(null)}
        eyebrow={`${t('Événement')} · ${openLog?.id ?? ''}`}
        title={openLog?.action ?? ''}
        subtitle={openLog ? `${openLog.utilisateur} · ${openLog.horodatage}` : ''}
        size="large"
        statusBadges={
          openLog ? (
            <>
              <Badge appearance="filled" color={categorieColor(openLog.categorie)} size="small">
                {openLog.categorie}
              </Badge>
              <Badge appearance="tint" color={resultatColor(openLog.resultat)} size="small">
                {openLog.resultat}
              </Badge>
              <Badge appearance="tint" color="subtle" size="small" icon={<LockClosed20Regular style={{ fontSize: '12px' }} />}>
                {t('Lecture seule')}
              </Badge>
            </>
          ) : null
        }
        tabs={[{ id: 'synthese', label: t('Synthèse') }]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        {openLog && (
          <>
            <div className={styles.banner}>
              <LockClosed20Regular style={{ color: '#404040', flexShrink: 0, marginTop: '1px' }} />
              <div style={{ fontSize: '12.5px', color: '#404040', lineHeight: 1.5 }}>
                <strong>{t('Journal en lecture seule.')}</strong> {t("Conformément à l'Article 12 COBAC R-2023/01, les événements d'audit ne sont pas modifiables et sont conservés 10 ans avec scellement cryptographique (chaîne de hash).")}
              </div>
            </div>

            <DrawerSection title={t('Acteur')}>
              <FieldGrid
                items={[
                  { label: t('Utilisateur'), value: openLog.utilisateur },
                  { label: t('Horodatage'), value: openLog.horodatage, mono: true },
                ]}
              />
            </DrawerSection>
            <DrawerSection title={t('Action')}>
              <FieldGrid
                items={[
                  { label: t('Catégorie'), value: openLog.categorie },
                  { label: t('Action'), value: openLog.action },
                  { label: t('Cible'), value: openLog.cible, mono: true, full: true },
                  { label: t('Résultat'), value: <ResultatBadge r={openLog.resultat} /> },
                ]}
              />
            </DrawerSection>
          </>
        )}
      </DetailDrawer>
    </div>
  );
}