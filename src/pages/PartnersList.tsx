import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  makeStyles,
  Field,
  Input,
  Dropdown,
  Option,
  Radio,
  RadioGroup,
  Tooltip,
  Switch,
} from '@fluentui/react-components';
import {
  Add20Regular,
  ArrowDownload20Regular,
  Building20Regular,
  CheckmarkCircle16Filled,
  ClipboardTaskListLtr20Regular,
  Clock16Filled,
  DocumentText20Regular,
  Edit20Regular,
  ErrorCircle16Filled,
  Eye20Regular,
  Mail20Regular,
  Open20Regular,
  Send20Regular,
} from '@fluentui/react-icons';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';
import { FilterBar } from '@/components/common/FilterBar';
import { DataTable, type Column } from '@/components/common/DataTable';
import { RisqueBadge, StatutBadge } from '@/components/common/StatusBadge';
import {
  DetailDrawer,
  DrawerSection,
  DrawerTimeline,
  FieldGrid,
  type StatusBadge as DrawerStatusBadge,
  type TimelineEvent,
} from '@/components/common/DetailDrawer';
import { ConfirmActionDialog } from '@/components/common/ConfirmActionDialog';
import { FormDialog, FormSection, FieldRow } from '@/components/common/FormDialog';
import { useNotifications } from '@/components/common/NotificationProvider';
import { type Partenaire } from '@/lib/mockData';
import { tiers, partnerTypes, utilisateursInternes } from '@/lib/dataverse/entityHooks';
import { toPartenaire } from '@/lib/dataverse/tiersMappers';
import { exportToCsv } from '@/lib/exportCsv';
import type { Afb_tierses } from '@/generated/models/Afb_tiersesModel';

/** Direction (formulaire) → choix Dataverse afb_directionporteuse. */
const DIRECTION_TO_DV: Record<string, number> = { TRESO: 0, DCONF: 1, DMG: 2, COMEX: 747010001 };
/** Risque (formulaire) → choix Dataverse afb_niveauderisque (0 Critique, 1 Élevé, 2 Standard). */
const RISQUE_TO_DV: Record<string, number> = { Low: 2, Medium: 1, High: 0 };
/** Maps inverses, pour pré-remplir le formulaire d'édition depuis l'enregistrement brut. */
const DV_TO_DIRECTION: Record<number, string> = { 0: 'TRESO', 1: 'DCONF', 2: 'DMG', 747010001: 'COMEX', 747010002: 'DCONF' };
const DV_TO_RISQUE: Record<number, 'Low' | 'Medium' | 'High'> = { 0: 'High', 1: 'Medium', 2: 'Low' };

/* ============================================================== */
const useStyles = makeStyles({
  kpiRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
    marginBottom: '16px',
  },
  miniCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '16px 20px',
    border: '1px solid #F4F4F4',
    boxShadow: '0 1px 2px rgba(15, 15, 15, 0.04)',
  },
  miniLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#767676',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px',
  },
  miniValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1A1A1A',
    lineHeight: 1,
  },
  miniMeta: { fontSize: '12px', color: '#767676', marginTop: '6px' },

  entityCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    backgroundColor: '#FCE4E6',
    color: '#E30613',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontSize: '14px',
    fontWeight: 700,
  },
  entityMeta: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  entityName: { fontSize: '13px', fontWeight: 600, color: '#1A1A1A' },
  entityCode: { fontSize: '11px', color: '#767676', fontFamily: 'monospace' },

  /* Drawer body  */
  uboTree: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  uboRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    borderRadius: '6px',
    transition: 'background-color 0.1s',
    ':hover': { backgroundColor: '#FAFAFA' },
  },
  uboBullet: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  uboName: {
    flex: 1,
    minWidth: 0,
    fontSize: '13px',
    color: '#1A1A1A',
    display: 'flex',
    flexDirection: 'column',
  },
  uboSub: { fontSize: '11px', color: '#767676' },
  uboPct: {
    fontFamily: 'monospace',
    fontSize: '12.5px',
    fontWeight: 700,
    color: '#1A1A1A',
    flexShrink: 0,
    backgroundColor: '#F4F4F4',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  uboChain: {
    paddingLeft: '24px',
    borderLeft: '2px dashed #F4F4F4',
    marginLeft: '4px',
  },
  /* Doc list ----- */
  docList: { display: 'flex', flexDirection: 'column', gap: '6px' },
  docRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    borderRadius: '6px',
    fontSize: '12.5px',
    color: '#1A1A1A',
    transition: 'background-color 0.1s',
    ':hover': { backgroundColor: '#FAFAFA' },
  },
  docMeta: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' },
  docName: { fontWeight: 500 },
  docSub: { fontSize: '11px', color: '#767676', fontFamily: 'monospace' },
  /* Evaluation card -- */
  evalRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '12px 14px',
    backgroundColor: '#FAFAFA',
    borderRadius: '8px',
    border: '1px solid #F4F4F4',
    marginBottom: '8px',
  },
  evalIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  evalBody: { flex: 1, minWidth: 0 },
  evalTitle: { fontSize: '13px', fontWeight: 600, color: '#1A1A1A' },
  evalMeta: { fontSize: '11.5px', color: '#767676' },
  evalScore: {
    fontFamily: 'monospace',
    fontWeight: 700,
    fontSize: '13px',
  },
});

