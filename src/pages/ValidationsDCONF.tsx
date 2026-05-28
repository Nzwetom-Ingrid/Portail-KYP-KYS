import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  makeStyles,
  Tooltip,
  Field,
  Textarea,
} from '@fluentui/react-components';
import {
  ArrowDownload20Regular,
  CheckmarkCircle20Regular,
  DismissCircle20Regular,
  Eye20Regular,
  ShieldCheckmark20Regular,
  ArrowUp20Regular,
} from '@fluentui/react-icons';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';
import { FilterBar } from '@/components/common/FilterBar';
import { DataTable, type Column } from '@/components/common/DataTable';
import { RisqueBadge, SLABadge } from '@/components/common/StatusBadge';
import { type ValidationDecision } from '@/lib/mockData';
import { dossiersKypKys } from '@/lib/dataverse/entityHooks';
import { toValidationDecision } from '@/lib/dataverse/validationMappers';
import { exportToCsv } from '@/lib/exportCsv';
import {
  DetailDrawer,
  DrawerSection,
  FieldGrid,
  DrawerTimeline,
} from '@/components/common/DetailDrawer';
import { ConfirmActionDialog, type ConfirmIntent } from '@/components/common/ConfirmActionDialog';
import { useNotifications } from '@/components/common/NotificationProvider';

const useStyles = makeStyles({
  kpiRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '12px',
    marginBottom: '16px',
  },
  kpi: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '18px 20px',
    border: '1px solid #F4F4F4',
    borderLeftWidth: '3px',
    boxShadow: '0 1px 2px rgba(15, 15, 15, 0.04)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    ':hover': { transform: 'translateY(-1px)' },
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
  entityCell: { display: 'flex', flexDirection: 'column' },
  entityName: { fontSize: '13px', fontWeight: 600, color: '#1A1A1A' },
  entityCode: { fontSize: '11px', color: '#767676', fontFamily: 'monospace' },
  scoreCell: { display: 'inline-flex', alignItems: 'center', gap: '8px' },
  scoreBar: {
    width: '60px',
    height: '6px',
    backgroundColor: '#F4F4F4',
    borderRadius: '999px',
    overflow: 'hidden',
  },
  scoreFill: { height: '100%', borderRadius: '999px' },
  rowActions: { display: 'flex', gap: '4px', justifyContent: 'flex-end' },
  bigScore: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '14px 16px',
    backgroundColor: '#FAFAFA',
    border: '1px solid #F4F4F4',
    borderRadius: '10px',
    marginBottom: '12px',
  },
  bigScoreNumber: { fontSize: '38px', fontWeight: 800, lineHeight: 1 },
  bigScoreBar: {
    flex: 1,
    height: '8px',
    backgroundColor: '#F4F4F4',
    borderRadius: '999px',
    overflow: 'hidden',
  },
  scoreSub: { display: 'flex', flexDirection: 'column' },
  scoreSubLabel: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#767676',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  scoreSubValue: { fontSize: '13px', fontWeight: 600, color: '#1A1A1A' },
  hierarchy: {
    display: 'grid',
    gap: '8px',
  },
  hierarchyStep: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    backgroundColor: '#FAFAFA',
    border: '1px solid #F4F4F4',
    borderRadius: '8px',
  },
  hierarchyActive: {
    backgroundColor: '#FEF2F3',
    borderTopColor: '#FCE4E6', borderRightColor: '#FCE4E6', borderBottomColor: '#FCE4E6', borderLeftColor: '#FCE4E6',
  },
  hierarchyDone: {
    backgroundColor: '#F0FDF4',
    borderTopColor: '#BBF7D0', borderRightColor: '#BBF7D0', borderBottomColor: '#BBF7D0', borderLeftColor: '#BBF7D0',
  },
  stepDot: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#FFFFFF',
    border: '2px solid #D1D5DB',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 700,
    color: '#767676',
    flexShrink: 0,
  },
  stepDotDone: {
    backgroundColor: '#15803D',
    borderTopColor: '#15803D', borderRightColor: '#15803D', borderBottomColor: '#15803D', borderLeftColor: '#15803D',
    color: '#FFFFFF',
  },
  stepDotActive: {
    borderTopColor: '#E30613', borderRightColor: '#E30613', borderBottomColor: '#E30613', borderLeftColor: '#E30613',
    color: '#E30613',
  },
});

