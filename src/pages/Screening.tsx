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
  if (score >= 80) return '#E30613';
  if (score >= 60) return '#B45309';
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
  const { notifySuccess, notifyWarning, notifyInfo } = useNotifications();

  // Résultats de screening réels depuis Dataverse (afb_resultatscreening).
  const { data: rawAlerts, isLoading, error } = resultatsScreening.useList({ top: 200 });
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
      if (search && !a.cible.toLowerCase().includes(search.toLowerCase())) return false;
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
    await new Promise((r) => setTimeout(r, 600));
    if (!openAlert) return;
    if (confirmIntent === 'validate') {
      notifyInfo('Match classé en faux positif', {
        description: `${openAlert.id} · ${openAlert.cible} — justification archivée.`,
      });
    } else if (confirmIntent === 'reject') {
      notifyWarning('Match confirmé — escalade', {
        description: `${openAlert.id} — alerte transmise au RCSI. Motif : ${motif}.`,
        timeout: 7000,
      });
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
    notifySuccess('Screening relancé', {
      description: `${perimetre === 'all' ? 'Portefeuille complet' : 'Périmètre filtré'} · Sources : ${sources}.${fullRefresh ? ' Réinitialisation des décisions précédentes.' : ''}`,
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
          <Tooltip content="Voir l'alerte" relationship="label">
            <Button size="small" appearance="subtle" icon={<Eye20Regular />} onClick={() => open(a)} />
          </Tooltip>
          <Tooltip content="Faux positif" relationship="label">
            <Button
              size="small"
              appearance="subtle"
              icon={<CheckmarkCircle20Regular style={{ color: '#15803D' }} />}
              disabled={a.statut === 'Faux positif' || a.statut === 'Confirmé'}
              onClick={() => { setOpenAlert(a); setConfirmIntent('validate'); }}
            />
          </Tooltip>
          <Tooltip content="Confirmer le match" relationship="label">
            <Button
              size="small"
              appearance="subtle"
              icon={<DismissCircle20Regular style={{ color: '#E30613' }} />}
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
                notifySuccess(ok ? 'Export généré' : 'Aucune donnée', {
                  description: ok ? `${filtered.length} alertes exportées (CSV).` : 'Aucune alerte à exporter.',
                });
              }}
            >
              Export
            </Button>
            <Button icon={<PlayCircle20Regular />} appearance="primary" onClick={() => setRelaunchOpen(true)}>
              Relancer screening
            </Button>
          </>
        }
      />

      <div className={styles.kpiRow}>
        <div className={styles.kpi} onClick={() => { setSourceFilter(''); setStatutFilter(''); }}>
          <div className={styles.kpiLabel}>Alertes totales</div>
          <div className={styles.kpiValue}>{kpis.total}</div>
          <div className={styles.kpiMeta}>7 derniers jours</div>
        </div>
        <div className={styles.kpi} onClick={() => setStatutFilter('Nouveau')}>
          <div className={styles.kpiLabel}>À traiter</div>
          <div className={styles.kpiValue} style={{ color: '#B45309' }}>{kpis.aRevoir}</div>
          <div className={styles.kpiMeta}>nouveau · en revue</div>
        </div>
        <div className={styles.kpi} onClick={() => setStatutFilter('Confirmé')}>
          <div className={styles.kpiLabel}>Confirmés</div>
          <div className={styles.kpiValue} style={{ color: '#E30613' }}>{kpis.confirmes}</div>
          <div className={styles.kpiMeta}>escalade DCONF</div>
        </div>
        <div className={styles.kpi} onClick={() => setStatutFilter('Faux positif')}>
          <div className={styles.kpiLabel}>Faux positifs</div>
          <div className={styles.kpiValue} style={{ color: '#15803D' }}>{kpis.fauxPositifs}</div>
          <div className={styles.kpiMeta}>justifiés</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <Card
          flush
          title={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheckmark20Regular /> Alertes de screening
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
            <div style={{ padding: '24px', color: '#C20012', fontSize: '13px' }}>
              Erreur de chargement depuis Dataverse : {error.message}
            </div>
          ) : isLoading ? (
            <div style={{ padding: '24px', color: '#767676', fontSize: '13px' }}>Chargement des alertes…</div>
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
            Toutes les sources sont interrogées quotidiennement à 03h00 (heure de Douala) via API externe.
          </div>
        </Card>
      </div>

      {/* Drawer alerte */}
      <DetailDrawer
        open={openAlert !== null && confirmIntent === null}
        onOpenChange={(o) => !o && setOpenAlert(null)}
        eyebrow={`Alerte · ${openAlert?.source ?? ''}`}
        title={openAlert?.cible ?? ''}
        subtitle={openAlert?.id}
        size="large"
        statusBadges={
          openAlert ? (
            <>
              <Badge appearance="filled" color={matchColor(openAlert.match)} size="small">
                Match {openAlert.match}
              </Badge>
              <Badge appearance="tint" color={statutColor(openAlert.statut)} size="small">
                {openAlert.statut}
              </Badge>
              <Badge appearance="tint" color="brand" size="small">
                Score {openAlert.score}
              </Badge>
            </>
          ) : null
        }
        tabs={[
          { id: 'match', label: 'Détails du match' },
          { id: 'cible', label: 'Cible AFB' },
          { id: 'historique', label: 'Historique' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        footer={
          openAlert && (openAlert.statut === 'Nouveau' || openAlert.statut === 'En revue') ? (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
              <Button appearance="outline" onClick={() => setConfirmIntent('reject')}>
                Confirmer le match
              </Button>
              <Button appearance="primary" onClick={() => setConfirmIntent('validate')}>
                Classer en faux positif
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
                  <Warning20Filled style={{ color: '#E30613', flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#A50410', marginBottom: '4px' }}>
                      Match {openAlert.match} détecté sur {openAlert.source}
                    </div>
                    <div style={{ fontSize: '12px', color: '#A50410', marginBottom: '12px' }}>
                      Score de similarité {openAlert.score} — vérification requise par {openAlert.charge}.
                    </div>
                    <div className={styles.matchFields}>
                      <div>
                        <div className={styles.matchLabel}>Nom dans la liste</div>
                        <div className={styles.matchValue}>{openAlert.cible}</div>
                      </div>
                      <div>
                        <div className={styles.matchLabel}>Liste source</div>
                        <div className={styles.matchValue}>{openAlert.source}</div>
                      </div>
                      <div>
                        <div className={styles.matchLabel}>Date d'inscription</div>
                        <div className={styles.matchValue}>04/02/2024</div>
                      </div>
                      <div>
                        <div className={styles.matchLabel}>Motif d’inscription</div>
                        <div className={styles.matchValue}>Sanctions financières internationales</div>
                      </div>
                    </div>
                  </div>
                </div>

                <DrawerSection title="Critères de matching">
                  <FieldGrid
                    items={[
                      { label: 'Type de cible', value: openAlert.typeCible },
                      { label: 'Algorithme', value: 'Levenshtein + phonétique', mono: true },
                      { label: 'Score', value: <strong style={{ color: scoreColor(openAlert.score) }}>{openAlert.score} / 100</strong> },
                      { label: 'Seuil de déclenchement', value: '60', mono: true },
                    ]}
                  />
                </DrawerSection>

                <DrawerSection title="Note du chargé">
                  <p style={{ fontSize: '13px', color: '#404040', lineHeight: 1.6, margin: 0 }}>
                    Homonymie possible avec un dirigeant d'une banque correspondante. Date de naissance différente
                    (1972 vs 1968 dans la liste). Lieu de résidence ne correspond pas. <strong>À classer en faux positif</strong>
                    après vérification supplémentaire de la pièce d’identité.
                  </p>
                </DrawerSection>
              </>
            )}

            {activeTab === 'cible' && (
              <DrawerSection title="Identification de la cible chez AFB">
                <FieldGrid
                  items={[
                    { label: 'Référence interne', value: openAlert.id, mono: true },
                    { label: 'Cible', value: openAlert.cible },
                    { label: 'Type', value: openAlert.typeCible },
                    { label: 'Chargé', value: openAlert.charge },
                    { label: 'Pays', value: 'Cameroun' },
                    { label: 'Statut relation', value: 'Active' },
                  ]}
                />
              </DrawerSection>
            )}

            {activeTab === 'historique' && (
              <DrawerSection title="Historique de l'alerte">
                <DrawerTimeline
                  events={[
                    {
                      when: openAlert.detecteLe,
                      title: `Match détecté sur ${openAlert.source}`,
                      detail: `Score ${openAlert.score} — alerte créée automatiquement`,
                    },
                    {
                      when: openAlert.detecteLe,
                      title: 'Notification au chargé',
                      detail: `${openAlert.charge} a été notifié par e-mail`,
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
        title="Classer ce match en faux positif ?"
        description="Le faux positif est archivé avec justification. Le tiers reste actif mais reste screené lors des batches suivants."
        confirmLabel="Confirmer le faux positif"
        requireMotif
        motifLabel="Justification"
        motifPlaceholder="Date de naissance différente, lieu de résidence non correspondant, vérification de la pièce d’identité…"
        entityRef={openAlert?.id}
        onConfirm={onConfirm}
      />
      <ConfirmActionDialog
        open={confirmIntent === 'reject' && openAlert !== null}
        onOpenChange={(o) => !o && setConfirmIntent(null)}
        intent="reject"
        title="Confirmer le match comme positif ?"
        description="Le match confirmé déclenche une escalade automatique au RCSI et bloque les opérations avec ce tiers."
        confirmLabel="Confirmer le match"
        requireMotif
        motifLabel="Justification du match"
        motifPlaceholder="Concordance des identifiants, confirmation par la pièce d’identité, recoupement avec d’autres sources…"
        entityRef={openAlert?.id}
        helperNote="L'escalade est irréversible. Le tiers sera suspendu en attente de la décision du RCSI."
        onConfirm={onConfirm}
      />

      {/* Modal relancer */}
      <FormDialog
        open={relaunchOpen}
        onOpenChange={setRelaunchOpen}
        eyebrow="Screening"
        title="Relancer le screening"
        subtitle="Exécute une interrogation immédiate des sources sélectionnées, en plus du batch nocturne automatique."
        size="medium"
        submitLabel="Lancer le screening"
        onSubmit={submitRelaunch}
      >
        <FormSection title="Périmètre">
          <Field label="Cibles à screener" required>
            <Dropdown
              value={perimetre === 'all' ? 'Portefeuille complet (1 247 tiers)' : 'Périmètre filtré (alertes en cours)'}
              selectedOptions={[perimetre]}
              onOptionSelect={(_, d) => setPerimetre(d.optionValue ?? 'all')}
            >
              <Option value="all">Portefeuille complet (1 247 tiers)</Option>
              <Option value="filtered">Périmètre filtré (alertes en cours)</Option>
              <Option value="new">Tiers entrants des 30 derniers jours</Option>
            </Dropdown>
          </Field>
        </FormSection>

        <FormSection title="Sources à interroger">
          <FieldRow cols={2}>
            <Checkbox checked={sourceONU} onChange={(_, d) => setSourceONU(!!d.checked)} label="ONU — Sanctions Council" />
            <Checkbox checked={sourceOFAC} onChange={(_, d) => setSourceOFAC(!!d.checked)} label="OFAC — SDN List" />
            <Checkbox checked={sourceUE} onChange={(_, d) => setSourceUE(!!d.checked)} label="Union européenne — CFSP" />
            <Checkbox checked={sourceInterpol} onChange={(_, d) => setSourceInterpol(!!d.checked)} label="Interpol — Notices rouges" />
            <Checkbox checked={sourcePPE} onChange={(_, d) => setSourcePPE(!!d.checked)} label="PPE — Dow Jones / WorldCheck" />
          </FieldRow>
        </FormSection>

        <FormSection title="Options avancées">
          <Field>
            <Switch
              checked={fullRefresh}
              onChange={(_, d) => setFullRefresh(d.checked)}
              label="Réinitialiser les décisions précédentes (faux positifs, confirmés)"
            />
          </Field>
          <div style={{ fontSize: '12px', color: '#767676', lineHeight: 1.5 }}>
            <strong>Note :</strong> sans réinitialisation, les décisions historiques sont préservées. Avec
            réinitialisation, chaque match est ré-instruit indépendamment des décisions passées.
          </div>
        </FormSection>
      </FormDialog>
    </div>
  );
}