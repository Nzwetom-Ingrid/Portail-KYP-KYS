import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  makeStyles,
  Tooltip,
  Field,
  Dropdown,
  Option,
  Switch,
  Checkbox,
} from '@fluentui/react-components';
import {
  ArrowDownload20Regular,
  PlayCircle20Regular,
  ShieldCheckmark20Regular,
  Eye20Regular,
  CheckmarkCircle20Regular,
  DismissCircle20Regular,
  Warning20Filled,
} from '@fluentui/react-icons';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';
import { FilterBar } from '@/components/common/FilterBar';
import { DataTable, type Column } from '@/components/common/DataTable';
import { type ScreeningAlert } from '@/lib/mockData';
import { resultatsScreening } from '@/lib/dataverse/entityHooks';
import { toScreeningAlert, SOURCE_COLORS } from '@/lib/dataverse/screeningMappers';
import {
  DetailDrawer,
  DrawerSection,
  FieldGrid,
  DrawerTimeline,
} from '@/components/common/DetailDrawer';
import { FormDialog, FormSection, FieldRow } from '@/components/common/FormDialog';
import { ConfirmActionDialog, type ConfirmIntent } from '@/components/common/ConfirmActionDialog';
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
    ':hover': { borderTopColor: '#FCE4E6', borderRightColor: '#FCE4E6', borderBottomColor: '#FCE4E6', borderLeftColor: '#FCE4E6' },
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
  scoreBar: {
    width: '60px',
    height: '6px',
    backgroundColor: '#F4F4F4',
    borderRadius: '999px',
    overflow: 'hidden',
    display: 'inline-block',
    verticalAlign: 'middle',
    marginRight: '8px',
  },
  scoreFill: { height: '100%', borderRadius: '999px' },
  sourceRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 0',
    borderBottom: '1px solid #F4F4F4',
    ':last-child': { borderBottom: 'none' },
  },
  sourceDot: { width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0 },
  sourceLabel: { flex: 1, fontSize: '13px', color: '#404040', fontWeight: 500 },
  sourceCount: { fontSize: '13px', color: '#1A1A1A', fontWeight: 700 },
  rowActions: { display: 'flex', gap: '4px', justifyContent: 'flex-end' },
  matchBanner: {
    display: 'flex',
    gap: '14px',
    padding: '16px 18px',
    backgroundColor: '#FEF2F3',
    border: '1px solid #FCE4E6',
    borderRadius: '10px',
    marginBottom: '14px',
  },
  matchFields: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '14px 24px',
    fontSize: '13px',
  },
  matchLabel: { fontSize: '11px', color: '#767676', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' },
  matchValue: { color: '#1A1A1A', fontWeight: 500 },
});

const SOURCE_OPTIONS = [
  { label: 'Toutes sources', value: '' },
  { label: 'ONU', value: 'ONU' },
  { label: 'OFAC', value: 'OFAC' },
  { label: 'UE', value: 'UE' },
  { label: 'PPE', value: 'PPE' },
  { label: 'Interpol', value: 'Interpol' },
];

const STATUT_OPTIONS = [
  { label: 'Tous statuts', value: '' },
  { label: 'Nouveau', value: 'Nouveau' },
  { label: 'En revue', value: 'En revue' },
  { label: 'Faux positif', value: 'Faux positif' },
  { label: 'Confirmé', value: 'Confirmé' },
];

function scoreColor(score: number) {
  if (score >= 80) return 'var(--accent)';
  if (score >= 60) return 'var(--warning)';
  return '#404040';
}

function matchColor(m: ScreeningAlert['match']) {
  if (m === 'Exact') return 'danger';
  if (m === 'Fort') return 'warning';
  return 'subtle';
}

function statutColor(s: ScreeningAlert['statut']) {
  if (s === 'Confirmé') return 'danger';
  if (s === 'En revue') return 'warning';
  if (s === 'Nouveau') return 'brand';
  return 'subtle';
}