const NIVEAU_OPTIONS = [
  { label: 'Tous niveaux', value: '' },
  { label: 'Standard', value: 'Standard' },
  { label: 'Élevé', value: 'Élevé' },
  { label: 'Critique', value: 'Critique' },
];

const STATUT_OPTIONS = [
  { label: 'Tous statuts', value: '' },
  { label: 'En attente', value: 'En attente' },
  { label: 'En cours', value: 'En cours' },
  { label: 'Validé', value: 'Validé' },
  { label: 'Rejeté', value: 'Rejeté' },
];

function niveauColor(n: ValidationDecision['niveau']) {
  if (n === 'Critique') return 'danger';
  if (n === 'Élevé') return 'warning';
  return 'subtle';
}

function statutColor(s: ValidationDecision['statut']) {
  if (s === 'Validé') return 'success';
  if (s === 'Rejeté') return 'danger';
  if (s === 'En cours') return 'brand';
  return 'warning';
}

function scoreColor(score: number) {
  if (score >= 75) return '#E30613';
  if (score >= 50) return '#B45309';
  return '#15803D';
}

function scoreLabel(score: number) {
  if (score >= 75) return 'Élevé';
  if (score >= 50) return 'Modéré';
  return 'Faible';
}

export default function ValidationsDCONF() {
  const styles = useStyles();
  const { notifySuccess, notifyWarning, notifyInfo } = useNotifications();
  const [search, setSearch] = useState('');
  const [niveauFilter, setNiveauFilter] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [openVal, setOpenVal] = useState<ValidationDecision | null>(null);
  const [activeTab, setActiveTab] = useState('synthese');
  const [confirmIntent, setConfirmIntent] = useState<ConfirmIntent | null>(null);

  // Dossiers réels depuis Dataverse (afb_dossierkypkys) vus comme décisions de validation.
  const { data: rawDossiers, isLoading, error } = dossiersKypKys.useList({ top: 200 });
  const validations = useMemo(() => (rawDossiers ?? []).map(toValidationDecision), [rawDossiers]);
  const updateDossier = dossiersKypKys.useUpdate();
  const guidByRef = useMemo(
    () =>
      new Map(
        (rawDossiers ?? []).map((d) => [d.afb_referencedudossier ?? d.afb_dossierkypkysid, d.afb_dossierkypkysid]),
      ),
    [rawDossiers],
  );

  const filtered = useMemo(() => {
    return validations.filter((v) => {
      if (niveauFilter && v.niveau !== niveauFilter) return false;
      if (statutFilter && v.statut !== statutFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!v.entite.toLowerCase().includes(q) && !v.dossier.toLowerCase().includes(q) && !v.id.toLowerCase().includes(q))
          return false;
      }
      return true;
    });
  }, [validations, search, niveauFilter, statutFilter]);

  const kpis = [
    {
      label: 'En attente',
      value: validations.filter((v) => v.statut === 'En attente').length,
      meta: 'à arbitrer',
      color: '#B45309',
      filter: () => setStatutFilter('En attente'),
    },
    {
      label: 'Niveau Critique',
      value: validations.filter((v) => v.niveau === 'Critique').length,
      meta: 'double validation N+2',
      color: '#E30613',
      filter: () => setNiveauFilter('Critique'),
    },
    {
      label: 'SLA dépassé',
      value: validations.filter((v) => v.sla === 'Dépassé').length,
      meta: 'escalade automatique',
      color: '#A50410',
      filter: () => undefined,
    },
    {
      label: 'Validés ce mois',
      value: validations.filter((v) => v.statut === 'Validé').length,
      meta: 'archivés',
      color: '#15803D',
      filter: () => setStatutFilter('Validé'),
    },
  ];

  const open = (v: ValidationDecision) => {
    setOpenVal(v);
    setActiveTab('synthese');
  };

  const onConfirm = async (motif?: string) => {
    if (!openVal) return;
    const guid = guidByRef.get(openVal.id);
    try {
      if (confirmIntent === 'validate') {
        if (guid) {
          await updateDossier.mutateAsync({
            id: guid,
            changes: { afb_statutdudossier: 0, afb_datededernierevalidation: new Date().toISOString() },
          });
        }
        notifySuccess('Décision validée', {
          description: `${openVal.id} · ${openVal.entite} — décision opposable, archivage 10 ans.`,
        });
      } else if (confirmIntent === 'reject') {
        if (guid) {
          await updateDossier.mutateAsync({
            id: guid,
            changes: { afb_statutdudossier: 747010002, ...(motif ? { afb_commentairedconf: motif } : {}) },
          });
        }
        notifyWarning('Décision rejetée', {
          description: `${openVal.id} · Motif : ${motif} — le tiers a été notifié.`,
        });
      } else if (confirmIntent === 'warn') {
        if (guid) {
          await updateDossier.mutateAsync({ id: guid, changes: { afb_statutdudossier: 747010001 } }); // Suspendu (escaladé)
        }
        notifyInfo('Escalade au RCSI', {
          description: `${openVal.id} — escalade hiérarchique déclenchée. Notification envoyée.`,
        });
      }
    } catch (e) {
      notifyWarning('Action impossible', { description: e instanceof Error ? e.message : 'Erreur Dataverse.' });
      throw e;
    }
    setConfirmIntent(null);
    setOpenVal(null);
  };

  const columns: Column<ValidationDecision>[] = [
    {
      key: 'entite',
      header: 'Dossier / Entité',
      render: (v) => (
        <div className={styles.entityCell}>
          <span className={styles.entityName}>{v.entite}</span>
          <span className={styles.entityCode}>
            {v.id} · {v.dossier}
          </span>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (v) => (
        <Badge appearance="tint" color="subtle" size="small">
          {v.type}
        </Badge>
      ),
    },
    {
      key: 'niveau',
      header: 'Niveau',
      render: (v) => (
        <Badge appearance="filled" color={niveauColor(v.niveau)} size="small">
          {v.niveau}
        </Badge>
      ),
    },
    { key: 'risque', header: 'Risque', render: (v) => <RisqueBadge risque={v.risque} /> },
    {
      key: 'score',
      header: 'Score composite',
      render: (v) => (
        <span className={styles.scoreCell}>
          <span className={styles.scoreBar}>
            <span
              className={styles.scoreFill}
              style={{ width: `${v.scoreComposite}%`, backgroundColor: scoreColor(v.scoreComposite) }}
            />
          </span>
          <span style={{ fontWeight: 700, color: scoreColor(v.scoreComposite) }}>{v.scoreComposite}</span>
        </span>
      ),
    },
    { key: 'soumisPar', header: 'Soumis par', render: (v) => v.soumisPar },
    { key: 'soumisLe', header: 'Soumis le', render: (v) => v.soumisLe },
    { key: 'sla', header: 'SLA', render: (v) => <SLABadge value={v.sla} /> },
    {
      key: 'statut',
      header: 'Statut',
      render: (v) => (
        <Badge appearance="tint" color={statutColor(v.statut)} size="small">
          {v.statut}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (v) => (
        <div className={styles.rowActions} onClick={(e) => e.stopPropagation()}>
          <Tooltip content="Voir le dossier" relationship="label">
            <Button size="small" appearance="subtle" icon={<Eye20Regular />} onClick={() => open(v)} />
          </Tooltip>
          <Tooltip content="Valider" relationship="label">
            <Button
              size="small"
              appearance="subtle"
              icon={<CheckmarkCircle20Regular style={{ color: '#15803D' }} />}
              disabled={v.statut === 'Validé' || v.statut === 'Rejeté'}
              onClick={() => {
                setOpenVal(v);
                setConfirmIntent('validate');
              }}
            />
          </Tooltip>
          <Tooltip content="Rejeter" relationship="label">
            <Button
              size="small"
              appearance="subtle"
              icon={<DismissCircle20Regular style={{ color: '#E30613' }} />}
              disabled={v.statut === 'Validé' || v.statut === 'Rejeté'}
              onClick={() => {
                setOpenVal(v);
                setConfirmIntent('reject');
              }}
            />
          </Tooltip>
          {v.niveau !== 'Standard' && (
            <Tooltip content="Escalader au RCSI" relationship="label">
              <Button
                size="small"
                appearance="subtle"
                icon={<ArrowUp20Regular style={{ color: '#B45309' }} />}
                onClick={() => {
                  setOpenVal(v);
                  setConfirmIntent('warn');
                }}
              />
            </Tooltip>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Pilotage · DCONF"
        title="Validations DCONF"
        subtitle="File de validation hiérarchique de la Direction Conformité — arbitrage Standard, Élevé et Critique."
        actions={
          <Button
            icon={<ArrowDownload20Regular />}
            appearance="outline"
            onClick={() => {
              const ok = exportToCsv(
                `validations-dconf-${new Date().toISOString().slice(0, 10)}.csv`,
                filtered.map((v) => ({
                  Référence: v.id,
                  Dossier: v.dossier,
                  Entité: v.entite,
                  Niveau: v.niveau,
                  Risque: v.risque,
                  Score: v.scoreComposite,
                  'Soumis le': v.soumisLe,
                  'Soumis par': v.soumisPar,
                  SLA: v.sla,
                  Statut: v.statut,
                })),
              );
              notifySuccess(ok ? 'Export généré' : 'Aucune donnée', {
                description: ok ? `${filtered.length} validations exportées (CSV).` : 'Aucune validation à exporter.',
              });
            }}
          >
            Export
          </Button>
        }
      />

      <div className={styles.kpiRow}>
        {kpis.map((k) => (
          <div
            key={k.label}
            className={styles.kpi}
            style={{ borderLeftColor: k.color }}
            onClick={k.filter}
          >
            <div className={styles.kpiLabel}>{k.label}</div>
            <div className={styles.kpiValue} style={{ color: k.color }}>
              {k.value}
            </div>
            <div className={styles.kpiMeta}>{k.meta}</div>
          </div>
        ))}
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher une décision, un dossier, une entité…"
        filters={[
          { key: 'niveau', label: 'Niveau', value: niveauFilter, options: NIVEAU_OPTIONS, onChange: setNiveauFilter },
          { key: 'statut', label: 'Statut', value: statutFilter, options: STATUT_OPTIONS, onChange: setStatutFilter },
        ]}
      />

      <Card
        flush
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheckmark20Regular /> File de validation
          </span>
        }
        subtitle={`${filtered.length} sur ${validations.length} décisions — triées par priorité SLA`}
      >
        {error ? (
          <div style={{ padding: '24px', color: '#C20012', fontSize: '13px' }}>
            Erreur de chargement depuis Dataverse : {error.message}
          </div>
        ) : isLoading ? (
          <div style={{ padding: '24px', color: '#767676', fontSize: '13px' }}>Chargement des décisions…</div>
        ) : (
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(v) => v.id}
            onRowClick={open}
            emptyMessage="Aucune décision ne correspond aux filtres."
          />
        )}
      </Card>

      {/* Drawer décision */}
      <DetailDrawer
        open={openVal !== null && confirmIntent === null}
        onOpenChange={(o) => !o && setOpenVal(null)}
        eyebrow={`Décision · ${openVal?.id ?? ''}`}
        title={openVal?.entite ?? ''}
        subtitle={openVal?.dossier}
        size="large"
        statusBadges={
          openVal ? (
            <>
              <Badge appearance="filled" color={niveauColor(openVal.niveau)} size="small">
                {openVal.niveau}
              </Badge>
              <Badge appearance="tint" color={statutColor(openVal.statut)} size="small">
                {openVal.statut}
              </Badge>
              <SLABadge value={openVal.sla} />
            </>
          ) : null
        }
        tabs={[
          { id: 'synthese', label: 'Synthèse' },
          { id: 'hierarchie', label: 'Hiérarchie' },
          { id: 'historique', label: 'Historique' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        footer={
          openVal && openVal.statut !== 'Validé' && openVal.statut !== 'Rejeté' ? (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
              {openVal.niveau !== 'Standard' && (
                <Button appearance="subtle" onClick={() => setConfirmIntent('warn')}>
                  Escalader au RCSI
                </Button>
              )}
              <Button appearance="outline" onClick={() => setConfirmIntent('reject')}>
                Rejeter
              </Button>
              <Button appearance="primary" onClick={() => setConfirmIntent('validate')}>
                Valider la décision
              </Button>
            </div>
          ) : null
        }
      >
        {openVal && (
          <>
            {activeTab === 'synthese' && (
              <>
                <DrawerSection title="Score composite" description="Pondération : KYC/AML 40% · Éthique 30% · Fiscal 30%">
                  <div className={styles.bigScore}>
                    <div
                      className={styles.bigScoreNumber}
                      style={{ color: scoreColor(openVal.scoreComposite) }}
                    >
                      {openVal.scoreComposite}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className={styles.bigScoreBar}>
                        <div
                          style={{
                            height: '100%',
                            width: `${openVal.scoreComposite}%`,
                            backgroundColor: scoreColor(openVal.scoreComposite),
                            borderRadius: '999px',
                          }}
                        />
                      </div>
                      <div style={{ marginTop: '8px', fontSize: '13px', color: '#767676' }}>
                        Niveau de risque <strong style={{ color: scoreColor(openVal.scoreComposite) }}>{scoreLabel(openVal.scoreComposite)}</strong> —{' '}
                        validation hiérarchique requise selon Art. 41-48 R-2023/01.
                      </div>
                    </div>
                  </div>
                  <FieldGrid
                    items={[
                      { label: 'KYC / AML', value: <span style={{ color: scoreColor(85), fontWeight: 600 }}>85 / 100</span> },
                      { label: 'Éthique & gouvernance', value: <span style={{ fontWeight: 600 }}>74 / 100</span> },
                      { label: 'Fiscal & transparence', value: <span style={{ fontWeight: 600 }}>68 / 100</span> },
                    ]}
                  />
                </DrawerSection>

                <DrawerSection title="Identification du dossier">
                  <FieldGrid
                    items={[
                      { label: 'Référence', value: openVal.id, mono: true },
                      { label: 'Type', value: openVal.type },
                      { label: 'Niveau', value: openVal.niveau },
                      { label: 'Risque', value: openVal.risque },
                      { label: 'Soumis par', value: openVal.soumisPar },
                      { label: 'Soumis le', value: openVal.soumisLe },
                    ]}
                  />
                </DrawerSection>

                <DrawerSection title="Note de l’analyste">
                  <Field>
                    <Textarea
                      defaultValue="Dossier complet conformément au questionnaire AML AFB révisé. Wolfsberg signé en mars 2026. UBO validés. Pas de match screening. Convention SLA en cours de signature électronique."
                      rows={4}
                      readOnly
                      appearance="filled-darker"
                    />
                  </Field>
                </DrawerSection>
              </>
            )}

            {activeTab === 'hierarchie' && (
              <DrawerSection
                title="Schéma de validation hiérarchique"
                description={`Niveau ${openVal.niveau} — schéma imposé par le workflow, sans court-circuit possible.`}
              >
                <div className={styles.hierarchy}>
                  <div className={`${styles.hierarchyStep} ${styles.hierarchyDone}`}>
                    <span className={`${styles.stepDot} ${styles.stepDotDone}`}>✓</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#15803D' }}>
                        Analyste DCONF — {openVal.soumisPar}
                      </div>
                      <div style={{ fontSize: '12px', color: '#15803D' }}>
                        Pré-instruction validée le {openVal.soumisLe}
                      </div>
                    </div>
                  </div>
                  <div className={`${styles.hierarchyStep} ${openVal.statut === 'En attente' ? styles.hierarchyActive : ''}`}>
                    <span className={`${styles.stepDot} ${openVal.statut === 'En attente' ? styles.stepDotActive : ''}`}>2</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A1A' }}>
                        Chargé de conformité DCONF
                      </div>
                      <div style={{ fontSize: '12px', color: '#767676' }}>
                        Décision sur le score composite, validation ou rejet
                      </div>
                    </div>
                    <Badge appearance="filled" color={openVal.statut === 'En attente' ? 'warning' : 'subtle'} size="small">
                      En cours
                    </Badge>
                  </div>
                  {(openVal.niveau === 'Élevé' || openVal.niveau === 'Critique') && (
                    <div className={styles.hierarchyStep}>
                      <span className={styles.stepDot}>3</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A1A' }}>
                          RCSI — Responsable Conformité
                        </div>
                        <div style={{ fontSize: '12px', color: '#767676' }}>
                          Second regard requis pour ce niveau
                        </div>
                      </div>
                      <Badge appearance="tint" color="subtle" size="small">
                        À venir
                      </Badge>
                    </div>
                  )}
                  {openVal.niveau === 'Critique' && (
                    <div className={styles.hierarchyStep}>
                      <span className={styles.stepDot}>4</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A1A' }}>
                          Comité conformité — Art. 41-48 R-2023/01
                        </div>
                        <div style={{ fontSize: '12px', color: '#767676' }}>
                          Validation finale obligatoire pour correspondants bancaires transfrontaliers
                        </div>
                      </div>
                      <Badge appearance="tint" color="subtle" size="small">
                        À venir
                      </Badge>
                    </div>
                  )}
                </div>
              </DrawerSection>
            )}

            {activeTab === 'historique' && (
              <DrawerSection title="Journal des décisions">
                <DrawerTimeline
                  events={[
                    {
                      when: openVal.soumisLe,
                      title: 'Dossier soumis pour validation',
                      detail: `Par ${openVal.soumisPar} — score composite ${openVal.scoreComposite}`,
                    },
                    {
                      when: '12/05/2026 11:08',
                      title: 'Screening exécuté',
                      detail: 'Sources ONU / OFAC / UE / PPE — aucun match',
                    },
                    {
                      when: '10/05/2026 14:45',
                      title: 'Pré-instruction DCONF',
                      detail: 'Complétude vérifiée — 18/19 pièces requises fournies',
                    },
                    {
                      when: '08/05/2026 09:00',
                      title: 'Dossier ouvert',
                      detail: `Création de la fiche dans le référentiel`,
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
        open={confirmIntent === 'validate' && openVal !== null}
        onOpenChange={(o) => !o && setConfirmIntent(null)}
        intent="validate"
        title="Valider cette décision ?"
        description="La validation est horodatée, opposable au régulateur et archivée 10 ans (Art. 38 R-2023/01). Elle déclenche l’activation de la relation."
        confirmLabel="Confirmer la validation"
        entityRef={openVal?.id}
        helperNote={openVal?.niveau === 'Critique' ? 'Décision critique — le dossier sera également transmis au comité de conformité.' : undefined}
        onConfirm={() => onConfirm()}
      />
      <ConfirmActionDialog
        open={confirmIntent === 'reject' && openVal !== null}
        onOpenChange={(o) => !o && setConfirmIntent(null)}
        intent="reject"
        title="Rejeter cette décision ?"
        description="Le rejet est opposable et notifié au tiers. Le motif sera archivé."
        confirmLabel="Confirmer le rejet"
        requireMotif
        motifLabel="Motif du rejet"
        motifPlaceholder="Score composite insuffisant, pièces non concordantes, absence de Wolfsberg…"
        entityRef={openVal?.id}
        onConfirm={onConfirm}
      />
      <ConfirmActionDialog
        open={confirmIntent === 'warn' && openVal !== null}
        onOpenChange={(o) => !o && setConfirmIntent(null)}
        intent="warn"
        title="Escalader au RCSI ?"
        description="L’escalade transmet le dossier au Responsable Conformité pour second regard. Le statut passe en En cours."
        confirmLabel="Escalader"
        requireMotif
        motifLabel="Justification de l’escalade"
        motifPlaceholder="Doute sur la cohérence du dossier, score composite à la limite, élément déclenchant…"
        entityRef={openVal?.id}
        onConfirm={onConfirm}
      />
    </div>
  );
}