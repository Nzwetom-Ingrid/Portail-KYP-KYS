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
import { type UBO } from '@/lib/mockData';
import { ubo as uboHooks, tiers as tiersHooks } from '@/lib/dataverse/entityHooks';
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
    ':hover': { borderTopColor: '#FCE4E6', borderRightColor: '#FCE4E6', borderBottomColor: '#FCE4E6', borderLeftColor: '#FCE4E6', transform: 'translateY(-1px)' },
  },
  kpiLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#767676',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '6px',
  },
  kpiValue: { fontSize: '28px', fontWeight: 700, color: '#1A1A1A', lineHeight: 1 },
  kpiMeta: { fontSize: '12px', color: '#767676', marginTop: '6px' },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#FCE4E6',
    color: '#E30613',
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
    backgroundColor: '#FCE4E6',
    color: '#E30613',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '17px',
    fontWeight: 700,
  },
  personCell: { display: 'flex', alignItems: 'center' },
  personMeta: { display: 'flex', flexDirection: 'column' },
  personName: { fontSize: '13px', fontWeight: 600, color: '#1A1A1A' },
  personSub: { fontSize: '11px', color: '#767676' },
  partBar: {
    width: '100%',
    height: '6px',
    backgroundColor: '#F4F4F4',
    borderRadius: '999px',
    overflow: 'hidden',
    marginTop: '4px',
  },
  partFill: { height: '100%', backgroundColor: '#E30613', borderRadius: '999px' },
  partCellValue: { fontSize: '13px', fontWeight: 600, color: '#1A1A1A' },
  rowActions: { display: 'flex', gap: '4px', justifyContent: 'flex-end' },
  uboHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '4px 0 14px',
    borderBottom: '1px solid #F4F4F4',
    marginBottom: '14px',
  },
  uboHeaderMeta: { display: 'flex', flexDirection: 'column', gap: '2px' },
  uboHeaderName: { fontSize: '16px', fontWeight: 600, color: '#1A1A1A' },
  uboHeaderSub: { fontSize: '12px', color: '#767676' },
  chainNode: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    backgroundColor: '#FAFAFA',
    border: '1px solid #F4F4F4',
    borderRadius: '8px',
    marginBottom: '8px',
  },
  chainNodeIndent: {
    marginLeft: '24px',
    borderLeft: '2px solid #FCE4E6',
    paddingLeft: '16px',
  },
  chainNodeName: { fontSize: '13px', fontWeight: 600, color: '#1A1A1A' },
  chainNodeSub: { fontSize: '11px', color: '#767676' },
  pct: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#E30613',
    backgroundColor: '#FEF2F3',
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
    backgroundColor: '#FEF2F3',
    borderTopColor: '#FCE4E6', borderRightColor: '#FCE4E6', borderBottomColor: '#FCE4E6', borderLeftColor: '#FCE4E6',
  },
});

const VALIDATION_OPTIONS = [
  { label: 'Tous statuts', value: '' },
  { label: 'Validé', value: 'Validé' },
  { label: 'En attente', value: 'En attente' },
  { label: 'À revoir', value: 'À revoir' },
];