export default function Screening() {
  const styles = useStyles();
  const { t } = useT();
  const { notifySuccess, notifyWarning, notifyInfo } = useNotifications();

  // Résultats de screening réels depuis Dataverse (afb_resultatscreening).
  const { data: rawAlerts, isLoading, error } = resultatsScreening.useList({ top: 200 });
  const updateResult = resultatsScreening.useUpdate();
  const alerts = useMemo(() => (rawAlerts ?? []).map(toScreeningAlert), [rawAlerts]);
  const sources = useMemo(() => {
    const counts = new Map<ScreeningAlert['source'], number>();
    alerts.forEach((a) => counts.set(a.source, (counts.get(a.source) ?? 0) + 1));
    return (Object.keys(SOURCE_COLORS) as ScreeningAlert['source'][]).map((source) => ({
      source,
      count: counts.get(source) ?? 0,
      color: SOURCE_COLORS[source],
    }));
  }, [alerts]);

  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [openAlert, setOpenAlert] = useState<ScreeningAlert | null>(null);
  const [activeTab, setActiveTab] = useState('match');
  const [confirmIntent, setConfirmIntent] = useState<ConfirmIntent | null>(null);
  const [relaunchOpen, setRelaunchOpen] = useState(false);

  // form state
  const [perimetre, setPerimetre] = useState('all');
  const [sourceONU, setSourceONU] = useState(true);
  const [sourceOFAC, setSourceOFAC] = useState(true);
  const [sourceUE, setSourceUE] = useState(true);
  const [sourceInterpol, setSourceInterpol] = useState(true);
  const [sourcePPE, setSourcePPE] = useState(true);
  const [fullRefresh, setFullRefresh] = useState(false);

  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      if (sourceFilter && a.source !== sourceFilter) return false;
      if (statutFilter && a.statut !== statutFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !a.cible.toLowerCase().includes(q) &&
          !a.source.toLowerCase().includes(q) &&
          !a.charge.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [alerts, search, sourceFilter, statutFilter]);

  const kpis = {
    total: alerts.length,
    aRevoir: alerts.filter((a) => a.statut === 'Nouveau' || a.statut === 'En revue').length,
    confirmes: alerts.filter((a) => a.statut === 'Confirmé').length,
    fauxPositifs: alerts.filter((a) => a.statut === 'Faux positif').length,
  };

  const open = (a: ScreeningAlert) => {
    setOpenAlert(a);
    setActiveTab('match');
  };

  const onConfirm = async (motif?: string) => {
    if (!openAlert) return;
    if (!openAlert.recordId) {
      notifyWarning(t('Action impossible'), { description: t('Identifiant du résultat de screening introuvable.') });
      return;
    }
    try {
      if (confirmIntent === 'validate') {
        // Faux positif → on passe le résultat à « Négatif » (0)
        await updateResult.mutateAsync({
          id: openAlert.recordId,
          changes: { afb_resultatducontrole: 0 },
        });
        notifyInfo(t('Match classé en faux positif'), {
          description: `${openAlert.id} · ${openAlert.cible} — ${t('résultat passé à « Négatif », justification archivée.')}`,
        });
      } else if (confirmIntent === 'reject') {
        // Confirmation du match → « Match positif » (747010001) + escalade RCSI
        await updateResult.mutateAsync({
          id: openAlert.recordId,
          changes: { afb_resultatducontrole: 747010001 },
        });
        notifyWarning(t('Match confirmé — escalade'), {
          description: `${openAlert.id} — ${t('alerte transmise au RCSI.')}${motif ? ` ${t('Motif :')} ${motif}.` : ''}`,
          timeout: 7000,
        });
      }
    } catch (e) {
      notifyWarning(t('Action impossible'), {
        description: e instanceof Error ? e.message : t('Erreur Dataverse lors de l’enregistrement de la décision.'),
      });
      return;
    }
    setConfirmIntent(null);
    setOpenAlert(null);
  };

  const submitRelaunch = async () => {
    await new Promise((r) => setTimeout(r, 900));
    const sources = [
      sourceONU && 'ONU',
      sourceOFAC && 'OFAC',
      sourceUE && 'UE',
      sourceInterpol && 'Interpol',
      sourcePPE && 'PPE',
    ].filter(Boolean).join(', ');
    notifySuccess(t('Screening relancé'), {
      description: `${perimetre === 'all' ? t('Portefeuille complet') : t('Périmètre filtré')} · ${t('Sources :')} ${sources}.${fullRefresh ? ` ${t('Réinitialisation des décisions précédentes.')}` : ''}`,
      timeout: 7000,
    });
    setRelaunchOpen(false);
  };

  const columns: Column<ScreeningAlert>[] = [
    { key: 'id', header: 'Référence', render: (a) => <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{a.id}</span> },
    { key: 'cible', header: 'Cible', render: (a) => <strong style={{ color: '#1A1A1A' }}>{a.cible}</strong> },
    { key: 'type', header: 'Type', render: (a) => <Badge appearance="tint" color="subtle" size="small">{a.typeCible}</Badge> },
    { key: 'source', header: 'Source', render: (a) => <Badge appearance="tint" color="brand" size="small">{a.source}</Badge> },
    { key: 'match', header: 'Match', render: (a) => <Badge appearance="filled" color={matchColor(a.match)} size="small">{a.match}</Badge> },
    {
      key: 'score',
      header: 'Score',
      render: (a) => (
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          <span className={styles.scoreBar}>
            <span className={styles.scoreFill} style={{ width: `${a.score}%`, backgroundColor: scoreColor(a.score) }} />
          </span>
          <span style={{ fontWeight: 600, color: scoreColor(a.score) }}>{a.score}</span>
        </span>
      ),
    },
    { key: 'date', header: 'Détecté le', render: (a) => a.detecteLe },
    { key: 'statut', header: 'Statut', render: (a) => <Badge appearance="tint" color={statutColor(a.statut)} size="small">{a.statut}</Badge> },
    { key: 'charge', header: 'Chargé', render: (a) => a.charge },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (a) => (
        <div className={styles.rowActions} onClick={(e) => e.stopPropagation()}>
          <Tooltip content={t("Voir l'alerte")} relationship="label">
            <Button size="small" appearance="subtle" icon={<Eye20Regular />} onClick={() => open(a)} />
          </Tooltip>
          <Tooltip content={t('Faux positif')} relationship="label">
            <Button
              size="small"
              appearance="subtle"
              icon={<CheckmarkCircle20Regular style={{ color: '#15803D' }} />}
              disabled={a.statut === 'Faux positif' || a.statut === 'Confirmé'}
              onClick={() => { setOpenAlert(a); setConfirmIntent('validate'); }}
            />
          </Tooltip>
          <Tooltip content={t('Confirmer le match')} relationship="label">
            <Button
              size="small"
              appearance="subtle"
              icon={<DismissCircle20Regular style={{ color: 'var(--accent)' }} />}
              disabled={a.statut === 'Faux positif' || a.statut === 'Confirmé'}
              onClick={() => { setOpenAlert(a); setConfirmIntent('reject'); }}
            />
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Évaluations"
        title="Screening PPE / Sanctions"
        subtitle="Résultats des interrogations ONU, OFAC, UE, Interpol et bases PPE — revue des matches détectés."
        actions={
          <>
            <Button
              icon={<ArrowDownload20Regular />}
              appearance="outline"
              onClick={() => {
                const ok = exportToCsv(
                  `screening-${new Date().toISOString().slice(0, 10)}.csv`,
                  filtered.map((a) => ({
                    Référence: a.id,
                    Cible: a.cible,
                    Type: a.typeCible,
                    Source: a.source,
                    Match: a.match,
                    Score: a.score,
                    'Détecté le': a.detecteLe,
                    Statut: a.statut,
                    Chargé: a.charge,
                  })),
                );
                notifySuccess(ok ? t('Export généré') : t('Aucune donnée'), {
                  description: ok ? `${filtered.length} ${t('alertes exportées (CSV).')}` : t('Aucune alerte à exporter.'),
                });
              }}
            >
              {t('Export')}
            </Button>
            <Button icon={<PlayCircle20Regular />} appearance="primary" onClick={() => setRelaunchOpen(true)}>
              {t('Relancer screening')}
            </Button>
          </>
        }
      />

      <div className={styles.kpiRow}>
        <div className={styles.kpi} onClick={() => { setSourceFilter(''); setStatutFilter(''); }}>
          <div className={styles.kpiLabel}>{t('Alertes totales')}</div>
          <div className={styles.kpiValue}>{kpis.total}</div>
          <div className={styles.kpiMeta}>{t('7 derniers jours')}</div>
        </div>
        <div className={styles.kpi} onClick={() => setStatutFilter('Nouveau')}>
          <div className={styles.kpiLabel}>{t('À traiter')}</div>
          <div className={styles.kpiValue} style={{ color: 'var(--warning)' }}>{kpis.aRevoir}</div>
          <div className={styles.kpiMeta}>{t('nouveau · en revue')}</div>
        </div>
        <div className={styles.kpi} onClick={() => setStatutFilter('Confirmé')}>
          <div className={styles.kpiLabel}>{t('Confirmés')}</div>
          <div className={styles.kpiValue} style={{ color: 'var(--accent)' }}>{kpis.confirmes}</div>
          <div className={styles.kpiMeta}>{t('escalade DCONF')}</div>
        </div>
        <div className={styles.kpi} onClick={() => setStatutFilter('Faux positif')}>
          <div className={styles.kpiLabel}>{t('Faux positifs')}</div>
          <div className={styles.kpiValue} style={{ color: '#15803D' }}>{kpis.fauxPositifs}</div>
          <div className={styles.kpiMeta}>{t('justifiés')}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <Card
          flush
          title={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheckmark20Regular /> {t('Alertes de screening')}
            </span>
          }
          subtitle={`${filtered.length} alertes filtrées`}
        >
          <div style={{ padding: '0 24px 16px' }}>
            <FilterBar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Rechercher une cible…"
              filters={[
                { key: 'source', label: 'Source', value: sourceFilter, options: SOURCE_OPTIONS, onChange: setSourceFilter },
                { key: 'statut', label: 'Statut', value: statutFilter, options: STATUT_OPTIONS, onChange: setStatutFilter },
              ]}
            />
          </div>
          {error ? (
            <div style={{ padding: '24px', color: 'var(--accent)', fontSize: '13px' }}>
              {t('Erreur de chargement depuis Dataverse :')} {error.message}
            </div>
          ) : isLoading ? (
            <div style={{ padding: '24px', color: '#767676', fontSize: '13px' }}>{t('Chargement des alertes…')}</div>
          ) : (
            <DataTable
              columns={columns}
              rows={filtered}
              rowKey={(a) => a.id}
              onRowClick={open}
              emptyMessage="Aucune alerte ne correspond aux filtres."
            />
          )}
        </Card>

        <Card title="Sources" subtitle="Répartition par base interrogée">
          {sources.map((s) => (
            <div key={s.source} className={styles.sourceRow}>
              <span className={styles.sourceDot} style={{ backgroundColor: s.color }} />
              <span className={styles.sourceLabel}>{s.source}</span>
              <span className={styles.sourceCount}>{s.count}</span>
            </div>
          ))}
          <div style={{ marginTop: '14px', fontSize: '12px', color: '#767676', lineHeight: 1.5 }}>
            {t('Toutes les sources sont interrogées quotidiennement à 03h00 (heure de Douala) via API externe.')}
          </div>
        </Card>
      </div>

      {/* Drawer alerte */}
      <DetailDrawer
        open={openAlert !== null && confirmIntent === null}
        onOpenChange={(o) => !o && setOpenAlert(null)}
        eyebrow={`${t('Alerte')} · ${openAlert?.source ?? ''}`}
        title={openAlert?.cible ?? ''}
        subtitle={openAlert?.id}
        size="large"
        statusBadges={
          openAlert ? (
            <>
              <Badge appearance="filled" color={matchColor(openAlert.match)} size="small">
                {t('Match')} {openAlert.match}
              </Badge>
              <Badge appearance="tint" color={statutColor(openAlert.statut)} size="small">
                {openAlert.statut}
              </Badge>
              <Badge appearance="tint" color="brand" size="small">
                {t('Score')} {openAlert.score}
              </Badge>
            </>
          ) : null
        }
        tabs={[
          { id: 'match', label: t('Détails du match') },
          { id: 'cible', label: t('Cible AFB') },
          { id: 'historique', label: t('Historique') },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        footer={
          openAlert && (openAlert.statut === 'Nouveau' || openAlert.statut === 'En revue') ? (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
              <Button appearance="outline" onClick={() => setConfirmIntent('reject')}>
                {t('Confirmer le match')}
              </Button>
              <Button appearance="primary" onClick={() => setConfirmIntent('validate')}>
                {t('Classer en faux positif')}
              </Button>
            </div>
          ) : null
        }
      >
        {openAlert && (
          <>
            {activeTab === 'match' && (
              <>
                <div className={styles.matchBanner}>
                  <Warning20Filled style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent-dark)', marginBottom: '4px' }}>
                      {t('Match')} {openAlert.match} {t('détecté sur')} {openAlert.source}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--accent-dark)', marginBottom: '12px' }}>
                      {t('Score de similarité')} {openAlert.score} — {t('vérification requise par')} {openAlert.charge}.
                    </div>
                    <div className={styles.matchFields}>
                      <div>
                        <div className={styles.matchLabel}>{t('Nom dans la liste')}</div>
                        <div className={styles.matchValue}>{openAlert.cible}</div>
                      </div>
                      <div>
                        <div className={styles.matchLabel}>{t('Liste source')}</div>
                        <div className={styles.matchValue}>{openAlert.source}</div>
                      </div>
                      <div>
                        <div className={styles.matchLabel}>{t("Date d'inscription")}</div>
                        <div className={styles.matchValue}>04/02/2024</div>
                      </div>
                      <div>
                        <div className={styles.matchLabel}>{t('Motif d’inscription')}</div>
                        <div className={styles.matchValue}>{t('Sanctions financières internationales')}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <DrawerSection title={t('Critères de matching')}>
                  <FieldGrid
                    items={[
                      { label: t('Type de cible'), value: openAlert.typeCible },
                      { label: t('Algorithme'), value: t('Levenshtein + phonétique'), mono: true },
                      { label: t('Score'), value: <strong style={{ color: scoreColor(openAlert.score) }}>{openAlert.score} / 100</strong> },
                      { label: t('Seuil de déclenchement'), value: '60', mono: true },
                    ]}
                  />
                </DrawerSection>

                <DrawerSection title={t('Note du chargé')}>
                  <p style={{ fontSize: '13px', color: '#404040', lineHeight: 1.6, margin: 0 }}>
                    {t("Homonymie possible avec un dirigeant d'une banque correspondante. Date de naissance différente (1972 vs 1968 dans la liste). Lieu de résidence ne correspond pas.")} <strong>{t('À classer en faux positif')}</strong>
                    {' '}{t('après vérification supplémentaire de la pièce d’identité.')}
                  </p>
                </DrawerSection>
              </>
            )}

            {activeTab === 'cible' && (
              <DrawerSection title={t('Identification de la cible chez AFB')}>
                <FieldGrid
                  items={[
                    { label: t('Référence interne'), value: openAlert.id, mono: true },
                    { label: t('Cible'), value: openAlert.cible },
                    { label: t('Type'), value: openAlert.typeCible },
                    { label: t('Chargé'), value: openAlert.charge },
                    { label: t('Pays'), value: t('Cameroun') },
                    { label: t('Statut relation'), value: t('Active') },
                  ]}
                />
              </DrawerSection>
            )}

            {activeTab === 'historique' && (
              <DrawerSection title={t("Historique de l'alerte")}>
                <DrawerTimeline
                  events={[
                    {
                      when: openAlert.detecteLe,
                      title: `${t('Match détecté sur')} ${openAlert.source}`,
                      detail: `${t('Score')} ${openAlert.score} — ${t('alerte créée automatiquement')}`,
                    },
                    {
                      when: openAlert.detecteLe,
                      title: t('Notification au chargé'),
                      detail: `${openAlert.charge} ${t('a été notifié par e-mail')}`,
                    },
                  ]}
                />
              </DrawerSection>
            )}
          </>
        )}
      </DetailDrawer>

      {/* Confirms */}
      <ConfirmActionDialog
        open={confirmIntent === 'validate' && openAlert !== null}
        onOpenChange={(o) => !o && setConfirmIntent(null)}
        intent="validate"
        title={t('Classer ce match en faux positif ?')}
        description={t('Le faux positif est archivé avec justification. Le tiers reste actif mais reste screené lors des batches suivants.')}
        confirmLabel={t('Confirmer le faux positif')}
        requireMotif
        motifLabel={t('Justification')}
        motifPlaceholder={t('Date de naissance différente, lieu de résidence non correspondant, vérification de la pièce d’identité…')}
        entityRef={openAlert?.id}
        onConfirm={onConfirm}
      />
      <ConfirmActionDialog
        open={confirmIntent === 'reject' && openAlert !== null}
        onOpenChange={(o) => !o && setConfirmIntent(null)}
        intent="reject"
        title={t('Confirmer le match comme positif ?')}
        description={t('Le match confirmé déclenche une escalade automatique au RCSI et bloque les opérations avec ce tiers.')}
        confirmLabel={t('Confirmer le match')}
        requireMotif
        motifLabel={t('Justification du match')}
        motifPlaceholder={t('Concordance des identifiants, confirmation par la pièce d’identité, recoupement avec d’autres sources…')}
        entityRef={openAlert?.id}
        helperNote={t("L'escalade est irréversible. Le tiers sera suspendu en attente de la décision du RCSI.")}
        onConfirm={onConfirm}
      />

      {/* Modal relancer */}
      <FormDialog
        open={relaunchOpen}
        onOpenChange={setRelaunchOpen}
        eyebrow="Screening"
        title={t('Relancer le screening')}
        subtitle={t('Exécute une interrogation immédiate des sources sélectionnées, en plus du batch nocturne automatique.')}
        size="medium"
        submitLabel={t('Lancer le screening')}
        onSubmit={submitRelaunch}
      >
        <FormSection title={t('Périmètre')}>
          <Field label={t('Cibles à screener')} required>
            <Dropdown
              value={perimetre === 'all' ? t('Portefeuille complet (1 247 tiers)') : t('Périmètre filtré (alertes en cours)')}
              selectedOptions={[perimetre]}
              onOptionSelect={(_, d) => setPerimetre(d.optionValue ?? 'all')}
            >
              <Option value="all">{t('Portefeuille complet (1 247 tiers)')}</Option>
              <Option value="filtered">{t('Périmètre filtré (alertes en cours)')}</Option>
              <Option value="new">{t('Tiers entrants des 30 derniers jours')}</Option>
            </Dropdown>
          </Field>
        </FormSection>

        <FormSection title={t('Sources à interroger')}>
          <FieldRow cols={2}>
            <Checkbox checked={sourceONU} onChange={(_, d) => setSourceONU(!!d.checked)} label={t('ONU — Sanctions Council')} />
            <Checkbox checked={sourceOFAC} onChange={(_, d) => setSourceOFAC(!!d.checked)} label={t('OFAC — SDN List')} />
            <Checkbox checked={sourceUE} onChange={(_, d) => setSourceUE(!!d.checked)} label={t('Union européenne — CFSP')} />
            <Checkbox checked={sourceInterpol} onChange={(_, d) => setSourceInterpol(!!d.checked)} label={t('Interpol — Notices rouges')} />
            <Checkbox checked={sourcePPE} onChange={(_, d) => setSourcePPE(!!d.checked)} label={t('PPE — Dow Jones / WorldCheck')} />
          </FieldRow>
        </FormSection>

        <FormSection title={t('Options avancées')}>
          <Field>
            <Switch
              checked={fullRefresh}
              onChange={(_, d) => setFullRefresh(d.checked)}
              label={t('Réinitialiser les décisions précédentes (faux positifs, confirmés)')}
            />
          </Field>
          <div style={{ fontSize: '12px', color: '#767676', lineHeight: 1.5 }}>
            <strong>{t('Note :')}</strong> {t('sans réinitialisation, les décisions historiques sont préservées. Avec réinitialisation, chaque match est ré-instruit indépendamment des décisions passées.')}
          </div>
        </FormSection>
      </FormDialog>
    </div>
  );
}