const TYPE_OPTIONS = [
  { label: 'Tous les types', value: '' },
  { label: 'Partenaire', value: 'Partenaire' },
  { label: 'Fournisseur', value: 'Fournisseur' },
  { label: 'Cible', value: 'Cible' },
];
const RISQUE_OPTIONS = [
  { label: 'Tous les risques', value: '' },
  { label: 'Low', value: 'Low' },
  { label: 'Medium', value: 'Medium' },
  { label: 'High', value: 'High' },
];
const STATUT_OPTIONS = [
  { label: 'Tous statuts', value: '' },
  { label: 'Actif', value: 'Actif' },
  { label: 'Inactif', value: 'Inactif' },
];

function getInitials(name: string) {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/* ============================================================== */

export default function PartnersList() {
  const styles = useStyles();
  const { notifySuccess, notifyError } = useNotifications();

  // Données réelles depuis Dataverse (table afb_tiers).
  const { data: rawTiers, isLoading, error } = tiers.useList({ top: 200 });
  const partenaires = useMemo(() => (rawTiers ?? []).map(toPartenaire), [rawTiers]);
  const updateTiers = tiers.useUpdate();

  /* Filtres */
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [risqueFilter, setRisqueFilter] = useState('');
  const [statutFilter, setStatutFilter] = useState('');

  /* Drawer */
  const [openPartner, setOpenPartner] = useState<Partenaire | null>(null);

  /* Modals */
  const [newOpen, setNewOpen] = useState(false);
  const [editingTiers, setEditingTiers] = useState<Afb_tierses | null>(null);
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const [confirmRelaunch, setConfirmRelaunch] = useState(false);

  /** Ouvre le formulaire en mode édition avec l'enregistrement brut du tiers. */
  const startEditPartner = () => {
    const raw = (rawTiers ?? []).find((t) => t.afb_tiersid === openPartner?.id);
    if (raw) {
      setEditingTiers(raw);
      setOpenPartner(null);
      setNewOpen(true);
    }
  };

  const filtered = useMemo(() => {
    return partenaires.filter((p) => {
      if (typeFilter && p.type !== typeFilter) return false;
      if (risqueFilter && p.risque !== risqueFilter) return false;
      if (statutFilter && p.statut !== statutFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !p.raisonSociale.toLowerCase().includes(q) &&
          !p.code.toLowerCase().includes(q) &&
          !p.pays.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [partenaires, search, typeFilter, risqueFilter, statutFilter]);

  const kpis = {
    total: partenaires.length,
    actifs: partenaires.filter((p) => p.statut === 'Actif').length,
    highRisk: partenaires.filter((p) => p.risque === 'High').length,
    correspondants: partenaires.filter((p) => p.typeJuridique === 'BANK_CORR').length,
  };

  const drawerBadges: DrawerStatusBadge[] = openPartner
    ? [
        {
          label: openPartner.statut,
          color: openPartner.statut === 'Actif' ? 'success' : 'subtle',
          appearance: 'tint',
        },
        {
          label: `Risque ${openPartner.risque}`,
          color: openPartner.risque === 'High' ? 'danger' : openPartner.risque === 'Medium' ? 'warning' : 'subtle',
          appearance: 'tint',
        },
        { label: openPartner.type, color: 'brand', appearance: 'tint' },
        { label: openPartner.direction, color: 'informative', appearance: 'tint' },
      ]
    : [];

  const drawerTabs = openPartner
    ? [
        {
          key: 'overview',
          label: 'Identité',
          content: <PartnerOverviewTab partner={openPartner} />,
        },
        {
          key: 'ubo',
          label: 'Chaîne UBO',
          count: openPartner.typeJuridique === 'BANK_CORR' ? 5 : 3,
          content: <PartnerUBOTab partner={openPartner} />,
        },
        {
          key: 'docs',
          label: 'Bibliothèque',
          count: 14,
          alertCount: 2,
          content: <PartnerDocsTab />,
        },
        {
          key: 'evaluations',
          label: 'Évaluations',
          count: 3,
          content: <PartnerEvaluationsTab />,
        },
        {
          key: 'history',
          label: 'Historique',
          content: <PartnerHistoryTab partner={openPartner} />,
        },
      ]
    : [];

  /* Columns */
  const columns: Column<Partenaire>[] = [
    {
      key: 'entite',
      header: 'Entité',
      render: (p) => (
        <div className={styles.entityCell} onClick={() => setOpenPartner(p)}>
          <div className={styles.avatar}>{getInitials(p.raisonSociale)}</div>
          <div className={styles.entityMeta}>
            <span className={styles.entityName}>{p.raisonSociale}</span>
            <span className={styles.entityCode}>{p.code}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (p) => (
        <Badge appearance="tint" color={p.type === 'Cible' ? 'warning' : 'subtle'} size="small">
          {p.type}
        </Badge>
      ),
    },
    { key: 'juridique', header: 'Forme juridique', render: (p) => p.typeJuridique },
    { key: 'pays', header: 'Pays', render: (p) => p.pays },
    { key: 'risque', header: 'Risque', render: (p) => <RisqueBadge risque={p.risque} /> },
    { key: 'statut', header: 'Statut', render: (p) => <StatutBadge statut={p.statut} /> },
    { key: 'direction', header: 'Direction', render: (p) => p.direction },
    {
      key: 'maj',
      header: 'Dernière MAJ',
      render: (p) => <span style={{ color: '#767676' }}>{p.dernierUpdate}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (p) => (
        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
          <Tooltip content="Ouvrir la fiche" relationship="label">
            <Button size="small" appearance="subtle" icon={<Eye20Regular />} onClick={() => setOpenPartner(p)} />
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Référentiel"
        title="Partenaires & Cibles"
        subtitle="Référentiel central des tiers — banques correspondantes, fournisseurs et cibles en onboarding."
        actions={
          <>
            <Button
              icon={<ArrowDownload20Regular />}
              appearance="outline"
              onClick={() => {
                const ok = exportToCsv(
                  `partenaires-${new Date().toISOString().slice(0, 10)}.csv`,
                  filtered.map((p) => ({
                    Code: p.code,
                    'Raison sociale': p.raisonSociale,
                    Type: p.type,
                    'Forme juridique': p.typeJuridique,
                    Pays: p.pays,
                    Risque: p.risque,
                    Statut: p.statut,
                    Direction: p.direction,
                    'Dernière MAJ': p.dernierUpdate,
                  })),
                );
                if (ok) notifySuccess('Export généré', `${filtered.length} partenaires exportés (CSV).`);
                else notifyError('Aucune donnée', 'Aucun partenaire à exporter.');
              }}
            >
              Export
            </Button>
            <Button icon={<Add20Regular />} appearance="primary" onClick={() => setNewOpen(true)}>
              Nouveau partenaire
            </Button>
          </>
        }
      />

      <div className={styles.kpiRow}>
        <div className={styles.miniCard}>
          <div className={styles.miniLabel}>Total partenaires</div>
          <div className={styles.miniValue}>{kpis.total}</div>
          <div className={styles.miniMeta}>portefeuille consolidé</div>
        </div>
        <div className={styles.miniCard}>
          <div className={styles.miniLabel}>Actifs</div>
          <div className={styles.miniValue} style={{ color: '#15803D' }}>
            {kpis.actifs}
          </div>
          <div className={styles.miniMeta}>en relation d'affaires</div>
        </div>
        <div className={styles.miniCard}>
          <div className={styles.miniLabel}>Risque élevé</div>
          <div className={styles.miniValue} style={{ color: '#E30613' }}>
            {kpis.highRisk}
          </div>
          <div className={styles.miniMeta}>suivi renforcé</div>
        </div>
        <div className={styles.miniCard}>
          <div className={styles.miniLabel}>Banques correspondantes</div>
          <div className={styles.miniValue}>{kpis.correspondants}</div>
          <div className={styles.miniMeta}>Wolfsberg requis</div>
        </div>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher un partenaire, un code, un pays…"
        filters={[
          { key: 'type', label: 'Type', value: typeFilter, options: TYPE_OPTIONS, onChange: setTypeFilter },
          { key: 'risque', label: 'Risque', value: risqueFilter, options: RISQUE_OPTIONS, onChange: setRisqueFilter },
          { key: 'statut', label: 'Statut', value: statutFilter, options: STATUT_OPTIONS, onChange: setStatutFilter },
        ]}
      />

      <Card
        flush
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Building20Regular /> Liste des partenaires
          </span>
        }
        subtitle={`${filtered.length} sur ${partenaires.length} entités · cliquer une ligne pour ouvrir la fiche 360°`}
      >
        {error ? (
          <div style={{ padding: '24px', color: '#C20012', fontSize: '13px' }}>
            Erreur de chargement depuis Dataverse : {error.message}
          </div>
        ) : isLoading ? (
          <div style={{ padding: '24px', color: '#767676', fontSize: '13px' }}>Chargement des partenaires…</div>
        ) : (
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(p) => p.id}
            emptyMessage="Aucun partenaire ne correspond aux filtres."
            onRowClick={(p) => setOpenPartner(p)}
          />
        )}
      </Card>

      {/* =================================================== */}
      {/*  Drawer 360°                                          */}
      {/* =================================================== */}
      <DetailDrawer
        open={openPartner !== null && !confirmSuspend && !confirmRelaunch}
        onClose={() => setOpenPartner(null)}
        eyebrow={openPartner?.type ?? ''}
        title={openPartner?.raisonSociale ?? ''}
        subtitle={
          openPartner ? (
            <>
              <code style={{ fontFamily: 'monospace', color: '#1A1A1A' }}>{openPartner.code}</code> ·{' '}
              {openPartner.typeJuridique} · {openPartner.pays} · MAJ {openPartner.dernierUpdate}
            </>
          ) : null
        }
        statusBadges={drawerBadges}
        size="large"
        headerActions={
          <>
            <Tooltip content="E-mail du contact principal" relationship="label">
              <Button
                size="small"
                appearance="subtle"
                icon={<Mail20Regular />}
                onClick={() =>
                  window.open(
                    `mailto:?subject=${encodeURIComponent(`Dossier KYC — ${openPartner?.raisonSociale ?? ''}`)}`,
                  )
                }
              />
            </Tooltip>
            <Tooltip content="Ouvrir l'enregistrement dans Power Apps" relationship="label">
              <Button
                size="small"
                appearance="subtle"
                icon={<Open20Regular />}
                onClick={() =>
                  openPartner &&
                  window.open(
                    `https://org40a0a528.crm12.dynamics.com/main.aspx?pagetype=entityrecord&etn=afb_tiers&id=${openPartner.id}`,
                    '_blank',
                    'noopener',
                  )
                }
              />
            </Tooltip>
          </>
        }
        tabs={drawerTabs}
        footer={
          <>
            <Button
              appearance="subtle"
              icon={<Send20Regular />}
              onClick={() => setConfirmRelaunch(true)}
              disabled={!openPartner}
            >
              Relancer le tiers
            </Button>
            <div style={{ flex: 1 }} />
            <Button
              appearance="outline"
              onClick={() => setConfirmSuspend(true)}
              disabled={!openPartner || openPartner.statut === 'Inactif'}
              style={{ borderTopColor: '#A50410', borderRightColor: '#A50410', borderBottomColor: '#A50410', borderLeftColor: '#A50410', color: '#A50410' }}
            >
              Suspendre la relation
            </Button>
            <Button appearance="outline" icon={<Edit20Regular />} onClick={startEditPartner} disabled={!openPartner}>
              Modifier la fiche
            </Button>
            <Button appearance="primary" icon={<DocumentText20Regular />} onClick={() => window.print()}>
              Générer dossier PDF
            </Button>
          </>
        }
      />

      {/* Confirm — Suspendre */}
      <ConfirmActionDialog
        open={confirmSuspend}
        onClose={() => setConfirmSuspend(false)}
        onConfirm={async () => {
          if (openPartner) {
            try {
              await updateTiers.mutateAsync({
                id: openPartner.id,
                changes: { afb_statutdutiers: 747010001 }, // Suspendu
              });
            } catch (e) {
              notifyError('Suspension impossible', e instanceof Error ? e.message : 'Erreur Dataverse.');
              throw e;
            }
          }
          notifySuccess(
            'Relation suspendue',
            `${openPartner?.raisonSociale} est suspendu. Aucun nouveau traitement n'est possible.`,
          );
          setConfirmSuspend(false);
          setOpenPartner(null);
        }}
        intent="suspend"
        title="Suspendre la relation avec ce tiers"
        entityRef={openPartner?.code}
        description={
          <>
            La suspension de <strong>{openPartner?.raisonSociale}</strong> bloquera toute nouvelle opération
            avec ce tiers. La décision sera notifiée au RCSI et au chargé de relation.
          </>
        }
        helperNote="La suspension est levée automatiquement après mise à jour du dossier et nouvelle validation hiérarchique."
      />

      {/* Confirm — Relance */}
      <ConfirmActionDialog
        open={confirmRelaunch}
        onClose={() => setConfirmRelaunch(false)}
        onConfirm={async () => {
          await new Promise((r) => setTimeout(r, 400));
          notifySuccess(
            'Relance envoyée',
            `Un e-mail a été envoyé au contact principal de ${openPartner?.raisonSociale}.`,
          );
          setConfirmRelaunch(false);
        }}
        intent="info"
        title="Envoyer une relance"
        entityRef={openPartner?.code}
        description="Le tiers recevra un e-mail avec lien direct vers son espace personnel et la liste précise des pièces à fournir."
        motifRequired={false}
        confirmLabel="Envoyer la relance"
      />

      {/* Nouveau partenaire / Édition */}
      <NewPartnerModal
        open={newOpen}
        editing={editingTiers}
        onClose={() => { setNewOpen(false); setEditingTiers(null); }}
        onCreated={(name, isCible) => {
          if (editingTiers) {
            notifySuccess('Fiche mise à jour', `${name} — modifications enregistrées dans Dataverse.`);
          } else {
            notifySuccess(
              isCible ? 'Cible créée' : 'Partenaire créé',
              isCible
                ? `${name} a été ajouté en mode onboarding. Le parcours en 5 étapes démarre.`
                : `${name} a été ajouté au référentiel. Invitation envoyée.`,
              { action: { label: 'Ouvrir la fiche', onClick: () => {} } },
            );
          }
        }}
        onError={(msg) => notifyError(editingTiers ? 'Modification impossible' : 'Création impossible', msg)}
      />
    </div>
  );
}

/* ============================================================== */
/*  Drawer — Tab 1 : Identité                                       */
/* ============================================================== */

function PartnerOverviewTab({ partner }: { partner: Partenaire }) {
  return (
    <>
      <DrawerSection title="Identification juridique">
        <FieldGrid
          fields={[
            { label: 'Raison sociale', value: partner.raisonSociale, full: true },
            { label: 'Code AFB', value: partner.code, mono: true },
            { label: 'Forme juridique', value: partner.typeJuridique },
            { label: 'Pays de siège', value: partner.pays },
            { label: 'Type', value: partner.type },
            { label: 'Direction porteuse', value: partner.direction },
            { label: 'Date de référencement', value: '12/03/2024' },
            { label: 'Dernière MAJ', value: partner.dernierUpdate },
          ]}
        />
      </DrawerSection>

      <DrawerSection title="Contact principal">
        <FieldGrid
          fields={[
            { label: 'Nom du contact', value: 'Sarah Bell' },
            { label: 'Fonction', value: 'Head of FI' },
            { label: 'E-mail', value: 'sarah.bell@example.com', mono: true },
            { label: 'Téléphone', value: '+1 212 555 0142', mono: true },
          ]}
        />
      </DrawerSection>

      <DrawerSection
        title="Référentiels externes"
        action={<Badge appearance="tint" color="success" size="small">Vérifié</Badge>}
      >
        <FieldGrid
          fields={[
            { label: 'SWIFT / BIC', value: partner.typeJuridique === 'BANK_CORR' ? 'CITIUS33' : '—', mono: true },
            { label: 'LEI', value: partner.typeJuridique === 'BANK_CORR' ? 'E57ODZWZ7FF32TWEFA76' : '—', mono: true },
            { label: 'GIIN (FATCA)', value: partner.typeJuridique === 'BANK_CORR' ? 'E1OFOM.00000.LE.840' : '—', mono: true },
            { label: 'NIU', value: 'M082300000456', mono: true },
          ]}
        />
      </DrawerSection>
    </>
  );
}

/* ============================================================== */
/*  Drawer — Tab 2 : Chaîne UBO                                     */
/* ============================================================== */

function PartnerUBOTab({ partner }: { partner: Partenaire }) {
  const styles = useStyles();
  const seuil = partner.typeJuridique === 'BANK_CORR' ? 10 : partner.risque === 'High' ? 10 : 25;
  return (
    <>
      <DrawerSection
        title={`Seuil paramétré : ${seuil}% — ${partner.typeJuridique === 'BANK_CORR' ? 'pratique Wolfsberg' : 'CEMAC standard'}`}
        action={<Button size="small" appearance="subtle">Visualiser l'arbre</Button>}
      >
        <div className={styles.uboTree}>
          <div className={styles.uboRow}>
            <span className={styles.uboBullet} style={{ backgroundColor: '#15803D' }} />
            <div className={styles.uboName}>
              <strong>Sarah Bell</strong>
              <span className={styles.uboSub}>Personne physique · États-Unis · CNI ✓ · PPE non</span>
            </div>
            <span className={styles.uboPct}>42,5 %</span>
          </div>

          <div className={styles.uboRow}>
            <span className={styles.uboBullet} style={{ backgroundColor: '#15803D' }} />
            <div className={styles.uboName}>
              <strong>Holdings International Ltd</strong>
              <span className={styles.uboSub}>Personne morale · Royaume-Uni · 38 % direct</span>
            </div>
            <span className={styles.uboPct}>38,0 %</span>
          </div>
          <div className={styles.uboChain}>
            <div className={styles.uboRow}>
              <span className={styles.uboBullet} style={{ backgroundColor: '#15803D' }} />
              <div className={styles.uboName}>
                <strong>James Wilson</strong>
                <span className={styles.uboSub}>UBO indirect · Royaume-Uni · CNI ✓</span>
              </div>
              <span className={styles.uboPct}>26,6 %</span>
            </div>
            <div className={styles.uboRow}>
              <span className={styles.uboBullet} style={{ backgroundColor: '#B45309' }} />
              <div className={styles.uboName}>
                <strong>Adama Diop</strong>
                <span className={styles.uboSub}>UBO indirect · Sénégal · PPE détectée — à examiner</span>
              </div>
              <span className={styles.uboPct}>11,4 %</span>
            </div>
          </div>

          <div className={styles.uboRow}>
            <span className={styles.uboBullet} style={{ backgroundColor: '#15803D' }} />
            <div className={styles.uboName}>
              <strong>Marie-Claire Ndong</strong>
              <span className={styles.uboSub}>Personne physique · Cameroun · CNI ✓ · PPE auto-déclarée</span>
            </div>
            <span className={styles.uboPct}>19,5 %</span>
          </div>
        </div>
      </DrawerSection>

      <DrawerSection title="Alertes UBO">
        <div
          style={{
            display: 'flex',
            gap: '10px',
            padding: '12px 14px',
            backgroundColor: '#FEF2F3',
            border: '1px solid #FCE4E6',
            borderRadius: '8px',
            fontSize: '12.5px',
            color: '#A50410',
            lineHeight: 1.5,
          }}
        >
          <ErrorCircle16Filled style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>
            <strong>1 UBO requiert une revue</strong> — Adama Diop (PPE détectée). Vérifier les justificatifs
            et la chaîne de détention indirecte avant validation.
          </span>
        </div>
      </DrawerSection>
    </>
  );
}

/* ============================================================== */
/*  Drawer — Tab 3 : Bibliothèque documentaire                      */
/* ============================================================== */

function PartnerDocsTab() {
  const styles = useStyles();
  const docs2026 = [
    { name: 'Statuts à jour', sub: 'STATUTS_2026.pdf · v3', status: 'valid' as const },
    { name: 'RCCM', sub: 'RCCM_2025.pdf · v1', status: 'valid' as const },
    { name: 'Licence bancaire', sub: 'AGREMENT_2024.pdf', status: 'valid' as const },
    { name: 'Wolfsberg', sub: 'WOLFSBERG_2025.pdf · expire 04/07/2026', status: 'expiring' as const, label: 'Expire dans 47j' },
    { name: 'FATCA W-8 BEN-E', sub: 'FATCA_2025.pdf', status: 'valid' as const },
    { name: 'US Patriot Act', sub: 'Manquant', status: 'missing' as const, label: 'Manquant' },
  ];

  return (
    <>
      <DrawerSection
        title="Année 2026 — 6 pièces actives"
        action={
          <Button size="small" appearance="subtle" icon={<ArrowDownload20Regular />}>
            Export ZIP
          </Button>
        }
      >
        <div className={styles.docList}>
          {docs2026.map((d) => (
            <div key={d.name} className={styles.docRow}>
              {d.status === 'valid' && <CheckmarkCircle16Filled style={{ color: '#15803D' }} />}
              {d.status === 'expiring' && <Clock16Filled style={{ color: '#B45309' }} />}
              {d.status === 'missing' && <ErrorCircle16Filled style={{ color: '#E30613' }} />}
              <div className={styles.docMeta}>
                <span className={styles.docName}>{d.name}</span>
                <span className={styles.docSub}>{d.sub}</span>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: d.status === 'missing' ? '#E30613' : d.status === 'expiring' ? '#B45309' : '#15803D',
                  flexShrink: 0,
                }}
              >
                {d.label ?? 'Valide'}
              </span>
            </div>
          ))}
        </div>
      </DrawerSection>

      <DrawerSection title="Années précédentes" action={<Badge appearance="tint" color="subtle" size="small">8 pièces · 2024-2025</Badge>}>
        <div style={{ fontSize: '12px', color: '#767676', lineHeight: 1.5 }}>
          Les versions antérieures restent consultables. Cliquez sur une catégorie pour voir l'historique complet.
        </div>
      </DrawerSection>
    </>
  );
}

/* ============================================================== */
/*  Drawer — Tab 4 : Évaluations                                    */
/* ============================================================== */

function PartnerEvaluationsTab() {
  const styles = useStyles();
  const evals = [
    { type: 'AML', title: 'Questionnaire AML 2026', meta: 'Soumis le 18/04/2026 · M. Eboa', score: '85/100', color: '#15803D', bg: '#DCFCE7' },
    { type: 'SLA', title: 'Évaluation SLA semestrielle', meta: 'Soumis le 12/03/2026 · S. Nkoa', score: '78/100', color: '#15803D', bg: '#DCFCE7' },
    { type: 'EXT', title: 'Fiche Agent Banking — 74 points', meta: 'À soumettre · échéance 30/06/2026', score: 'En cours', color: '#B45309', bg: '#FEF3C7' },
  ];
  return (
    <DrawerSection title="Questionnaires actifs">
      {evals.map((e) => (
        <div key={e.title} className={styles.evalRow}>
          <div className={styles.evalIcon} style={{ backgroundColor: e.bg, color: e.color }}>
            <ClipboardTaskListLtr20Regular />
          </div>
          <div className={styles.evalBody}>
            <div className={styles.evalTitle}>{e.title}</div>
            <div className={styles.evalMeta}>
              <strong>{e.type}</strong> · {e.meta}
            </div>
          </div>
          <span className={styles.evalScore} style={{ color: e.color }}>
            {e.score}
          </span>
        </div>
      ))}
    </DrawerSection>
  );
}

/* ============================================================== */
/*  Drawer — Tab 5 : Historique                                     */
/* ============================================================== */

function PartnerHistoryTab({ partner }: { partner: Partenaire }) {
  const events: TimelineEvent[] = [
    { id: '1', date: 'Hier · 16:42', title: 'Validation du questionnaire AML', author: 'M. Eboa' },
    { id: '2', date: '18/04/2026', title: 'Questionnaire AML soumis', description: 'Pièces UBO mises à jour' },
    { id: '3', date: '03/04/2026', title: 'Screening batch nocturne', description: '1 match PPE faible — UBO indirect' },
    { id: '4', date: '15/03/2026', title: 'Refresh annuel déclenché', color: '#B45309' },
    { id: '5', date: '12/03/2024', title: `${partner.type} référencé`, author: 'Système', description: 'Onboarding initial validé.' },
  ];
  return (
    <DrawerSection title="Historique complet">
      <DrawerTimeline events={events} />
    </DrawerSection>
  );
}

/* ============================================================== */
/*  Nouveau partenaire — modal                                      */
/* ============================================================== */

interface NewPartnerModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (name: string, isCible: boolean) => void;
  onError: (msg: string) => void;
  /** Enregistrement brut à éditer ; si fourni, le formulaire passe en mode édition. */
  editing?: Afb_tierses | null;
}

function NewPartnerModal({ open, onClose, onCreated, onError, editing }: NewPartnerModalProps) {
  const create = tiers.useCreate();
  const update = tiers.useUpdate();
  const { data: ptData } = partnerTypes.useList({ top: 200 });
  const { data: userData } = utilisateursInternes.useList({ top: 200 });

  const [type, setType] = useState<'Partenaire' | 'Fournisseur' | 'Cible'>('Partenaire');
  const [raisonSociale, setRaisonSociale] = useState('');
  const [typeJuridiqueId, setTypeJuridiqueId] = useState('');
  const [chargeId, setChargeId] = useState('');
  const [pays, setPays] = useState('Cameroun');
  const [direction, setDirection] = useState('DCONF');
  const [risque, setRisque] = useState<'Low' | 'Medium' | 'High'>('Low');
  const [emailContact, setEmailContact] = useState('');
  const [autoInvite, setAutoInvite] = useState(true);

  // Pré-remplissage en mode édition (pattern « adjust state during render »).
  const [prevEditing, setPrevEditing] = useState<Afb_tierses | null | undefined>(undefined);
  if (editing !== prevEditing) {
    setPrevEditing(editing);
    if (editing) {
      setType(editing.afb_statutdutiers === 1 ? 'Cible' : 'Partenaire');
      setRaisonSociale(editing.afb_nomdupartenaire ?? '');
      setTypeJuridiqueId(editing._afb_typejuridique_value ?? '');
      setChargeId(editing._afb_chargederelation_value ?? '');
      setPays(editing.afb_pays ?? '');
      setDirection(DV_TO_DIRECTION[editing.afb_directionporteuse as number] ?? 'DCONF');
      setRisque(DV_TO_RISQUE[editing.afb_niveauderisque as number] ?? 'Low');
      setEmailContact(editing.afb_emailcontactprincipal ?? '');
      setAutoInvite(false);
    }
  }

  const reset = () => {
    setType('Partenaire');
    setRaisonSociale('');
    setTypeJuridiqueId('');
    setChargeId('');
    setPays('Cameroun');
    setDirection('DCONF');
    setRisque('Low');
    setEmailContact('');
    setAutoInvite(true);
  };

  const handleClose = () => {
    onClose();
    setTimeout(reset, 200);
  };

  const emailValid = !autoInvite || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailContact);
  const canSubmit =
    raisonSociale.trim().length >= 3 && emailValid && typeJuridiqueId !== '' && chargeId !== '';

  const handleSubmit = async () => {
    const common = {
      afb_nomdupartenaire: raisonSociale,
      afb_pays: pays,
      afb_directionporteuse: DIRECTION_TO_DV[direction] ?? 1,
      afb_niveauderisque: RISQUE_TO_DV[risque] ?? 2,
      afb_statutdutiers: type === 'Cible' ? 1 : 0,
      ...(emailContact ? { afb_emailcontactprincipal: emailContact } : {}),
      'afb_typejuridique@odata.bind': `/afb_partnertypes(${typeJuridiqueId})`,
      'afb_chargederelation@odata.bind': `/afb_utilisateurinternes(${chargeId})`,
    };
    try {
      if (editing) {
        await update.mutateAsync({
          id: editing.afb_tiersid,
          changes: common as unknown as Parameters<typeof update.mutateAsync>[0]['changes'],
        });
      } else {
        await create.mutateAsync({
          ...common,
          afb_datedecreationsysteme: new Date().toISOString(),
        } as unknown as Parameters<typeof create.mutateAsync>[0]);
      }
      onCreated(raisonSociale, type === 'Cible');
      handleClose();
    } catch (e) {
      onError(
        e instanceof Error
          ? e.message
          : "Impossible d'enregistrer le tiers — vérifier la connexion Dataverse.",
      );
      throw e;
    }
  };

  return (
    <FormDialog
      open={open}
      onClose={handleClose}
      onSubmit={handleSubmit}
      eyebrow="Référentiel tiers"
      title={editing ? 'Modifier la fiche du tiers' : 'Ajouter un nouveau partenaire'}
      subtitle="Créer la fiche d'un partenaire actif, d'un fournisseur ou démarrer l'onboarding d'une cible prospective."
      size="large"
      submitDisabled={!canSubmit}
      submitLabel={editing ? 'Enregistrer les modifications' : type === 'Cible' ? 'Démarrer l\'onboarding cible' : 'Créer et inviter'}
    >
      <FormSection
        title="Nature de la relation"
        description="La distinction Partenaire / Cible détermine le parcours d'onboarding et l'inclusion dans les indicateurs C1–C4."
      >
        <Field label="Type" required>
          <RadioGroup value={type} onChange={(_, data) => setType(data.value as 'Partenaire' | 'Fournisseur' | 'Cible')} layout="horizontal">
            <Radio value="Partenaire" label="Partenaire actif" />
            <Radio value="Fournisseur" label="Fournisseur" />
            <Radio value="Cible" label="Cible prospective" />
          </RadioGroup>
        </Field>
      </FormSection>

      <FormSection title="Identification juridique">
        <FieldRow cols={1}>
          <Field
            label="Raison sociale"
            required
            validationState={raisonSociale.length > 0 && raisonSociale.trim().length < 3 ? 'warning' : 'none'}
            validationMessage={
              raisonSociale.length > 0 && raisonSociale.trim().length < 3
                ? 'Doit comporter au moins 3 caractères.'
                : undefined
            }
          >
            <Input
              value={raisonSociale}
              onChange={(_, data) => setRaisonSociale(data.value)}
              placeholder="Ex. : SOCAPALM SA — Cameroun"
              contentBefore={<Building20Regular />}
            />
          </Field>
        </FieldRow>
        <FieldRow cols={3}>
          <Field label="Forme juridique" required hint="Type de partenaire (Dataverse)">
            <Dropdown
              placeholder="Sélectionner un type"
              value={ptData?.find((p) => p.afb_partnertypeid === typeJuridiqueId)?.afb_libellefrancais ?? ''}
              selectedOptions={typeJuridiqueId ? [typeJuridiqueId] : []}
              onOptionSelect={(_, d) => d.optionValue && setTypeJuridiqueId(d.optionValue)}
            >
              {(ptData ?? []).map((p) => (
                <Option key={p.afb_partnertypeid} value={p.afb_partnertypeid}>
                  {p.afb_libellefrancais}
                </Option>
              ))}
            </Dropdown>
          </Field>
          <Field label="Pays de siège" required>
            <Dropdown value={pays} selectedOptions={[pays]} onOptionSelect={(_, d) => d.optionValue && setPays(d.optionValue)}>
              <Option value="Cameroun">Cameroun</Option>
              <Option value="Congo">Congo</Option>
              <Option value="Gabon">Gabon</Option>
              <Option value="Tchad">Tchad</Option>
              <Option value="France">France</Option>
              <Option value="États-Unis">États-Unis</Option>
              <Option value="Royaume-Uni">Royaume-Uni</Option>
            </Dropdown>
          </Field>
          <Field label="Direction porteuse" required>
            <Dropdown value={direction} selectedOptions={[direction]} onOptionSelect={(_, d) => d.optionValue && setDirection(d.optionValue)}>
              <Option value="DCONF">DCONF</Option>
              <Option value="DMG">DMG</Option>
              <Option value="TRESO">TRESO</Option>
              <Option value="COMEX">COMEX</Option>
            </Dropdown>
          </Field>
        </FieldRow>
      </FormSection>

      <FormSection title="Évaluation et invitation">
        <FieldRow cols={1}>
          <Field label="Chargé de relation" required hint="Utilisateur interne responsable du tiers">
            <Dropdown
              placeholder="Sélectionner un chargé de relation"
              value={userData?.find((u) => u.afb_utilisateurinterneid === chargeId)?.afb_nomcomplet ?? ''}
              selectedOptions={chargeId ? [chargeId] : []}
              onOptionSelect={(_, d) => d.optionValue && setChargeId(d.optionValue)}
            >
              {(userData ?? []).map((u) => (
                <Option key={u.afb_utilisateurinterneid} value={u.afb_utilisateurinterneid}>
                  {u.afb_nomcomplet}
                </Option>
              ))}
            </Dropdown>
          </Field>
        </FieldRow>
        <FieldRow cols={1}>
          <Field label="Niveau de risque estimé">
            <RadioGroup value={risque} onChange={(_, data) => setRisque(data.value as 'Low' | 'Medium' | 'High')} layout="horizontal">
              <Radio value="Low" label="Faible" />
              <Radio value="Medium" label="Moyen" />
              <Radio value="High" label="Élevé" />
            </RadioGroup>
          </Field>
        </FieldRow>
        <FieldRow cols={1}>
          <Field label="Envoyer immédiatement l'invitation Azure AD B2C">
            <Switch
              checked={autoInvite}
              onChange={(_, data) => setAutoInvite(data.checked)}
              label={autoInvite ? 'Activé — e-mail envoyé à la création' : 'Désactivé — créer en brouillon'}
            />
          </Field>
        </FieldRow>
        {autoInvite && (
          <FieldRow cols={1}>
            <Field
              label="E-mail du contact principal"
              required
              validationState={emailContact.length > 0 && !emailValid ? 'warning' : 'none'}
              validationMessage={emailContact.length > 0 && !emailValid ? 'Adresse e-mail invalide.' : undefined}
            >
              <Input
                type="email"
                value={emailContact}
                onChange={(_, data) => setEmailContact(data.value)}
                placeholder="contact@entreprise.com"
                contentBefore={<Mail20Regular />}
              />
            </Field>
          </FieldRow>
        )}
      </FormSection>
    </FormDialog>
  );
}