const NATURE_OPTIONS = [
  { label: 'Toutes natures', value: '' },
  { label: 'Direct', value: 'Direct' },
  { label: 'Indirect', value: 'Indirect' },
  { label: 'Effectif', value: 'Effectif' },
];

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
  const styles = useStyles();
  const { notifySuccess, notifyWarning, notifyInfo } = useNotifications();

  // Bénéficiaires effectifs réels depuis Dataverse (afb_ubo).
  const { data: rawUbos, isLoading, error } = uboHooks.useList({ top: 200 });
  const ubos = useMemo(() => (rawUbos ?? []).map(toUBO), [rawUbos]);

  // Création d'UBO rattachée à un tiers parent existant.
  const createUbo = uboHooks.useCreate();
  const updateUbo = uboHooks.useUpdate();
  const { data: tiersData } = tiersHooks.useList({ top: 200 });

  const [search, setSearch] = useState('');
  const [validationFilter, setValidationFilter] = useState('');
  const [natureFilter, setNatureFilter] = useState('');
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

  const filtered = useMemo(() => {
    return ubos.filter((u) => {
      if (validationFilter && u.validation !== validationFilter) return false;
      if (natureFilter && u.natureControle !== natureFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!u.nom.toLowerCase().includes(q) && !u.partenaire.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [ubos, search, validationFilter, natureFilter]);

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

      notifySuccess('Bénéficiaire effectif ajouté', {
        description: `${uboNom} — ${uboPart}% sur ${entiteCtrl}.${screenImmediate ? ' Screening à lancer.' : ''}`,
      });
      if (uboPpe) {
        notifyWarning('Statut PPE déclaré', {
          description: 'Vigilance renforcée activée — validation RCSI requise.',
          timeout: 7000,
        });
      }
      setNewUboOpen(false);
      resetForm();
    } catch (e) {
      notifyWarning('Création impossible', {
        description: e instanceof Error ? e.message : 'Erreur Dataverse lors de la création du bénéficiaire.',
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
        notifySuccess('Bénéficiaire validé', {
          description: `${openUbo.nom} — décision horodatée et archivée 10 ans (Art. 38 R-2023/01).`,
        });
      } else if (confirmIntent === 'reject') {
        await updateUbo.mutateAsync({
          id: openUbo.id,
          changes: { afb_statutdevalidation: 747010001 },
        });
        notifyWarning('Bénéficiaire rejeté', {
          description: `${openUbo.nom} — motif : ${motif}. La relation reste bloquée.`,
        });
      } else if (confirmIntent === 'warn') {
        await updateUbo.mutateAsync({
          id: openUbo.id,
          changes: { afb_statutdevalidation: 2 }, // Non vérifié → complément demandé
        });
        notifyInfo('Demande de complément envoyée', {
          description: `Le tiers a été notifié pour fournir les justificatifs sur ${openUbo.nom}.`,
        });
      }
    } catch (e) {
      notifyWarning('Action impossible', {
        description: e instanceof Error ? e.message : 'Erreur Dataverse.',
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
      render: (u) => (
        <div className={styles.personCell}>
          <span className={styles.avatar}>{initials(u.nom)}</span>
          <div className={styles.personMeta}>
            <span className={styles.personName}>{u.nom}</span>
            <span className={styles.personSub}>
              {u.nationalite} · Né(e) {u.dateNaissance}
            </span>
          </div>
        </div>
      ),
    },
    { key: 'partenaire', header: 'Entité contrôlée', render: (u) => u.partenaire },
    {
      key: 'part',
      header: 'Détention',
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
      render: (u) => (
        <Badge appearance="tint" color="brand" size="small">
          {u.natureControle}
        </Badge>
      ),
    },
    {
      key: 'ppe',
      header: 'PPE',
      render: (u) =>
        u.ppe ? (
          <Badge appearance="filled" color="danger" size="small">
            PPE
          </Badge>
        ) : (
          <span style={{ color: '#C8C8C8' }}>—</span>
        ),
    },
    {
      key: 'validation',
      header: 'Validation',
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
          <Tooltip content="Voir la fiche" relationship="label">
            <Button size="small" appearance="subtle" icon={<Eye20Regular />} onClick={() => open(u)} />
          </Tooltip>
          <Tooltip content="Valider" relationship="label">
            <Button
              size="small"
              appearance="subtle"
              icon={<CheckmarkCircle20Regular style={{ color: '#15803D' }} />}
              disabled={u.validation === 'Validé'}
              onClick={() => {
                setOpenUbo(u);
                setConfirmIntent('validate');
              }}
            />
          </Tooltip>
          <Tooltip content="Rejeter" relationship="label">
            <Button
              size="small"
              appearance="subtle"
              icon={<DismissCircle20Regular style={{ color: '#E30613' }} />}
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

  const ppeCount = ubos.filter((u) => u.ppe).length;

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
                  filtered.map((u) => ({
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
                notifySuccess(ok ? 'Export généré' : 'Aucune donnée', {
                  description: ok ? `${filtered.length} UBO exportés (CSV).` : 'Aucun UBO à exporter.',
                });
              }}
            >
              Export
            </Button>
            <Button icon={<Add20Regular />} appearance="primary" onClick={() => setNewUboOpen(true)}>
              Nouveau bénéficiaire
            </Button>
          </>
        }
      />

      <div className={styles.kpiRow}>
        <div className={styles.kpi} onClick={() => { setValidationFilter(''); setNatureFilter(''); }}>
          <div className={styles.kpiLabel}>Bénéficiaires</div>
          <div className={styles.kpiValue}>{kpis.total}</div>
          <div className={styles.kpiMeta}>identifiés</div>
        </div>
        <div className={styles.kpi} onClick={() => setValidationFilter('Validé')}>
          <div className={styles.kpiLabel}>Validés</div>
          <div className={styles.kpiValue} style={{ color: '#15803D' }}>
            {kpis.valides}
          </div>
          <div className={styles.kpiMeta}>fiches conformes</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>PPE</div>
          <div className={styles.kpiValue} style={{ color: '#E30613' }}>
            {kpis.ppe}
          </div>
          <div className={styles.kpiMeta}>due diligence renforcée</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Au-delà du seuil 25%</div>
          <div className={styles.kpiValue}>{kpis.seuil25}</div>
          <div className={styles.kpiMeta}>contrôle effectif</div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '12px',
          padding: '14px 18px',
          backgroundColor: '#FEF2F3',
          border: '1px solid #FCE4E6',
          borderRadius: '12px',
          marginBottom: '16px',
        }}
      >
        <Warning20Filled style={{ color: '#E30613', marginTop: '2px' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#A50410' }}>
            {ppeCount} fiches UBO nécessitent une revue
          </div>
          <div style={{ fontSize: '12px', color: '#767676', marginTop: '2px' }}>
            Marie-Claire Ndong (PPE) et Adama Diop — vérifier les justificatifs et la chaîne de détention indirecte.
          </div>
        </div>
        <Button
          appearance="subtle"
          size="small"
          onClick={() => setValidationFilter('À revoir')}
        >
          Voir les fiches
        </Button>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher un bénéficiaire ou une entité…"
        filters={[
          { key: 'validation', label: 'Validation', value: validationFilter, options: VALIDATION_OPTIONS, onChange: setValidationFilter },
          { key: 'nature', label: 'Nature', value: natureFilter, options: NATURE_OPTIONS, onChange: setNatureFilter },
        ]}
      />

      <Card
        flush
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <PeopleTeam20Regular /> Liste des bénéficiaires
          </span>
        }
        subtitle={`${filtered.length} sur ${ubos.length} bénéficiaires`}
      >
        {error ? (
          <div style={{ padding: '24px', color: '#C20012', fontSize: '13px' }}>
            Erreur de chargement depuis Dataverse : {error.message}
          </div>
        ) : isLoading ? (
          <div style={{ padding: '24px', color: '#767676', fontSize: '13px' }}>Chargement des bénéficiaires…</div>
        ) : (
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(u) => u.id}
            onRowClick={open}
            emptyMessage="Aucun bénéficiaire ne correspond aux filtres."
          />
        )}
      </Card>

      {/* Drawer fiche UBO */}
      <DetailDrawer
        open={openUbo !== null && confirmIntent === null}
        onOpenChange={(o) => !o && setOpenUbo(null)}
        eyebrow="Bénéficiaire effectif"
        title={openUbo?.nom ?? ''}
        subtitle={openUbo ? `${openUbo.partenaire} · ${openUbo.partPct.toFixed(1)}% de détention` : ''}
        size="large"
        statusBadges={
          openUbo ? (
            <>
              <Badge appearance="filled" color={validationColor(openUbo.validation)} size="small">
                {openUbo.validation}
              </Badge>
              {openUbo.ppe && (
                <Badge appearance="filled" color="danger" size="small">
                  PPE
                </Badge>
              )}
              <Badge appearance="tint" color="brand" size="small">
                {openUbo.natureControle}
              </Badge>
            </>
          ) : null
        }
        tabs={[
          { id: 'identite', label: 'Identité' },
          { id: 'chaine', label: 'Chaîne de détention', count: 3 },
          { id: 'screening', label: 'Screening', alertCount: openUbo?.ppe ? 1 : 0 },
          { id: 'historique', label: 'Historique' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        footer={
          openUbo && openUbo.validation !== 'Validé' ? (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
              <Button appearance="subtle" onClick={() => setConfirmIntent('warn')}>
                Demander complément
              </Button>
              <Button appearance="outline" onClick={() => setConfirmIntent('reject')}>
                Rejeter
              </Button>
              <Button appearance="primary" onClick={() => setConfirmIntent('validate')}>
                Valider le bénéficiaire
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
                  {openUbo.nationalite} · Né(e) {openUbo.dateNaissance}
                </span>
              </div>
            </div>

            {activeTab === 'identite' && (
              <>
                <DrawerSection title="Identification personnelle">
                  <FieldGrid
                    items={[
                      { label: 'Nom complet', value: openUbo.nom },
                      { label: 'Nationalité', value: openUbo.nationalite },
                      { label: 'Date de naissance', value: openUbo.dateNaissance },
                      { label: 'Pièce d’identité', value: 'Passeport CMR — n° 21A 8842' },
                      { label: 'Pays de résidence', value: 'Cameroun' },
                      { label: 'Adresse', value: 'Bonapriso, Douala', full: true },
                    ]}
                  />
                </DrawerSection>
                <DrawerSection
                  title="Statut PPE"
                  description={openUbo.ppe ? 'Vigilance renforcée — Art. 41-48 R-2023/01' : 'Aucun statut PPE déclaré.'}
                >
                  {openUbo.ppe ? (
                    <div
                      style={{
                        padding: '12px 14px',
                        backgroundColor: '#FEF2F3',
                        border: '1px solid #FCE4E6',
                        borderRadius: '8px',
                        fontSize: '13px',
                        color: '#A50410',
                      }}
                    >
                      Position politique : ancien ministre — fin de fonction 2019. Période de vigilance prolongée
                      jusqu’en 2024 (cycle 5 ans), <strong>actuellement levée</strong>. Maintenir la déclaration au
                      titre du contrôle effectif.
                    </div>
                  ) : (
                    <FieldGrid items={[{ label: 'Déclaration sur l’honneur', value: 'Signée le 22/03/2026' }]} />
                  )}
                </DrawerSection>
              </>
            )}

            {activeTab === 'chaine' && (
              <DrawerSection
                title="Chaîne de détention"
                description="Propagation automatique des pourcentages — seuil paramétré : 10% (Wolfsberg)."
              >
                <div className={styles.chainNode}>
                  <Branch20Regular style={{ color: '#E30613' }} />
                  <div>
                    <div className={styles.chainNodeName}>{openUbo.partenaire}</div>
                    <div className={styles.chainNodeSub}>Entité contrôlée</div>
                  </div>
                </div>
                <div className={styles.chainNodeIndent}>
                  <div className={styles.chainNode}>
                    <div>
                      <div className={styles.chainNodeName}>Holdings International Ltd.</div>
                      <div className={styles.chainNodeSub}>Personne morale · Jersey</div>
                    </div>
                    <span className={styles.pct}>62% direct</span>
                  </div>
                  <div className={styles.chainNodeIndent}>
                    <div className={styles.chainNode}>
                      <div>
                        <div className={styles.chainNodeName}>{openUbo.nom}</div>
                        <div className={styles.chainNodeSub}>Personne physique · {openUbo.nationalite}</div>
                      </div>
                      <span className={styles.pct}>{(openUbo.partPct).toFixed(1)}% effectif</span>
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: '14px',
                    fontSize: '12px',
                    color: '#767676',
                    lineHeight: 1.5,
                  }}
                >
                  Calcul : 62% × {(openUbo.partPct / 0.62).toFixed(1)}% = {openUbo.partPct.toFixed(1)}% effectif. Au-delà du seuil
                  paramétré pour ce type de partenaire — bénéficiaire à déclarer et screener.
                </div>
              </DrawerSection>
            )}

            {activeTab === 'screening' && (
              <>
                <DrawerSection
                  title="Screening sanctions"
                  description="Interrogation quotidienne automatique — 03h00 Douala."
                >
                  {['ONU', 'OFAC', 'UE', 'Interpol'].map((src) => (
                    <div key={src} className={styles.screeningSource}>
                      <ShieldCheckmark20Regular style={{ color: '#15803D' }} />
                      <strong style={{ fontSize: '13px', color: '#15803D' }}>{src}</strong>
                      <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#767676' }}>
                        Aucun match — vérifié il y a 6h
                      </span>
                    </div>
                  ))}
                </DrawerSection>
                <DrawerSection title="Screening PPE">
                  <div
                    className={`${styles.screeningSource} ${openUbo.ppe ? styles.screeningSourceFail : ''}`}
                  >
                    {openUbo.ppe ? (
                      <>
                        <Warning20Filled style={{ color: '#E30613' }} />
                        <strong style={{ fontSize: '13px', color: '#A50410' }}>PPE actif</strong>
                        <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#A50410' }}>
                          Match score 92 — Dow Jones PEP
                        </span>
                      </>
                    ) : (
                      <>
                        <ShieldCheckmark20Regular style={{ color: '#15803D' }} />
                        <strong style={{ fontSize: '13px', color: '#15803D' }}>Pas de match PPE</strong>
                        <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#767676' }}>
                          Dow Jones / WorldCheck — il y a 6h
                        </span>
                      </>
                    )}
                  </div>
                </DrawerSection>
              </>
            )}

            {activeTab === 'historique' && (
              <DrawerSection title="Événements du dossier UBO">
                <DrawerTimeline
                  events={[
                    {
                      when: 'Aujourd’hui 03h12',
                      title: 'Screening quotidien exécuté',
                      detail: openUbo.ppe ? 'Match PPE confirmé — vigilance renforcée' : 'Aucun match — sources OK',
                    },
                    {
                      when: '12/05/2026 14:22',
                      title: 'Pièce d’identité validée',
                      detail: 'Passeport CMR contrôlé — Sarah Bell (DCONF)',
                    },
                    {
                      when: '02/05/2026 09:08',
                      title: 'Bénéficiaire déclaré par le tiers',
                      detail: `Saisie depuis l’espace partenaire — ${openUbo.partPct.toFixed(1)}%`,
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
        title="Valider ce bénéficiaire effectif ?"
        description="La validation est horodatée et archivée 10 ans (Art. 38 R-2023/01). Elle n’est plus modifiable après enregistrement."
        confirmLabel="Confirmer la validation"
        entityRef={openUbo?.nom}
        helperNote="La relation pourra être activée une fois tous les UBO de la chaîne validés."
        onConfirm={() => onConfirm()}
      />
      <ConfirmActionDialog
        open={confirmIntent === 'reject' && openUbo !== null}
        onOpenChange={(o) => !o && setConfirmIntent(null)}
        intent="reject"
        title="Rejeter ce bénéficiaire effectif ?"
        description="Le rejet bloque l’activation de la relation tant que le UBO n’est pas vérifié ou retiré de la chaîne."
        confirmLabel="Confirmer le rejet"
        requireMotif
        motifLabel="Motif du rejet"
        motifPlaceholder="Pièce d’identité non concordante, structure de détention non documentée…"
        entityRef={openUbo?.nom}
        onConfirm={onConfirm}
      />
      <ConfirmActionDialog
        open={confirmIntent === 'warn' && openUbo !== null}
        onOpenChange={(o) => !o && setConfirmIntent(null)}
        intent="warn"
        title="Demander un complément au tiers ?"
        description="Le tiers sera notifié par e-mail avec le détail des éléments à fournir."
        confirmLabel="Envoyer la demande"
        requireMotif
        motifLabel="Éléments demandés"
        motifPlaceholder="Pièce d’identité à jour, CV signé, justificatif de résidence…"
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
        eyebrow="Référentiel UBO"
        title="Ajouter un bénéficiaire effectif"
        subtitle="Déclare un nouveau UBO et déclenche automatiquement le screening sanctions / PPE."
        size="large"
        submitLabel="Ajouter et screener"
        submitDisabled={uboNom.trim().length < 3 || tiersParentId === '' || !uboPart}
        onSubmit={submitNewUbo}
      >
        <FormSection
          title="Entité contrôlée"
          description="Sélectionnez le partenaire dont le bénéficiaire détient une part."
        >
          <FieldRow>
            <Field label="Partenaire / Cible" required hint="Tiers parent (Dataverse)">
              <Dropdown
                placeholder="Sélectionner un tiers"
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
          <Field label="Nature du bénéficiaire" required>
            <RadioGroup
              value={natureUbo}
              onChange={(_, d) => setNatureUbo(d.value as 'physique' | 'morale')}
              layout="horizontal"
            >
              <Radio value="physique" label="Personne physique (UBO direct ou effectif)" />
              <Radio value="morale" label="Personne morale (chaîne indirecte)" />
            </RadioGroup>
          </Field>
        </FormSection>

        <FormSection title="Identité du bénéficiaire">
          <FieldRow cols={2}>
            <Field label={natureUbo === 'physique' ? 'Nom complet' : 'Raison sociale'} required>
              <Input
                value={uboNom}
                onChange={(_, d) => setUboNom(d.value)}
                placeholder={natureUbo === 'physique' ? 'James Wilson' : 'Holdings International Ltd.'}
              />
            </Field>
            <Field label={natureUbo === 'physique' ? 'Nationalité' : 'Pays d’incorporation'} required>
              <Input
                value={uboNationalite}
                onChange={(_, d) => setUboNationalite(d.value)}
                placeholder={natureUbo === 'physique' ? 'Britannique' : 'Jersey'}
              />
            </Field>
          </FieldRow>
          <FieldRow cols={2}>
            <Field label={natureUbo === 'physique' ? 'Date de naissance' : 'Date de constitution'}>
              <Input
                type="date"
                value={uboDateNaiss}
                onChange={(_, d) => setUboDateNaiss(d.value)}
              />
            </Field>
            <Field label="% de détention" required hint="Sur l’entité contrôlée sélectionnée">
              <Input
                type="number"
                value={uboPart}
                onChange={(_, d) => setUboPart(d.value)}
                contentAfter="%"
              />
            </Field>
          </FieldRow>
        </FormSection>

        <FormSection title="Vigilance et risques">
          <FieldRow cols={2}>
            <Field label="Nature du contrôle" required>
              <Dropdown
                value={uboNatureCtrl}
                selectedOptions={[uboNatureCtrl]}
                onOptionSelect={(_, d) => setUboNatureCtrl((d.optionValue ?? 'Direct') as 'Direct' | 'Indirect' | 'Effectif')}
              >
                <Option value="Direct">Direct</Option>
                <Option value="Indirect">Indirect</Option>
                <Option value="Effectif">Effectif</Option>
              </Dropdown>
            </Field>
            <Field label="Personne politiquement exposée (PPE)">
              <Switch
                checked={uboPpe}
                onChange={(_, d) => setUboPpe(d.checked)}
                label={uboPpe ? 'Oui — vigilance renforcée' : 'Non'}
              />
            </Field>
          </FieldRow>
          <Field>
            <Switch
              checked={screenImmediate}
              onChange={(_, d) => setScreenImmediate(d.checked)}
              label="Lancer immédiatement le screening (ONU, OFAC, UE, Interpol, PPE)"
            />
          </Field>
        </FormSection>
      </FormDialog>
    </div>
  );
}