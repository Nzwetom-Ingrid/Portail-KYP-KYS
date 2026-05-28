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
import { journalAudit } from '@/lib/dataverse/entityHooks';
import { toAuditLog } from '@/lib/dataverse/auditMappers';
import {
  DetailDrawer,
  DrawerSection,
  FieldGrid,
} from '@/components/common/DetailDrawer';
import { useNotifications } from '@/components/common/NotificationProvider';
import { exportToCsv } from '@/lib/exportCsv';

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
  if (r === 'Succès') {
    return (
      <span className={styles.resultatCell} style={{ color: '#15803D' }}>
        <CheckmarkCircle16Filled /> Succès
      </span>
    );
  }
  if (r === 'Échec') {
    return (
      <span className={styles.resultatCell} style={{ color: '#E30613' }}>
        <ErrorCircle16Filled /> Échec
      </span>
    );
  }
  return (
    <span className={styles.resultatCell} style={{ color: '#B45309' }}>
      <Warning16Filled /> Avertissement
    </span>
  );
}

function resultatColor(r: AuditLog['resultat']) {
  if (r === 'Succès') return 'success';
  if (r === 'Échec') return 'danger';
  return 'warning';
}

function buildPayload(log: AuditLog): string {
  const base = {
    eventId: log.id,
    timestamp: log.horodatage + ' UTC+01',
    actor: {
      principal: log.utilisateur,
      role: 'Chargé conformité',
      direction: 'DCONF',
      sessionId: 'sess_8a4f9c2e-31bd-4f70',
    },
    action: {
      category: log.categorie,
      verb: log.action,
      target: log.cible,
    },
    result: log.resultat,
    context: {
      ipAddress: log.ip,
      userAgent: 'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36',
      geo: { country: 'CM', city: 'Yaoundé', asn: 'CAMTEL' },
      mfa: { verified: true, method: 'TOTP' },
    },
    payload:
      log.categorie === 'Validation'
        ? { decision: 'Validé', score: 78, niveau: 'Standard', motif: '—', archived: true, retention: '10 ans' }
        : log.categorie === 'Screening'
          ? { sources: ['ONU', 'OFAC', 'UE', 'PPE'], matches: 0, durationMs: 412 }
          : log.categorie === 'Export'
            ? { format: 'PDF', sizeBytes: 2_478_315, fileName: 'reporting_cobac_2026Q1.pdf' }
            : { changes: ['statut: En cours → Validé'] },
    integrity: {
      hash: 'sha256:7b9c4e1f...a82d',
      previousHash: 'sha256:0c41e2b9...1f0c',
      sealed: true,
    },
  };
  return JSON.stringify(base, null, 2);
}

