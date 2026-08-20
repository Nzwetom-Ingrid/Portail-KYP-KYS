import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  makeStyles,
  Tooltip,
  Field,
  Input,
  Dropdown,
  Option,
  Radio,
  RadioGroup,
  Switch,
} from '@fluentui/react-components';
import {
  Add20Regular,
  ArrowDownload20Regular,
  PeopleTeam20Regular,
  Warning20Filled,
  Eye20Regular,
  CheckmarkCircle20Regular,
  DismissCircle20Regular,
  ShieldCheckmark20Regular,
  Branch20Regular,
} from '@fluentui/react-icons';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';
import { FilterBar } from '@/components/common/FilterBar';
import { DataTable, type Column } from '@/components/common/DataTable';
import { useTableFilters } from '@/lib/tables/useTableFilters';
import { SelectionBar } from '@/components/common/SelectionBar';
import { type UBO } from '@/lib/mockData';
import { ubo as uboHooks, tiers as tiersHooks, utilisateursInternes } from '@/lib/dataverse/entityHooks';
import { useRoleStore } from '@/store/roleStore';
import { toUBO } from '@/lib/dataverse/uboMappers';
import { exportToCsv } from '@/lib/exportCsv';

/** Nature du bénéficiaire (formulaire) → choix Dataverse afb_typedentite. */
const TYPE_ENTITE_TO_DV: Record<string, number> = { physique: 1, morale: 0 };
import {
  DetailDrawer,
  DrawerSection,
  FieldGrid,
  DrawerTimeline,
} from '@/components/common/DetailDrawer';
import { FormDialog, FormSection, FieldRow } from '@/components/common/FormDialog';
import { ConfirmActionDialog, type ConfirmIntent } from '@/components/common/ConfirmActionDialog';
import { useNotifications } from '@/components/common/NotificationProvider';
import { useT } from '@/i18n/i18n';

const useStyles = makeStyles({
  kpiRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
    marginBottom: '16px',
  },
  kpi: {
    backgroundColor: 'var(--glass-bg)',
    borderRadius: '12px',
    padding: '18px 20px',
    border: '1px solid var(--glass-border)',
    boxShadow: '0 1px 2px rgba(15, 15, 15, 0.04)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    ':hover': { borderTopColor: '#FCE4E6', borderRightColor: '#FCE4E6', borderBottomColor: '#FCE4E6', borderLeftColor: '#FCE4E6', transform: 'translateY(-1px)' },
  },
  kpiLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '6px',
  },
  kpiValue: { fontSize: '28px', fontWeight: 700, color: 'var(--text)', lineHeight: 1 },
  kpiMeta: { fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'var(--glass-red-bg)',
    color: 'var(--accent)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 700,
    marginRight: '10px',
  },
  avatarLarge: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    backgroundColor: 'var(--glass-red-bg)',
    color: 'var(--accent)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '17px',
    fontWeight: 700,
  },
  personCell: { display: 'flex', alignItems: 'center' },
  personMeta: { display: 'flex', flexDirection: 'column' },
  personName: { fontSize: '13px', fontWeight: 600, color: 'var(--text)' },
  personSub: { fontSize: '11px', color: 'var(--text-muted)' },
  partBar: {
    width: '100%',
    height: '6px',
    backgroundColor: 'var(--bg)',
    borderRadius: '999px',
    overflow: 'hidden',
    marginTop: '4px',
  },
  partFill: { height: '100%', backgroundColor: 'var(--accent)', borderRadius: '999px' },
  partCellValue: { fontSize: '13px', fontWeight: 600, color: 'var(--text)' },
  rowActions: { display: 'flex', gap: '4px', justifyContent: 'flex-end' },
  uboHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '4px 0 14px',
    borderBottom: '1px solid var(--glass-border)',
    marginBottom: '14px',
  },
  uboHeaderMeta: { display: 'flex', flexDirection: 'column', gap: '2px' },
  uboHeaderName: { fontSize: '16px', fontWeight: 600, color: 'var(--text)' },
  uboHeaderSub: { fontSize: '12px', color: 'var(--text-muted)' },
  chainNode: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    backgroundColor: 'var(--bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: '8px',
    marginBottom: '8px',
  },
  chainNodeIndent: {
    marginLeft: '24px',
    borderLeft: '2px solid #FCE4E6',
    paddingLeft: '16px',
  },
  chainNodeName: { fontSize: '13px', fontWeight: 600, color: 'var(--text)' },
  chainNodeSub: { fontSize: '11px', color: 'var(--text-muted)' },
  pct: {
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--accent)',
    backgroundColor: 'var(--glass-red-bg)',
    padding: '3px 8px',
    borderRadius: '999px',
    marginLeft: 'auto',
  },
  screeningSource: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    backgroundColor: '#F0FDF4',
    border: '1px solid #BBF7D0',
    borderRadius: '8px',
    marginBottom: '6px',
  },
  screeningSourceFail: {
    backgroundColor: 'var(--glass-red-bg)',
    borderTopColor: '#FCE4E6', borderRightColor: '#FCE4E6', borderBottomColor: '#FCE4E6', borderLeftColor: '#FCE4E6',
  },
});

