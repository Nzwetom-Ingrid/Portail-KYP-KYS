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
import { useTableFilters } from '@/lib/tables/useTableFilters';
import { RisqueBadge, SLABadge } from '@/components/common/StatusBadge';
import { type ValidationDecision } from '@/lib/mockData';
import { dossiersKypKys, tiers as tiersHooks, utilisateursInternes } from '@/lib/dataverse/entityHooks';
import { getCurrentUser } from '@/lib/auth/currentUserRef';
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
import { useT } from '@/i18n/i18n';

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
    borderTopColor: 'var(--accent)', borderRightColor: 'var(--accent)', borderBottomColor: 'var(--accent)', borderLeftColor: 'var(--accent)',
    color: 'var(--accent)',
  },
});

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

// Complétude : plus le taux est élevé, mieux c'est → vert pour un taux haut.
function scoreColor(score: number) {
  if (score >= 80) return '#15803D';
  if (score >= 50) return 'var(--warning)';
  return 'var(--accent)';
}

function scoreLabel(score: number) {
  if (score >= 80) return 'élevée';
  if (score >= 50) return 'partielle';
  return 'faible';
}

export default function ValidationsDCONF() {
  const styles = useStyles();
  const { t } = useT();
  const { notifySuccess, notifyWarning, notifyInfo } = useNotifications();
  const [openVal, setOpenVal] = useState<ValidationDecision | null>(null);
  const [activeTab, setActiveTab] = useState('synthese');
  const [confirmIntent, setConfirmIntent] = useState<ConfirmIntent | null>(null);

  // Dossiers réels depuis Dataverse (afb_dossierkypkys) vus comme décisions de validation.
  const { data: rawDossiers, isLoading, error } = dossiersKypKys.useList({ top: 200 });
  const { data: rawTiers } = tiersHooks.useList({ top: 500 });
  const { data: rawUsers } = utilisateursInternes.useList({ top: 500 });
  const updateDossier = dossiersKypKys.useUpdate();

  // Résolveurs : entité contrôlée (tiers), risque/niveau (risque du tiers), soumis par (chargé de relation).
  const resolvers = useMemo(() => {
    const tiersById = new Map<string, { nom?: string; risqueNum?: number; chargeGuid?: string }>();
    for (const t of rawTiers ?? [])
      tiersById.set(t.afb_tiersid, {
        nom: t.afb_nomdupartenaire,
        risqueNum: t.afb_niveauderisque ?? undefined,
        chargeGuid: t._afb_chargederelation_value,
      });
    const usersById = new Map<string, string>();
    for (const u of rawUsers ?? []) usersById.set(u.afb_utilisateurinterneid, u.afb_nomcomplet);
    return { tiersById, usersById };
  }, [rawTiers, rawUsers]);

  const validations = useMemo(
    () => (rawDossiers ?? []).map((d) => toValidationDecision(d, resolvers)),
    [rawDossiers, resolvers],
  );
  const guidByRef = useMemo(
    () =>
      new Map(
        (rawDossiers ?? []).map((d) => [d.afb_referencedudossier ?? d.afb_dossierkypkysid, d.afb_dossierkypkysid]),
      ),
    [rawDossiers],
  );



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
            // afb_statutappel = 'traite' → clôt un éventuel appel : le flux notifie
            // par e-mail le demandeur (afb_demandeurappel) du résultat.
            changes: {
              afb_statutdudossier: 0,
              afb_datededernierevalidation: new Date().toISOString(),
              afb_statutappel: 'traite',
            } as unknown as Parameters<typeof updateDossier.mutateAsync>[0]['changes'],
          });
        }
        notifySuccess(t('Décision validée'), {
          description: `${openVal.id} · ${openVal.entite}${t(' — décision opposable, archivage 10 ans.')}`,
        });
      } else if (confirmIntent === 'reject') {
        if (guid) {
          await updateDossier.mutateAsync({
            id: guid,
            changes: {
              afb_statutdudossier: 747010002,
              ...(motif ? { afb_commentairedconf: motif } : {}),
              afb_statutappel: 'traite',
            } as unknown as Parameters<typeof updateDossier.mutateAsync>[0]['changes'],
          });
        }
        notifyWarning(t('Décision rejetée'), {
          description: `${openVal.id}${t(' · Motif : ')}${motif}${t(' — le tiers a été notifié.')}`,
        });
      } else if (confirmIntent === 'warn') {
        if (guid) {
          // Appel à validation : on passe le dossier en « escaladé », on trace le
          // demandeur (e-mail de l'utilisateur connecté) et on marque l'appel
          // « demande » → le flux notifie le RCSI par e-mail.
          await updateDossier.mutateAsync({
            id: guid,
            changes: {
              afb_statutdudossier: 747010001,
              afb_demandeurappel: getCurrentUser().email || '',
              afb_statutappel: 'demande',
              ...(motif ? { afb_motifappel: motif } : {}),
            } as unknown as Parameters<typeof updateDossier.mutateAsync>[0]['changes'],
          });
        }
        notifyInfo(t('Appel à validation envoyé'), {
          description: `${openVal.id}${t(' — le RCSI va être notifié par e-mail.')}`,
        });
      }
    } catch (e) {
      notifyWarning(t('Action impossible'), { description: e instanceof Error ? e.message : t('Erreur Dataverse.') });
      throw e;
    }
    setConfirmIntent(null);
    setOpenVal(null);
  };

  const columns: Column<ValidationDecision>[] = [
    {
      key: 'entite',
      header: 'Dossier / Entité',
      sortValue: (v) => v.entite, searchValue: (v) => `${v.entite} ${v.dossier} ${v.id}`,
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
      sortValue: (v) => v.type, searchValue: (v) => v.type, filterable: true,
      render: (v) => (
        <Badge appearance="tint" color="subtle" size="small">
          {v.type}
        </Badge>
      ),
    },
    {
      key: 'niveau',
      header: 'Niveau',
      sortValue: (v) => v.niveau, searchValue: (v) => v.niveau, filterable: true,
      render: (v) => (
        <Badge appearance="filled" color={niveauColor(v.niveau)} size="small">
          {v.niveau}
        </Badge>
      ),
    },
    { key: 'risque', header: 'Risque', sortValue: (v) => v.risque, searchValue: (v) => v.risque, filterable: true, render: (v) => <RisqueBadge risque={v.risque} /> },
    {
      key: 'score',
      header: 'Complétude',
      sortValue: (v) => v.scoreComposite,
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
    { key: 'soumisPar', header: 'Soumis par', sortValue: (v) => v.soumisPar, searchValue: (v) => v.soumisPar, filterable: true, render: (v) => v.soumisPar },
    { key: 'soumisLe', header: 'Soumis le', sortValue: (v) => v.soumisLe, searchValue: (v) => v.soumisLe, render: (v) => v.soumisLe },
    { key: 'sla', header: 'SLA', sortValue: (v) => v.sla, searchValue: (v) => v.sla, render: (v) => <SLABadge value={v.sla} /> },
    {
      key: 'statut',
      header: 'Statut',
      sortValue: (v) => v.statut, searchValue: (v) => v.statut, filterable: true,
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
          <Tooltip content={t('Voir le dossier')} relationship="label">
            <Button size="small" appearance="subtle" icon={<Eye20Regular />} onClick={() => open(v)} />
          </Tooltip>
          <Tooltip content={t('Valider')} relationship="label">
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
          <Tooltip content={t('Rejeter')} relationship="label">
            <Button
              size="small"
              appearance="subtle"
              icon={<DismissCircle20Regular style={{ color: 'var(--accent)' }} />}
              disabled={v.statut === 'Validé' || v.statut === 'Rejeté'}
              onClick={() => {
                setOpenVal(v);
                setConfirmIntent('reject');
              }}
            />
          </Tooltip>
          {v.niveau !== 'Standard' && (
            <Tooltip content={t('Demander la validation au RCSI')} relationship="label">
              <Button
                size="small"
                appearance="subtle"
                icon={<ArrowUp20Regular style={{ color: 'var(--warning)' }} />}
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
  // Filtres et recherche derives des colonnes (cf. useTableFilters).
  const table = useTableFilters(validations, columns);
  const { search, setSearch } = table;
  const filtered = table.rows;

  const kpis = [
    {
      label: t('En attente'),
      value: validations.filter((v) => v.statut === 'En attente').length,
      meta: t('à arbitrer'),
      color: 'var(--warning)',
      pressed: table.getFilter('statut') === 'En attente',
      filter: () => table.toggleFilter('statut', 'En attente'),
    },
    {
      label: t('Niveau Critique'),
      value: validations.filter((v) => v.niveau === 'Critique').length,
      meta: t('double validation N+2'),
      color: 'var(--accent)',
      pressed: table.getFilter('niveau') === 'Critique',
      filter: () => table.toggleFilter('niveau', 'Critique'),
    },
    {
      label: t('SLA dépassé'),
      value: validations.filter((v) => v.sla === 'Dépassé').length,
      meta: t('escalade automatique'),
      color: 'var(--accent-dark)',
      pressed: table.getFilter('sla') === 'Dépassé',
      filter: () => table.toggleFilter('sla', 'Dépassé'),
    },
    {
      label: t('Validés ce mois'),
      value: validations.filter((v) => v.statut === 'Validé').length,
      meta: t('archivés'),
      color: '#15803D',
      pressed: table.getFilter('statut') === 'Validé',
      filter: () => table.toggleFilter('statut', 'Validé'),
    },
  ];


  return (
    <div>
      <PageHeader
        eyebrow="Pilotage · DCONF"
        title="Validation"
        subtitle="Validation hiérarchique de second niveau — un responsable confirme les décisions avant qu'elles ne soient effectives."
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
              notifySuccess(ok ? t('Export généré') : t('Aucune donnée'), {
                description: ok ? `${filtered.length}${t(' validations exportées (CSV).')}` : t('Aucune validation à exporter.'),
              });
            }}
          >
            {t('Export')}
          </Button>
        }
      />

      <div className={styles.kpiRow}>
        {kpis.map((k) => (
          <div
            key={k.label}
            className={styles.kpi}
            role="button"
            tabIndex={0}
            aria-pressed={k.pressed}
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
        filters={table.filterConfigs}
      />

      <Card
        flush
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheckmark20Regular /> {t('File de validation')}
          </span>
        }
        subtitle={`${filtered.length} sur ${validations.length} décisions — triées par priorité SLA`}
      >
        {error ? (
          <div style={{ padding: '24px', color: 'var(--accent)', fontSize: '13px' }}>
            {t('Erreur de chargement depuis Dataverse : ')}{error.message}
          </div>
        ) : isLoading ? (
          <div style={{ padding: '24px', color: '#767676', fontSize: '13px' }}>{t('Chargement des décisions…')}</div>
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
        eyebrow={`${t('Décision · ')}${openVal?.id ?? ''}`}
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
          { id: 'synthese', label: t('Synthèse') },
          { id: 'hierarchie', label: t('Hiérarchie') },
          { id: 'historique', label: t('Historique') },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        footer={
          openVal && openVal.statut !== 'Validé' && openVal.statut !== 'Rejeté' ? (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
              {openVal.niveau !== 'Standard' && (
                <Button appearance="subtle" onClick={() => setConfirmIntent('warn')}>
                  {t('Demander la validation au RCSI')}
                </Button>
              )}
              <Button appearance="outline" onClick={() => setConfirmIntent('reject')}>
                {t('Rejeter')}
              </Button>
              <Button appearance="primary" onClick={() => setConfirmIntent('validate')}>
                {t('Valider la décision')}
              </Button>
            </div>
          ) : null
        }
      >
        {openVal && (
          <>
            {activeTab === 'synthese' && (
              <>
                <DrawerSection title={t('Complétude du dossier')} description={t("Part des pièces requises fournies — proxy du score d'instruction.")}>
                  <div className={styles.bigScore}>
                    <div
                      className={styles.bigScoreNumber}
                      style={{ color: scoreColor(openVal.scoreComposite) }}
                    >
                      {openVal.scoreComposite}
                      <span style={{ fontSize: '18px' }}>%</span>
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
                        {t('Complétude')} <strong style={{ color: scoreColor(openVal.scoreComposite) }}>{t(scoreLabel(openVal.scoreComposite))}</strong> —{' '}
                        {t('validation hiérarchique niveau ')}{openVal.niveau}{t(' (Art. 41-48 R-2023/01).')}
                      </div>
                    </div>
                  </div>
                  <FieldGrid
                    items={[
                      { label: t('Taux de complétude'), value: <span style={{ color: scoreColor(openVal.scoreComposite), fontWeight: 600 }}>{openVal.scoreComposite}%</span> },
                      { label: t('Risque du tiers'), value: openVal.risque },
                      { label: t('Niveau de validation'), value: openVal.niveau },
                    ]}
                  />
                </DrawerSection>

                <DrawerSection title={t('Identification du dossier')}>
                  <FieldGrid
                    items={[
                      { label: t('Référence'), value: openVal.id, mono: true },
                      { label: t('Entité'), value: openVal.entite },
                      { label: t('Type'), value: openVal.type },
                      { label: t('Statut'), value: openVal.statut },
                      { label: t('Soumis par'), value: openVal.soumisPar },
                      { label: t('Soumis le'), value: openVal.soumisLe },
                      { label: t('SLA'), value: openVal.sla },
                    ]}
                  />
                </DrawerSection>

                <DrawerSection
                  title={t('Avis / commentaire DCONF')}
                  description={t('Dernière réponse consignée sur le dossier — visible par le partenaire dans son espace.')}
                >
                  <Field>
                    <Textarea
                      value={openVal.commentaire ?? t('Aucun commentaire consigné pour ce dossier.')}
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
                title={t('Schéma de validation hiérarchique')}
                description={`${t('Niveau ')}${openVal.niveau}${t(' — schéma imposé par le workflow, sans court-circuit possible.')}`}
              >
                <div className={styles.hierarchy}>
                  <div className={`${styles.hierarchyStep} ${styles.hierarchyDone}`}>
                    <span className={`${styles.stepDot} ${styles.stepDotDone}`}>✓</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#15803D' }}>
                        {t('Analyste DCONF — ')}{openVal.soumisPar}
                      </div>
                      <div style={{ fontSize: '12px', color: '#15803D' }}>
                        {t('Pré-instruction validée le ')}{openVal.soumisLe}
                      </div>
                    </div>
                  </div>
                  <div className={`${styles.hierarchyStep} ${openVal.statut === 'En attente' ? styles.hierarchyActive : ''}`}>
                    <span className={`${styles.stepDot} ${openVal.statut === 'En attente' ? styles.stepDotActive : ''}`}>2</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A1A' }}>
                        {t('Chargé de conformité DCONF')}
                      </div>
                      <div style={{ fontSize: '12px', color: '#767676' }}>
                        {t('Décision sur le score composite, validation ou rejet')}
                      </div>
                    </div>
                    <Badge appearance="filled" color={openVal.statut === 'En attente' ? 'warning' : 'subtle'} size="small">
                      {t('En cours')}
                    </Badge>
                  </div>
                  {(openVal.niveau === 'Élevé' || openVal.niveau === 'Critique') && (
                    <div className={styles.hierarchyStep}>
                      <span className={styles.stepDot}>3</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A1A' }}>
                          {t('RCSI — Responsable Conformité')}
                        </div>
                        <div style={{ fontSize: '12px', color: '#767676' }}>
                          {t('Second regard requis pour ce niveau')}
                        </div>
                      </div>
                      <Badge appearance="tint" color="subtle" size="small">
                        {t('À venir')}
                      </Badge>
                    </div>
                  )}
                  {openVal.niveau === 'Critique' && (
                    <div className={styles.hierarchyStep}>
                      <span className={styles.stepDot}>4</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A1A' }}>
                          {t('Comité conformité — Art. 41-48 R-2023/01')}
                        </div>
                        <div style={{ fontSize: '12px', color: '#767676' }}>
                          {t('Validation finale obligatoire pour correspondants bancaires transfrontaliers')}
                        </div>
                      </div>
                      <Badge appearance="tint" color="subtle" size="small">
                        {t('À venir')}
                      </Badge>
                    </div>
                  )}
                </div>
              </DrawerSection>
            )}

            {activeTab === 'historique' && (
              <DrawerSection title={t('Journal des décisions')}>
                <DrawerTimeline
                  events={[
                    ...(openVal.statut === 'Validé' || openVal.statut === 'Rejeté'
                      ? [{
                          when: '—',
                          title: `${t('Décision : ')}${openVal.statut}`,
                          detail: openVal.commentaire ?? t('Décision de conformité (DCONF)'),
                        }]
                      : []),
                    {
                      when: openVal.soumisLe,
                      title: t('Dossier soumis pour validation'),
                      detail: `${t('Par ')}${openVal.soumisPar}${t(' — complétude ')}${openVal.scoreComposite}%`,
                    },
                    {
                      when: '—',
                      title: t('Complétude du dossier'),
                      detail: `${openVal.scoreComposite}${t('% des pièces requises fournies')}`,
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
        title={t('Valider cette décision ?')}
        description={t('La validation est horodatée, opposable au régulateur et archivée 10 ans (Art. 38 R-2023/01). Elle déclenche l’activation de la relation.')}
        confirmLabel={t('Confirmer la validation')}
        entityRef={openVal?.id}
        helperNote={openVal?.niveau === 'Critique' ? t('Décision critique — le dossier sera également transmis au comité de conformité.') : undefined}
        onConfirm={() => onConfirm()}
      />
      <ConfirmActionDialog
        open={confirmIntent === 'reject' && openVal !== null}
        onOpenChange={(o) => !o && setConfirmIntent(null)}
        intent="reject"
        title={t('Rejeter cette décision ?')}
        description={t('Le rejet est opposable et notifié au tiers. Le motif sera archivé.')}
        confirmLabel={t('Confirmer le rejet')}
        requireMotif
        motifLabel={t('Motif du rejet')}
        motifPlaceholder={t('Score composite insuffisant, pièces non concordantes, absence de Wolfsberg…')}
        entityRef={openVal?.id}
        onConfirm={onConfirm}
      />
      <ConfirmActionDialog
        open={confirmIntent === 'warn' && openVal !== null}
        onOpenChange={(o) => !o && setConfirmIntent(null)}
        intent="warn"
        title={t('Demander la validation au RCSI ?')}
        description={t('Vous n’avez pas l’habilitation pour valider seul ce niveau : le dossier est transmis au RCSI (Responsable Conformité) qui reçoit une notification par e-mail. Vous serez notifié par e-mail de sa décision.')}
        confirmLabel={t('Envoyer l’appel')}
        requireMotif
        motifLabel={t('Motif de l’appel (transmis au RCSI)')}
        motifPlaceholder={t('Doute sur la cohérence du dossier, score composite à la limite, élément déclenchant…')}
        entityRef={openVal?.id}
        onConfirm={onConfirm}
      />
    </div>
  );
}