export default function AuditLogs() {
  const styles = useStyles();
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
  const logs = useMemo(() => (rawLogs ?? []).map(toAuditLog), [rawLogs]);

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
    { key: 'action', header: 'Action', render: (l) => l.action },
    { key: 'cible', header: 'Cible', render: (l) => <span style={{ color: '#767676' }}>{l.cible}</span> },
    { key: 'resultat', header: 'Résultat', render: (l) => <ResultatBadge r={l.resultat} /> },
    { key: 'ip', header: 'Adresse IP', render: (l) => <span className={styles.ipCell}>{l.ip}</span> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (l) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Tooltip content="Voir le détail" relationship="label">
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
                  IP: l.ip,
                })),
              );
              notifySuccess(ok ? 'Export généré' : 'Aucune donnée', {
                description: ok ? `${filtered.length} événements exportés (CSV).` : 'Aucun événement à exporter.',
              });
            }}
          >
            Export CSV
          </Button>
        }
      />

      <div className={styles.kpiRow}>
        <div className={styles.kpi} onClick={() => { setCategorieFilter(''); setResultatFilter(''); }}>
          <div className={styles.kpiLabel}>Événements 24h</div>
          <div className={styles.kpiValue}>{counts.total24h}</div>
          <div className={styles.kpiMeta}>toutes catégories</div>
        </div>
        <div className={styles.kpi} onClick={() => setResultatFilter('Succès')}>
          <div className={styles.kpiLabel}>Succès</div>
          <div className={styles.kpiValue} style={{ color: '#15803D' }}>{counts.succes24h}</div>
          <div className={styles.kpiMeta}>actions abouties</div>
        </div>
        <div className={styles.kpi} onClick={() => setResultatFilter('Avertissement')}>
          <div className={styles.kpiLabel}>Avertissements</div>
          <div className={styles.kpiValue} style={{ color: '#B45309' }}>{counts.avertissements24h}</div>
          <div className={styles.kpiMeta}>à examiner</div>
        </div>
        <div className={styles.kpi} onClick={() => setResultatFilter('Échec')}>
          <div className={styles.kpiLabel}>Échecs</div>
          <div className={styles.kpiValue} style={{ color: '#E30613' }}>{counts.echecs24h}</div>
          <div className={styles.kpiMeta}>connexions / actions refusées</div>
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
            <History20Regular /> Journal d’audit
          </span>
        }
        subtitle={`${filtered.length} sur ${logs.length} événements`}
      >
        {error ? (
          <div style={{ padding: '24px', color: '#C20012', fontSize: '13px' }}>
            Erreur de chargement depuis Dataverse : {error.message}
          </div>
        ) : isLoading ? (
          <div style={{ padding: '24px', color: '#767676', fontSize: '13px' }}>Chargement du journal…</div>
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
        eyebrow={`Événement · ${openLog?.id ?? ''}`}
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
                Lecture seule
              </Badge>
            </>
          ) : null
        }
        tabs={[
          { id: 'synthese', label: 'Synthèse' },
          { id: 'contexte', label: 'Contexte technique' },
          { id: 'payload', label: 'Payload JSON' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        {openLog && (
          <>
            <div className={styles.banner}>
              <LockClosed20Regular style={{ color: '#404040', flexShrink: 0, marginTop: '1px' }} />
              <div style={{ fontSize: '12.5px', color: '#404040', lineHeight: 1.5 }}>
                <strong>Journal en lecture seule.</strong> Conformément à l'Article 12 COBAC R-2023/01,
                les événements d'audit ne sont pas modifiables et sont conservés 10 ans avec scellement
                cryptographique (chaîne de hash).
              </div>
            </div>

            {activeTab === 'synthese' && (
              <>
                <DrawerSection title="Acteur">
                  <FieldGrid
                    items={[
                      { label: 'Utilisateur', value: openLog.utilisateur },
                      { label: 'Rôle', value: 'Chargé conformité' },
                      { label: 'Direction', value: 'DCONF' },
                      { label: 'Session ID', value: 'sess_8a4f9c2e-31bd-4f70', mono: true },
                    ]}
                  />
                </DrawerSection>
                <DrawerSection title="Action">
                  <FieldGrid
                    items={[
                      { label: 'Catégorie', value: openLog.categorie },
                      { label: 'Action', value: openLog.action },
                      { label: 'Cible', value: openLog.cible, mono: true, full: true },
                      { label: 'Résultat', value: <ResultatBadge r={openLog.resultat} /> },
                      { label: 'Horodatage', value: openLog.horodatage, mono: true },
                    ]}
                  />
                </DrawerSection>
              </>
            )}

            {activeTab === 'contexte' && (
              <>
                <DrawerSection title="Réseau">
                  <FieldGrid
                    items={[
                      { label: 'Adresse IP', value: openLog.ip, mono: true },
                      { label: 'Géolocalisation', value: 'Yaoundé, Cameroun (CM)' },
                      { label: 'Opérateur (ASN)', value: 'CAMTEL' },
                      { label: 'User-Agent', value: 'Edge 124 / Windows 11', mono: true },
                    ]}
                  />
                </DrawerSection>
                <DrawerSection title="Sécurité">
                  <FieldGrid
                    items={[
                      { label: 'Authentification', value: 'Azure AD B2C' },
                      { label: 'MFA', value: 'Vérifié (TOTP)' },
                      { label: 'Token issuer', value: 'sts.windows.net/afribank.com', mono: true },
                    ]}
                  />
                </DrawerSection>
                <DrawerSection title="Intégrité">
                  <FieldGrid
                    items={[
                      { label: 'Hash événement', value: 'sha256:7b9c4e1f…a82d', mono: true },
                      { label: 'Hash précédent', value: 'sha256:0c41e2b9…1f0c', mono: true },
                      { label: 'Scellé', value: 'Oui (chaîne vérifiée)' },
                    ]}
                  />
                </DrawerSection>
              </>
            )}

            {activeTab === 'payload' && (
              <DrawerSection title="Payload JSON" description="Document brut tel que stocké dans le journal d'audit Dataverse.">
                <pre className={styles.payload}>{buildPayload(openLog)}</pre>
              </DrawerSection>
            )}
          </>
        )}
      </DetailDrawer>
    </div>
  );
}