function initials(name: string) {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function validationColor(v: UBO['validation']) {
  if (v === 'Validé') return 'success';
  if (v === 'À revoir') return 'danger';
  return 'warning';
}

export default function UBOPage() {
  const { t } = useT();
  const styles = useStyles();
  const can = useRoleStore(s => s.can);
  const { notifySuccess, notifyWarning, notifyInfo } = useNotifications();

  // Bénéficiaires effectifs réels depuis Dataverse (afb_ubo).
  const { data: rawUbos, isLoading, error } = uboHooks.useList({ top: 200 });

  // Création d'UBO rattachée à un tiers parent existant.
  const createUbo = uboHooks.useCreate();
  const updateUbo = uboHooks.useUpdate();
  const { data: tiersData } = tiersHooks.useList({ top: 200 });
  const { data: usersData } = utilisateursInternes.useList({ top: 500 });

  // Résolveurs de lookups (entité contrôlée = tiers parent, valideur = utilisateur interne).
  const resolvers = useMemo(() => {
    const tiersById = new Map<string, string>();
    for (const t of tiersData ?? []) tiersById.set(t.afb_tiersid, t.afb_nomdupartenaire);
    const usersById = new Map<string, string>();
    for (const u of usersData ?? []) usersById.set(u.afb_utilisateurinterneid, u.afb_nomcomplet);
    return { tiersById, usersById };
  }, [tiersData, usersData]);

  const ubos = useMemo(() => (rawUbos ?? []).map((u) => toUBO(u, resolvers)), [rawUbos, resolvers]);
  const [ppeFilter, setPpeFilter] = useState(false);
  const [seuilFilter, setSeuilFilter] = useState(false);
  const [openUbo, setOpenUbo] = useState<UBO | null>(null);
  const [activeTab, setActiveTab] = useState('identite');
  const [confirmIntent, setConfirmIntent] = useState<ConfirmIntent | null>(null);
  const [newUboOpen, setNewUboOpen] = useState(false);

  // form state
  const [entiteCtrl, setEntiteCtrl] = useState('');
  const [tiersParentId, setTiersParentId] = useState('');
  const [natureUbo, setNatureUbo] = useState<'physique' | 'morale'>('physique');
  const [uboNom, setUboNom] = useState('');
  const [uboNationalite, setUboNationalite] = useState('');
  const [uboDateNaiss, setUboDateNaiss] = useState('');
  const [uboNatureCtrl, setUboNatureCtrl] = useState<'Direct' | 'Indirect' | 'Effectif'>('Direct');
  const [uboPart, setUboPart] = useState('25');
  const [uboPpe, setUboPpe] = useState(false);
  const [screenImmediate, setScreenImmediate] = useState(true);


  const kpis = {
    total: ubos.length,
    valides: ubos.filter((u) => u.validation === 'Validé').length,
    ppe: ubos.filter((u) => u.ppe).length,
    seuil25: ubos.filter((u) => u.partPct >= 25).length,
  };

  const open = (u: UBO) => {
    setOpenUbo(u);
    setActiveTab('identite');
  };

  const resetForm = () => {
    setEntiteCtrl('');
    setTiersParentId('');
    setNatureUbo('physique');
    setUboNom('');
    setUboNationalite('');
    setUboDateNaiss('');
    setUboNatureCtrl('Direct');
    setUboPart('25');
    setUboPpe(false);
    setScreenImmediate(true);
  };

  const submitNewUbo = async () => {
    try {
      await createUbo.mutateAsync({
        afb_nomouraisonsociale: uboNom,
        afb_pourcentagededetentiondirecte: Number(uboPart) || 0,
        afb_typedentite: TYPE_ENTITE_TO_DV[natureUbo] ?? 1,
        afb_statutdevalidation: 1, // Encours (en cours de validation)
        afb_statutppe: uboPpe ? 1 : 0, // Auto-déclarée / Non
        ...(uboNationalite.trim() ? { afb_nationalite: uboNationalite } : {}),
        ...(uboDateNaiss ? { afb_datedenaissance: uboDateNaiss } : {}),
        'afb_tiersparent@odata.bind': `/afb_tierses(${tiersParentId})`,
      } as unknown as Parameters<typeof createUbo.mutateAsync>[0]);

      notifySuccess(t('Bénéficiaire effectif ajouté'), {
        description: `${uboNom} — ${uboPart}% ${t('sur')} ${entiteCtrl}.${screenImmediate ? ` ${t('Screening à lancer.')}` : ''}`,
      });
      if (uboPpe) {
        notifyWarning(t('Statut PPE déclaré'), {
          description: t('Vigilance renforcée activée — validation RCSI requise.'),
          timeout: 7000,
        });
      }
      setNewUboOpen(false);
      resetForm();
    } catch (e) {
      notifyWarning(t('Création impossible'), {
        description: e instanceof Error ? e.message : t('Erreur Dataverse lors de la création du bénéficiaire.'),
      });
      throw e;
    }
  };

  const onConfirm = async (motif?: string) => {
    if (!openUbo) return;
    try {
      if (confirmIntent === 'validate') {
        await updateUbo.mutateAsync({
          id: openUbo.id,
          changes: { afb_statutdevalidation: 0, afb_datedevalidation: new Date().toISOString() },
        });
        notifySuccess(t('Bénéficiaire validé'), {
          description: `${openUbo.nom} — ${t('décision horodatée et archivée 10 ans (Art. 38 R-2023/01).')}`,
        });
      } else if (confirmIntent === 'reject') {
        await updateUbo.mutateAsync({
          id: openUbo.id,
          changes: { afb_statutdevalidation: 747010001 },
        });
        notifyWarning(t('Bénéficiaire rejeté'), {
          description: `${openUbo.nom} — ${t('motif :')} ${motif}. ${t('La relation reste bloquée.')}`,
        });
      } else if (confirmIntent === 'warn') {
        await updateUbo.mutateAsync({
          id: openUbo.id,
          changes: { afb_statutdevalidation: 2 }, // Non vérifié → complément demandé
        });
        notifyInfo(t('Demande de complément envoyée'), {
          description: `${t('Le tiers a été notifié pour fournir les justificatifs sur')} ${openUbo.nom}.`,
        });
      }
    } catch (e) {
      notifyWarning(t('Action impossible'), {
        description: e instanceof Error ? e.message : t('Erreur Dataverse.'),
      });
      throw e;
    }
    setConfirmIntent(null);
    setOpenUbo(null);
  };

  const columns: Column<UBO>[] = [
    {
      key: 'personne',
      header: 'Bénéficiaire',
      sortValue: (u) => u.nom, searchValue: (u) => `${u.nom} ${u.nationalite ?? ''}`,
      render: (u) => (
        <div className={styles.personCell}>
          <span className={styles.avatar}>{initials(u.nom)}</span>
          <div className={styles.personMeta}>
            <span className={styles.personName}>{u.nom}</span>
            <span className={styles.personSub}>
              {u.nationalite} · {t('Né(e)')} {u.dateNaissance}
            </span>
          </div>
        </div>
      ),
    },
    { key: 'partenaire', header: 'Entité contrôlée', sortValue: (u) => u.partenaire, searchValue: (u) => u.partenaire, filterable: true, render: (u) => u.partenaire },
    {
      key: 'part',
      header: 'Détention',
      sortValue: (u) => u.partPct,
      render: (u) => (
        <div>
          <span className={styles.partCellValue}>{u.partPct.toFixed(1)}%</span>
          <div className={styles.partBar}>
            <div className={styles.partFill} style={{ width: `${u.partPct}%` }} />
          </div>
        </div>
      ),
    },
    {
      key: 'nature',
      header: 'Nature',
      sortValue: (u) => u.natureControle, searchValue: (u) => u.natureControle, filterable: true,
      render: (u) => (
        <Badge appearance="tint" color="brand" size="small">
          {u.natureControle}
        </Badge>
      ),
    },
    {
      key: 'ppe',
      header: 'PPE',
      // Booleen : on trie et filtre sur le libelle affiche, pas sur true/false.
      sortValue: (u) => (u.ppe ? 'Oui' : 'Non'),
      searchValue: (u) => (u.ppe ? 'Oui PPE personne politiquement exposee' : 'Non'),
      filterValue: (u) => (u.ppe ? 'Oui' : 'Non'),
      filterable: true,
      render: (u) =>
        u.ppe ? (
          <Badge appearance="filled" color="danger" size="small">
            {t('Oui')}
          </Badge>
        ) : (
          <Badge appearance="tint" color="subtle" size="small">
            {t('Non')}
          </Badge>
        ),
    },
    {
      key: 'validation',
      header: 'Validation',
      sortValue: (u) => u.validation, searchValue: (u) => u.validation, filterable: true,
      render: (u) => (
        <Badge appearance="tint" color={validationColor(u.validation)} size="small">
          {u.validation}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (u) => (
        <div className={styles.rowActions} onClick={(e) => e.stopPropagation()}>
          <Tooltip content={t('Voir la fiche')} relationship="label">
            <Button size="small" appearance="subtle" icon={<Eye20Regular />} onClick={() => open(u)} />
          </Tooltip>
          <Tooltip content={t('Valider')} relationship="label">
            <Button
              size="small"
              appearance="subtle"
              icon={<CheckmarkCircle20Regular style={{ color: 'var(--success)' }} />}
              disabled={u.validation === 'Validé'}
              onClick={() => {
                setOpenUbo(u);
                setConfirmIntent('validate');
              }}
            />
          </Tooltip>
          <Tooltip content={t('Rejeter')} relationship="label">
            <Button
              size="small"
              appearance="subtle"
              icon={<DismissCircle20Regular style={{ color: 'var(--accent)' }} />}
              disabled={u.validation === 'Validé'}
              onClick={() => {
                setOpenUbo(u);
                setConfirmIntent('reject');
              }}
            />
          </Tooltip>
        </div>
      ),
    },
  ];
  // Filtres et recherche derives des colonnes (cf. useTableFilters).
  const table = useTableFilters(ubos, columns);
  const { search, setSearch } = table;
  const filtered = table.rows;
  const [selection, setSelection] = useState<Set<string>>(new Set());
  // Exporter la selection si elle existe, sinon ce que les filtres laissent voir.
  const aExporter = selection.size ? filtered.filter((r) => selection.has(r.id)) : filtered;


  // Fiches nécessitant une revue : à revoir, ou PPE non encore validée.
  const reviewList = ubos.filter((u) => u.validation === 'À revoir' || (u.ppe && u.validation !== 'Validé'));
  const reviewNames = reviewList.slice(0, 3).map((u) => `${u.nom}${u.ppe ? ` ${t('(PPE)')}` : ''}`).join(', ');

  return (
    <div>
      <PageHeader
        eyebrow="Référentiel"
        title="Bénéficiaires effectifs (UBO)"
        subtitle="Visualisation des chaînes de détention — propagation des pourcentages indirects, seuil COBAC 25% / Wolfsberg 10%."
        actions={
          <>
            <Button
              icon={<ArrowDownload20Regular />}
              appearance="outline"
              onClick={() => {
                const ok = exportToCsv(
                  `ubo-${new Date().toISOString().slice(0, 10)}.csv`,
                  aExporter.map((u) => ({
                    Nom: u.nom,
                    Nationalité: u.nationalite,
                    Partenaire: u.partenaire,
                    'Part %': u.partPct,
                    'Nature contrôle': u.natureControle,
                    PPE: u.ppe ? 'Oui' : 'Non',
                    'Date naissance': u.dateNaissance,
                    Validation: u.validation,
                  })),
                );
                notifySuccess(ok ? t('Export généré') : t('Aucune donnée'), {
                  description: ok ? `${filtered.length} ${t('UBO exportés (CSV).')}` : t('Aucun UBO à exporter.'),
                });
              }}
            >
              {t('Export')}
            </Button>
            {can('partners.create') && (
              <Button icon={<Add20Regular />} appearance="primary" onClick={() => setNewUboOpen(true)}>
                {t('Nouveau bénéficiaire')}
              </Button>
            )}
          </>
        }
      />

      <div className={styles.kpiRow}>
        <div className={styles.kpi} onClick={() => { table.setFilter('validation', ''); table.setFilter('nature', ''); setPpeFilter(false); setSeuilFilter(false); }}>
          <div className={styles.kpiLabel}>{t('Bénéficiaires')}</div>
          <div className={styles.kpiValue}>{kpis.total}</div>
          <div className={styles.kpiMeta}>{t('identifiés')}</div>
        </div>
        <div className={styles.kpi} onClick={() => table.setFilter('validation', 'Validé')}>
          <div className={styles.kpiLabel}>{t('Validés')}</div>
          <div className={styles.kpiValue} style={{ color: 'var(--success)' }}>
            {kpis.valides}
          </div>
          <div className={styles.kpiMeta}>{t('fiches conformes')}</div>
        </div>
        <div
          className={styles.kpi}
          role="button"
          tabIndex={0}
          aria-pressed={ppeFilter}
          onClick={() => setPpeFilter((cur) => !cur)}
        >
          <div className={styles.kpiLabel}>{t('PPE')}</div>
          <div className={styles.kpiValue} style={{ color: 'var(--accent)' }}>
            {kpis.ppe}
          </div>
          <div className={styles.kpiMeta}>{t('due diligence renforcée')}</div>
        </div>
        <div
          className={styles.kpi}
          role="button"
          tabIndex={0}
          aria-pressed={seuilFilter}
          onClick={() => setSeuilFilter((cur) => !cur)}
        >
          <div className={styles.kpiLabel}>{t('Au-delà du seuil 25%')}</div>
          <div className={styles.kpiValue}>{kpis.seuil25}</div>
          <div className={styles.kpiMeta}>{t('contrôle effectif')}</div>
        </div>
      </div>

      {reviewList.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: '12px',
            padding: '14px 18px',
            backgroundColor: 'var(--glass-red-bg)',
            border: '1px solid #FCE4E6',
            borderRadius: '12px',
            marginBottom: '16px',
          }}
        >
          <Warning20Filled style={{ color: 'var(--accent)', marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-dark)' }}>
              {reviewList.length} {t('fiche')}{reviewList.length > 1 ? 's' : ''} {t('UBO nécessite')}
              {reviewList.length > 1 ? 'nt' : ''} {t('une revue')}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {reviewNames} — {t('vérifier les justificatifs et la chaîne de détention.')}
            </div>
          </div>
          <Button appearance="subtle" size="small" onClick={() => table.setFilter('validation', 'À revoir')}>
            {t('Voir les fiches')}
          </Button>
        </div>
      )}

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher un bénéficiaire ou une entité…"
        filters={table.filterConfigs}
      />

      <Card
        flush
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <PeopleTeam20Regular /> {t('Liste des bénéficiaires')}
          </span>
        }
        subtitle={`${filtered.length} ${t('sur')} ${ubos.length} ${t('bénéficiaires')}`}
      >
        {error ? (
          <div style={{ padding: '24px', color: 'var(--accent)', fontSize: '13px' }}>
            {t('Erreur de chargement depuis Dataverse :')} {error.message}
          </div>
        ) : isLoading ? (
          <div style={{ padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>{t('Chargement des bénéficiaires…')}</div>
        ) : (
          <>
          <SelectionBar count={selection.size} onClear={() => setSelection(new Set())} />
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(u) => u.id}
            selectable
            selectedKeys={selection}
            onSelectionChange={setSelection}
            onRowClick={open}
            emptyMessage="Aucun bénéficiaire ne correspond aux filtres."
          />
          </>
        )}
      </Card>

      {/* Drawer fiche UBO */}
      <DetailDrawer
        open={openUbo !== null && confirmIntent === null}
        onOpenChange={(o) => !o && setOpenUbo(null)}
        eyebrow={t('Bénéficiaire effectif')}
        title={openUbo?.nom ?? ''}
        subtitle={openUbo ? `${openUbo.partenaire} · ${openUbo.partPct.toFixed(1)}% ${t('de détention')}` : ''}
        size="large"
        statusBadges={
          openUbo ? (
            <>
              <Badge appearance="filled" color={validationColor(openUbo.validation)} size="small">
                {openUbo.validation}
              </Badge>
              {openUbo.ppe && (
                <Badge appearance="filled" color="danger" size="small">
                  {t('PPE')}
                </Badge>
              )}
              <Badge appearance="tint" color="brand" size="small">
                {openUbo.natureControle}
              </Badge>
            </>
          ) : null
        }
        tabs={[
          { id: 'identite', label: t('Identité') },
          { id: 'chaine', label: t('Chaîne de détention'), count: 2 },
          { id: 'screening', label: t('Screening'), alertCount: openUbo?.ppe ? 1 : 0 },
          { id: 'historique', label: t('Historique') },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        footer={
          openUbo && openUbo.validation !== 'Validé' ? (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
              <Button appearance="subtle" onClick={() => setConfirmIntent('warn')}>
                {t('Demander complément')}
              </Button>
              <Button appearance="outline" onClick={() => setConfirmIntent('reject')}>
                {t('Rejeter')}
              </Button>
              <Button appearance="primary" onClick={() => setConfirmIntent('validate')}>
                {t('Valider le bénéficiaire')}
              </Button>
            </div>
          ) : null
        }
      >
        {openUbo && (
          <>
            <div className={styles.uboHeader}>
              <div className={styles.avatarLarge}>{initials(openUbo.nom)}</div>
              <div className={styles.uboHeaderMeta}>
                <span className={styles.uboHeaderName}>{openUbo.nom}</span>
                <span className={styles.uboHeaderSub}>
                  {openUbo.nationalite} · {t('Né(e)')} {openUbo.dateNaissance}
                </span>
              </div>
            </div>

            {activeTab === 'identite' && (
              <>
                <DrawerSection title={openUbo.moral ? t('Identification de l’entité') : t('Identification personnelle')}>
                  <FieldGrid
                    items={[
                      { label: openUbo.moral ? t('Raison sociale') : t('Nom complet'), value: openUbo.nom },
                      { label: t('Type'), value: openUbo.typeEntite ?? '—' },
                      { label: openUbo.moral ? t('Pays d’incorporation') : t('Nationalité'), value: openUbo.nationalite },
                      { label: openUbo.moral ? t('Date de constitution') : t('Date de naissance'), value: openUbo.dateNaissance },
                      { label: t('Pays de résidence fiscale'), value: openUbo.paysResidence ?? '—' },
                      { label: t('Nature du contrôle'), value: openUbo.natureControle },
                    ]}
                  />
                </DrawerSection>
                <DrawerSection
                  title={t('Détention & décision')}
                  description={t('Détention déclarée et avis de conformité (visible par le partenaire dans son espace).')}
                >
                  <FieldGrid
                    items={[
                      { label: t('Entité contrôlée'), value: openUbo.partenaire },
                      { label: t('% détention directe'), value: `${openUbo.partPct.toFixed(1)}%` },
                      { label: t('% détention indirecte'), value: `${(openUbo.partIndirecte ?? 0).toFixed(1)}%` },
                      { label: t('Statut de validation'), value: openUbo.validation },
                      { label: t('Validé par'), value: openUbo.validePar ?? '—' },
                      { label: t('Date de validation'), value: openUbo.dateValidation ?? '—' },
                    ]}
                  />
                </DrawerSection>
                <DrawerSection
                  title={t('Statut PPE')}
                  description={openUbo.ppe ? t('Vigilance renforcée — Art. 41-48 R-2023/01') : t('Aucun statut PPE déclaré.')}
                >
                  <div
                    style={{
                      padding: '12px 14px',
                      backgroundColor: openUbo.ppe ? '#FEF2F3' : '#F0FDF4',
                      border: `1px solid ${openUbo.ppe ? '#FCE4E6' : '#BBF7D0'}`,
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: openUbo.ppe ? 'var(--accent-dark)' : '#15803D',
                    }}
                  >
                    {openUbo.ppe
                      ? t('Personne politiquement exposée déclarée. Vigilance renforcée requise : origine des fonds, validation RCSI et revue périodique du statut.')
                      : t('Bénéficiaire déclaré non-PPE — vigilance standard.')}
                  </div>
                </DrawerSection>
              </>
            )}

            {activeTab === 'chaine' && (
              <DrawerSection
                title={t('Chaîne de détention')}
                description={t('Détention déclarée du bénéficiaire sur l’entité contrôlée.')}
              >
                <div className={styles.chainNode}>
                  <Branch20Regular style={{ color: 'var(--accent)' }} />
                  <div>
                    <div className={styles.chainNodeName}>{openUbo.partenaire}</div>
                    <div className={styles.chainNodeSub}>{t('Entité contrôlée')}</div>
                  </div>
                </div>
                <div className={styles.chainNodeIndent}>
                  <div className={styles.chainNode}>
                    <div>
                      <div className={styles.chainNodeName}>{openUbo.nom}</div>
                      <div className={styles.chainNodeSub}>
                        {openUbo.typeEntite} · {openUbo.nationalite}
                      </div>
                    </div>
                    <span className={styles.pct}>
                      {openUbo.natureControle === 'Indirect'
                        ? `${(openUbo.partIndirecte ?? 0).toFixed(1)}% ${t('indirect')}`
                        : `${openUbo.partPct.toFixed(1)}% ${t('direct')}`}
                    </span>
                  </div>
                </div>
                <div style={{ marginTop: '14px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {openUbo.partPct >= 25
                    ? t('Au-delà du seuil COBAC 25 % — bénéficiaire effectif à déclarer et à screener.')
                    : openUbo.partPct >= 10
                      ? t('Au-delà du seuil Wolfsberg 10 % — à documenter dans la chaîne de détention.')
                      : t('En-deçà des seuils réglementaires (COBAC 25 % / Wolfsberg 10 %).')}
                </div>
              </DrawerSection>
            )}

            {activeTab === 'screening' && (
              <DrawerSection
                title={t('Screening & PPE')}
                description={t('Dernier résultat de contrôle enregistré sur ce bénéficiaire.')}
              >
                {(() => {
                  const hit = openUbo.screening ? /match|positif|hit|alerte|sanction/i.test(openUbo.screening) : false;
                  return (
                    <div className={`${styles.screeningSource} ${hit ? styles.screeningSourceFail : ''}`}>
                      {hit ? (
                        <Warning20Filled style={{ color: 'var(--accent)' }} />
                      ) : (
                        <ShieldCheckmark20Regular style={{ color: openUbo.screening ? '#15803D' : '#767676' }} />
                      )}
                      <strong style={{ fontSize: '13px', color: hit ? 'var(--accent-dark)' : '#15803D' }}>{t('Sanctions')}</strong>
                      <span style={{ marginLeft: 'auto', fontSize: '12px', color: hit ? 'var(--accent-dark)' : '#767676' }}>
                        {openUbo.screening ?? t('Screening non encore exécuté')}
                      </span>
                    </div>
                  );
                })()}
                <div className={`${styles.screeningSource} ${openUbo.ppe ? styles.screeningSourceFail : ''}`}>
                  {openUbo.ppe ? (
                    <Warning20Filled style={{ color: 'var(--accent)' }} />
                  ) : (
                    <ShieldCheckmark20Regular style={{ color: 'var(--success)' }} />
                  )}
                  <strong style={{ fontSize: '13px', color: openUbo.ppe ? 'var(--accent-dark)' : '#15803D' }}>{t('PPE')}</strong>
                  <span style={{ marginLeft: 'auto', fontSize: '12px', color: openUbo.ppe ? 'var(--accent-dark)' : '#767676' }}>
                    {openUbo.ppe ? t('Personne politiquement exposée') : t('Aucun statut PPE')}
                  </span>
                </div>
              </DrawerSection>
            )}

            {activeTab === 'historique' && (
              <DrawerSection title={t('Événements du dossier UBO')}>
                <DrawerTimeline
                  events={[
                    ...(openUbo.dateValidation
                      ? [{
                          when: openUbo.dateValidation,
                          title: `${t('Bénéficiaire')} ${openUbo.validation.toLowerCase()}`,
                          detail: openUbo.validePar ? `${t('Décision —')} ${openUbo.validePar}` : t('Décision de conformité (DCONF)'),
                        }]
                      : []),
                    ...(openUbo.screening
                      ? [{ when: '—', title: t('Dernier screening'), detail: openUbo.screening }]
                      : []),
                    {
                      when: '—',
                      title: t('Bénéficiaire déclaré par le tiers'),
                      detail: `${openUbo.partenaire} — ${openUbo.natureControle} · ${openUbo.partPct.toFixed(1)}%`,
                    },
                  ]}
                />
              </DrawerSection>
            )}
          </>
        )}
      </DetailDrawer>

      {/* Confirm actions */}
      <ConfirmActionDialog
        open={confirmIntent === 'validate' && openUbo !== null}
        onOpenChange={(o) => !o && setConfirmIntent(null)}
        intent="validate"
        title={t('Valider ce bénéficiaire effectif ?')}
        description={t('La validation est horodatée et archivée 10 ans (Art. 38 R-2023/01). Elle n’est plus modifiable après enregistrement.')}
        confirmLabel={t('Confirmer la validation')}
        entityRef={openUbo?.nom}
        helperNote={t('La relation pourra être activée une fois tous les UBO de la chaîne validés.')}
        onConfirm={() => onConfirm()}
      />
      <ConfirmActionDialog
        open={confirmIntent === 'reject' && openUbo !== null}
        onOpenChange={(o) => !o && setConfirmIntent(null)}
        intent="reject"
        title={t('Rejeter ce bénéficiaire effectif ?')}
        description={t('Le rejet bloque l’activation de la relation tant que le UBO n’est pas vérifié ou retiré de la chaîne.')}
        confirmLabel={t('Confirmer le rejet')}
        requireMotif
        motifLabel={t('Motif du rejet')}
        motifPlaceholder={t('Pièce d’identité non concordante, structure de détention non documentée…')}
        entityRef={openUbo?.nom}
        onConfirm={onConfirm}
      />
      <ConfirmActionDialog
        open={confirmIntent === 'warn' && openUbo !== null}
        onOpenChange={(o) => !o && setConfirmIntent(null)}
        intent="warn"
        title={t('Demander un complément au tiers ?')}
        description={t('Le tiers sera notifié par e-mail avec le détail des éléments à fournir.')}
        confirmLabel={t('Envoyer la demande')}
        requireMotif
        motifLabel={t('Éléments demandés')}
        motifPlaceholder={t('Pièce d’identité à jour, CV signé, justificatif de résidence…')}
        entityRef={openUbo?.nom}
        onConfirm={onConfirm}
      />

      {/* Modal nouveau UBO */}
      <FormDialog
        open={newUboOpen}
        onOpenChange={(o) => {
          if (!o) resetForm();
          setNewUboOpen(o);
        }}
        eyebrow={t('Référentiel UBO')}
        title={t('Ajouter un bénéficiaire effectif')}
        subtitle={t('Déclare un nouveau UBO et déclenche automatiquement le screening sanctions / PPE.')}
        size="large"
        submitLabel={t('Ajouter et screener')}
        submitDisabled={uboNom.trim().length < 3 || tiersParentId === '' || !uboPart}
        onSubmit={submitNewUbo}
      >
        <FormSection
          title={t('Entité contrôlée')}
          description={t('Sélectionnez le partenaire dont le bénéficiaire détient une part.')}
        >
          <FieldRow>
            <Field label={t('Partenaire / Cible')} required hint={t('Tiers parent (Dataverse)')}>
              <Dropdown
                placeholder={t('Sélectionner un tiers')}
                value={tiersData?.find((t) => t.afb_tiersid === tiersParentId)?.afb_nomdupartenaire ?? ''}
                selectedOptions={tiersParentId ? [tiersParentId] : []}
                onOptionSelect={(_, d) => {
                  if (!d.optionValue) return;
                  setTiersParentId(d.optionValue);
                  setEntiteCtrl(tiersData?.find((t) => t.afb_tiersid === d.optionValue)?.afb_nomdupartenaire ?? '');
                }}
              >
                {(tiersData ?? []).map((t) => (
                  <Option key={t.afb_tiersid} value={t.afb_tiersid}>
                    {t.afb_nomdupartenaire}
                  </Option>
                ))}
              </Dropdown>
            </Field>
          </FieldRow>
          <Field label={t('Nature du bénéficiaire')} required>
            <RadioGroup
              value={natureUbo}
              onChange={(_, d) => setNatureUbo(d.value as 'physique' | 'morale')}
              layout="horizontal"
            >
              <Radio value="physique" label={t('Personne physique (UBO direct ou effectif)')} />
              <Radio value="morale" label={t('Personne morale (chaîne indirecte)')} />
            </RadioGroup>
          </Field>
        </FormSection>

        <FormSection title={t('Identité du bénéficiaire')}>
          <FieldRow cols={2}>
            <Field label={natureUbo === 'physique' ? t('Nom complet') : t('Raison sociale')} required>
              <Input
                value={uboNom}
                onChange={(_, d) => setUboNom(d.value)}
                placeholder={natureUbo === 'physique' ? 'James Wilson' : 'Holdings International Ltd.'}
              />
            </Field>
            <Field label={natureUbo === 'physique' ? t('Nationalité') : t('Pays d’incorporation')} required>
              <Input
                value={uboNationalite}
                onChange={(_, d) => setUboNationalite(d.value)}
                placeholder={natureUbo === 'physique' ? t('Britannique') : t('Jersey')}
              />
            </Field>
          </FieldRow>
          <FieldRow cols={2}>
            <Field label={natureUbo === 'physique' ? t('Date de naissance') : t('Date de constitution')}>
              <Input
                type="date"
                value={uboDateNaiss}
                onChange={(_, d) => setUboDateNaiss(d.value)}
              />
            </Field>
            <Field label={t('% de détention')} required hint={t('Sur l’entité contrôlée sélectionnée')}>
              <Input
                type="number"
                value={uboPart}
                onChange={(_, d) => setUboPart(d.value)}
                contentAfter="%"
              />
            </Field>
          </FieldRow>
        </FormSection>

        <FormSection title={t('Vigilance et risques')}>
          <FieldRow cols={2}>
            <Field label={t('Nature du contrôle')} required>
              <Dropdown
                value={uboNatureCtrl}
                selectedOptions={[uboNatureCtrl]}
                onOptionSelect={(_, d) => setUboNatureCtrl((d.optionValue ?? 'Direct') as 'Direct' | 'Indirect' | 'Effectif')}
              >
                <Option value="Direct">{t('Direct')}</Option>
                <Option value="Indirect">{t('Indirect')}</Option>
                <Option value="Effectif">{t('Effectif')}</Option>
              </Dropdown>
            </Field>
            <Field label={t('Personne politiquement exposée (PPE)')}>
              <Switch
                checked={uboPpe}
                onChange={(_, d) => setUboPpe(d.checked)}
                label={uboPpe ? t('Oui — vigilance renforcée') : t('Non')}
              />
            </Field>
          </FieldRow>
          <Field>
            <Switch
              checked={screenImmediate}
              onChange={(_, d) => setScreenImmediate(d.checked)}
              label={t('Lancer immédiatement le screening (ONU, OFAC, UE, Interpol, PPE)')}
            />
          </Field>
        </FormSection>
      </FormDialog>
    </div>
  );
}