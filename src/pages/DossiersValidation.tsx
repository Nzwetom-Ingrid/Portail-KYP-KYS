import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Field,
  Input,
  Textarea,
  Tooltip,
  Checkbox,
  Dropdown,
  Option,
  makeStyles,
  mergeClasses,
} from '@fluentui/react-components';
import {
  Add20Regular,
  ArrowDownload20Regular,
  Building20Regular,
  Calendar20Regular,
  CheckmarkCircle16Filled,
  CheckmarkCircle20Filled,
  CheckmarkCircle20Regular,
  ClipboardTaskListLtr20Regular,
  Clock16Filled,
  DismissCircle20Regular,
  DocumentText20Regular,
  ErrorCircle16Filled,
  Eye20Regular,
  Flash20Regular,
  Handshake20Regular,
  Mail20Regular,
  PeopleTeam20Regular,
  ShieldCheckmark20Regular,
  VehicleTruck20Regular,
} from '@fluentui/react-icons';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';
import { FilterBar } from '@/components/common/FilterBar';
import { DataTable, type Column } from '@/components/common/DataTable';
import { RisqueBadge, SLABadge, StatutBadge } from '@/components/common/StatusBadge';
import {
  DetailDrawer,
  DrawerSection,
  DrawerTimeline,
  FieldGrid,
  type StatusBadge as DrawerStatusBadge,
} from '@/components/common/DetailDrawer';
import { FormDialog, FormSection, FieldRow } from '@/components/common/FormDialog';
import { ConfirmActionDialog } from '@/components/common/ConfirmActionDialog';
import { useNotifications } from '@/components/common/NotificationProvider';
import { type Dossier } from '@/lib/mockData';
import { dossiersKypKys, tiers as tiersHooks, partnerTypes, utilisateursInternes } from '@/lib/dataverse/entityHooks';
import { toDossier } from '@/lib/dataverse/dossierMappers';
import { exportToCsv } from '@/lib/exportCsv';

/** Statut du dossier (affichage) → choix Dataverse afb_statutdudossier. */
const STATUT_DOSSIER_TO_DV = { valider: 0, enRevue: 1, completer: 2, suspendre: 747010001, rejeter: 747010002 } as const;
import {
  entityTypeLabels,
  entityTypeDescriptions,
  entityTypeValidityMonths,
  requiredDocsByType,
  type EntityType,
} from '@/lib/entity-types';

/* =====================================================================
   Styles
   ===================================================================== */

const useStyles = makeStyles({
  /* Queue */
  queueRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '14px',
    marginBottom: '20px',
  },
  queueCard: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: '14px',
    padding: '20px 22px 18px',
    border: '1px solid #ECEAE4',
    boxShadow: '0 1px 2px rgba(15, 15, 15, 0.03)',
    overflow: 'hidden',
    minHeight: '128px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    transition: 'transform 280ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 280ms, border-color 280ms',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 12px 24px -6px rgba(15, 15, 15, 0.08), 0 4px 8px -2px rgba(15, 15, 15, 0.04)',
      borderTopColor: '#E0DDD3', borderRightColor: '#E0DDD3', borderBottomColor: '#E0DDD3', borderLeftColor: '#E0DDD3',
    },
    '::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '3px',
      backgroundColor: 'currentColor',
      opacity: 0.85,
    },
  },
  queueLabel: {
    fontSize: '11.5px',
    fontWeight: 700,
    color: '#737373',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '4px',
  },
  queueValue: {
    fontSize: '36px',
    fontWeight: 700,
    color: '#0A0A0A',
    lineHeight: 1,
    letterSpacing: '-0.03em',
    fontVariantNumeric: 'tabular-nums',
  },
  queueMeta: {
    fontSize: '12px',
    color: '#737373',
    marginTop: 'auto',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
  queueBubble: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    width: '34px',
    height: '34px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF9F6',
    border: '1px solid #ECEAE4',
  },

  /* Entity cell */
  entityCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '34px',
    height: '34px',
    borderRadius: '10px',
    backgroundColor: '#FDF0F1',
    color: '#C20012',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontSize: '12.5px',
    fontWeight: 700,
    letterSpacing: '-0.01em',
  },
  entityMeta: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  entityName: { fontSize: '13.5px', fontWeight: 600, color: '#1A1A1A', letterSpacing: '-0.005em' },
  entityCode: {
    fontSize: '11px',
    color: '#A3A3A3',
    fontFamily: '"JetBrains Mono", monospace',
  },
  rowActions: {
    display: 'flex',
    gap: '4px',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },

  /* Type cards in modal */
  typeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
  },
  typeCard: {
    position: 'relative',
    textAlign: 'left',
    padding: '16px 16px 14px',
    borderRadius: '12px',
    border: '1.5px solid #ECEAE4',
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
    transition: 'all 220ms cubic-bezier(0.16, 1, 0.3, 1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    ':hover': {
      borderTopColor: '#FDA3AA', borderRightColor: '#FDA3AA', borderBottomColor: '#FDA3AA', borderLeftColor: '#FDA3AA',
      boxShadow: '0 6px 16px -4px rgba(194, 0, 18, 0.08)',
      transform: 'translateY(-1px)',
    },
  },
  typeCardActive: {
    borderTopColor: '#C20012', borderRightColor: '#C20012', borderBottomColor: '#C20012', borderLeftColor: '#C20012',
    backgroundColor: '#FDFAFA',
    boxShadow: '0 6px 16px -4px rgba(194, 0, 18, 0.18), inset 0 0 0 1px #C20012',
    ':hover': {
      borderTopColor: '#C20012', borderRightColor: '#C20012', borderBottomColor: '#C20012', borderLeftColor: '#C20012',
      boxShadow: '0 8px 20px -4px rgba(194, 0, 18, 0.22), inset 0 0 0 1px #C20012',
    },
  },
  typeIconBubble: {
    width: '34px',
    height: '34px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF9F6',
    color: '#404040',
    border: '1px solid #ECEAE4',
    marginBottom: '4px',
  },
  typeIconActive: {
    backgroundColor: '#FDF0F1',
    color: '#C20012',
    borderTopColor: '#FDE0E3', borderRightColor: '#FDE0E3', borderBottomColor: '#FDE0E3', borderLeftColor: '#FDE0E3',
  },
  typeTitle: {
    fontSize: '13.5px',
    fontWeight: 700,
    color: '#1A1A1A',
    letterSpacing: '-0.01em',
  },
  typeDescription: {
    fontSize: '11.5px',
    color: '#525252',
    lineHeight: 1.5,
  },
  typeValidity: {
    marginTop: '6px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '3px 8px',
    fontSize: '10.5px',
    fontWeight: 600,
    color: '#854020',
    backgroundColor: '#FDF6E3',
    border: '1px solid #FAEDC5',
    borderRadius: '999px',
    width: 'fit-content',
  },
  selectedRing: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    backgroundColor: '#C20012',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontWeight: 700,
    boxShadow: '0 0 0 2px #FFFFFF, 0 1px 3px rgba(194, 0, 18, 0.3)',
  },

  /* Document checklist */
  docList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #F4F2EC',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  docRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    fontSize: '13px',
    color: '#1A1A1A',
    borderBottom: '1px solid #F4F2EC',
    transition: 'background-color 160ms',
    ':last-child': { borderBottom: 'none' },
    ':hover': { backgroundColor: '#FAF9F6' },
  },
  docName: { flex: 1, minWidth: 0, fontWeight: 500 },
  docHint: { fontSize: '11.5px', color: '#737373', fontWeight: 400 },
  docTag: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    borderRadius: '999px',
    border: '1px solid transparent',
  },
  docTagMandatory: {
    backgroundColor: '#FDF0F1',
    color: '#8C040D',
    borderTopColor: '#FDE0E3', borderRightColor: '#FDE0E3', borderBottomColor: '#FDE0E3', borderLeftColor: '#FDE0E3',
  },
  docTagOptional: {
    backgroundColor: '#F4F2EC',
    color: '#525252',
    borderTopColor: '#ECEAE4', borderRightColor: '#ECEAE4', borderBottomColor: '#ECEAE4', borderLeftColor: '#ECEAE4',
  },
  docViewLink: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#C20012',
    cursor: 'pointer',
    background: 'transparent',
    border: 'none',
    padding: '4px 8px',
    borderRadius: '6px',
    transition: 'background-color 160ms',
    ':hover': { backgroundColor: '#FDF0F1' },
  },

  /* Stats grid in drawer */
  riskGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
  },
  riskCell: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #F4F2EC',
    borderRadius: '10px',
    padding: '12px 14px',
  },
  riskLabel: {
    fontSize: '10.5px',
    fontWeight: 700,
    color: '#A3A3A3',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '6px',
  },

  /* Complement modal */
  complementDocList: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #ECEAE4',
    borderRadius: '10px',
    maxHeight: '240px',
    overflowY: 'auto',
  },
  complementDocRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    fontSize: '13px',
    color: '#1A1A1A',
    borderBottom: '1px solid #F4F2EC',
    cursor: 'pointer',
    transition: 'background-color 160ms',
    ':last-child': { borderBottom: 'none' },
    ':hover': { backgroundColor: '#FAF9F6' },
  },

  helperBanner: {
    display: 'flex',
    gap: '12px',
    padding: '14px 16px',
    backgroundColor: '#FAF9F6',
    border: '1px solid #ECEAE4',
    borderRadius: '10px',
    fontSize: '12.5px',
    color: '#525252',
    lineHeight: 1.55,
  },
});

/* =====================================================================
   Constantes
   ===================================================================== */

const STATUT_OPTIONS = [
  { label: 'Tous statuts', value: '' },
  { label: 'En revue', value: 'En revue' },
  { label: 'Validé', value: 'Validé' },
  { label: 'Brouillon', value: 'Brouillon' },
  { label: 'Expiré', value: 'Expiré' },
  { label: 'Rejeté', value: 'Rejeté' },
];

const RISQUE_OPTIONS = [
  { label: 'Tous risques', value: '' },
  { label: 'Low', value: 'Low' },
  { label: 'Medium', value: 'Medium' },
  { label: 'High', value: 'High' },
];

const DIRECTION_OPTIONS = [
  { label: 'Toutes directions', value: '' },
  { label: 'DCONF', value: 'DCONF' },
  { label: 'DMG', value: 'DMG' },
  { label: 'TRESO', value: 'TRESO' },
  { label: 'COMEX', value: 'COMEX' },
];

const ENTITY_TYPES: Array<{ key: EntityType; icon: React.ReactNode }> = [
  { key: 'correspondant', icon: <Building20Regular /> },
  { key: 'partenaire', icon: <Handshake20Regular /> },
  { key: 'fournisseur', icon: <VehicleTruck20Regular /> },
  { key: 'intragroupe', icon: <PeopleTeam20Regular /> },
];

function getInitials(name: string) {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function inferEntityType(d: Dossier): EntityType {
  if (d.type === 'Fournisseur') return 'fournisseur';
  if (d.type === 'Partenaire') return 'partenaire';
  return 'partenaire';
}

/* =====================================================================
   Page
   ===================================================================== */

export default function DossiersValidation() {
  const styles = useStyles();
  const { notifySuccess, notifyInfo, notifyError } = useNotifications();

  // Données réelles depuis Dataverse (table afb_dossierkypkys).
  const { data: rawDossiers, isLoading, error } = dossiersKypKys.useList({ top: 200 });
  // Tiers chargés pour enrichir les dossiers (pays, risque, chargé, type) via le lookup.
  const { data: rawTiersForMap } = tiersHooks.useList({ top: 500 });
  const tiersByGuid = useMemo(
    () => new Map((rawTiersForMap ?? []).map((t) => [t.afb_tiersid, t])),
    [rawTiersForMap],
  );
  const dossiers = useMemo(
    () => (rawDossiers ?? []).map((d) => toDossier(d, tiersByGuid)),
    [rawDossiers, tiersByGuid],
  );
  const updateDossier = dossiersKypKys.useUpdate();
  // Résout le GUID Dataverse à partir de l'id affiché (référence du dossier).
  const guidByRef = useMemo(
    () =>
      new Map(
        (rawDossiers ?? []).map((d) => [d.afb_referencedudossier ?? d.afb_dossierkypkysid, d.afb_dossierkypkysid]),
      ),
    [rawDossiers],
  );

  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [risqueFilter, setRisqueFilter] = useState('');
  const [directionFilter, setDirectionFilter] = useState('');

  /* Drawer & dialogs */
  const [openDossier, setOpenDossier] = useState<Dossier | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [complementOpen, setComplementOpen] = useState(false);
  const [validateAction, setValidateAction] = useState<{ dossier: Dossier; intent: 'validate' | 'reject' } | null>(
    null,
  );

  const filtered = useMemo(() => {
    return dossiers.filter((d) => {
      if (statutFilter && d.statut !== statutFilter) return false;
      if (risqueFilter && d.risque !== risqueFilter) return false;
      if (directionFilter && d.direction !== directionFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!d.entite.toLowerCase().includes(q) && !d.id.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [dossiers, search, statutFilter, risqueFilter, directionFilter]);

  const queue = [
    {
      label: 'En attente de revue',
      count: dossiers.filter((d) => d.statut === 'En revue').length,
      color: '#B45309',
      meta: 'priorité hiérarchique',
      icon: <ClipboardTaskListLtr20Regular />,
    },
    {
      label: 'Critiques (J-1 / Dépassé)',
      count: dossiers.filter((d) => d.sla === 'J-1' || d.sla === 'Dépassé').length,
      color: '#C20012',
      meta: 'escalade automatique',
      icon: <Flash20Regular />,
    },
    {
      label: 'Risque élevé',
      count: dossiers.filter((d) => d.risque === 'High').length,
      color: '#8C040D',
      meta: 'double validation',
      icon: <ShieldCheckmark20Regular />,
    },
    {
      label: 'Validés ce mois',
      count: dossiers.filter((d) => d.statut === 'Validé').length,
      color: '#15803D',
      meta: 'archivés',
      icon: <CheckmarkCircle20Filled />,
    },
  ];

  const columns: Column<Dossier>[] = [
    {
      key: 'entite',
      header: 'Entité',
      render: (d) => (
        <div className={styles.entityCell}>
          <div className={styles.avatar}>{getInitials(d.entite)}</div>
          <div className={styles.entityMeta}>
            <span className={styles.entityName}>{d.entite}</span>
            <span className={styles.entityCode}>{d.id}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (d) => (
        <Badge appearance="tint" color="subtle" size="small">
          {d.type}
        </Badge>
      ),
    },
    { key: 'pays', header: 'Pays', render: (d) => d.pays ?? '—' },
    { key: 'risque', header: 'Risque', render: (d) => <RisqueBadge risque={d.risque} /> },
    { key: 'statut', header: 'Statut', render: (d) => <StatutBadge statut={d.statut} /> },
    { key: 'sla', header: 'SLA', render: (d) => <SLABadge value={d.sla} /> },
    { key: 'charge', header: 'Chargé', render: (d) => d.charge ?? '—' },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (d) => (
        <div
          className={styles.rowActions}
          onClick={(e) => e.stopPropagation()}
        >
          <Tooltip content="Ouvrir le dossier" relationship="label">
            <Button
              size="small"
              appearance="subtle"
              icon={<Eye20Regular />}
              onClick={() => setOpenDossier(d)}
              aria-label="Voir"
            />
          </Tooltip>
          <Tooltip content="Valider" relationship="label">
            <Button
              size="small"
              appearance="subtle"
              icon={<CheckmarkCircle20Regular style={{ color: '#15803D' }} />}
              onClick={() => setValidateAction({ dossier: d, intent: 'validate' })}
              aria-label="Valider"
            />
          </Tooltip>
          <Tooltip content="Rejeter" relationship="label">
            <Button
              size="small"
              appearance="subtle"
              icon={<DismissCircle20Regular style={{ color: '#C20012' }} />}
              onClick={() => setValidateAction({ dossier: d, intent: 'reject' })}
              aria-label="Rejeter"
            />
          </Tooltip>
        </div>
      ),
    },
  ];

  const exportDossiers = async () => {
    const ok = exportToCsv(
      `dossiers-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map((d) => ({
        Référence: d.id,
        Entité: d.entite,
        Type: d.type,
        Risque: d.risque,
        Statut: d.statut,
        SLA: d.sla,
        Direction: d.direction,
        Date: d.dateCreation,
        Chargé: d.charge ?? '',
      })),
    );
    notifySuccess(ok ? 'Export généré' : 'Aucune donnée', {
      description: ok ? `${filtered.length} dossiers exportés (CSV).` : 'Aucun dossier à exporter.',
    });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Pilotage · Conformité"
        title="Validation des dossiers"
        subtitle="File de travail priorisée — dossiers en attente de validation hiérarchique. Standard, Élevé et Critique."
        actions={
          <>
            <Button icon={<ArrowDownload20Regular />} appearance="outline" onClick={exportDossiers}>
              Export
            </Button>
            <Button icon={<Add20Regular />} appearance="primary" onClick={() => setNewOpen(true)}>
              Nouveau dossier
            </Button>
          </>
        }
      />

      <div className={styles.queueRow}>
        {queue.map((q) => (
          <div key={q.label} className={styles.queueCard} style={{ color: q.color }}>
            <div className={styles.queueBubble} style={{ color: q.color }}>
              {q.icon}
            </div>
            <div className={styles.queueLabel}>{q.label}</div>
            <div className={styles.queueValue} style={{ color: q.color }}>
              {q.count}
            </div>
            <div className={styles.queueMeta}>{q.meta}</div>
          </div>
        ))}
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher un dossier, une entité…"
        filters={[
          { key: 'statut', label: 'Statut', value: statutFilter, options: STATUT_OPTIONS, onChange: setStatutFilter },
          { key: 'risque', label: 'Risque', value: risqueFilter, options: RISQUE_OPTIONS, onChange: setRisqueFilter },
          {
            key: 'direction',
            label: 'Direction',
            value: directionFilter,
            options: DIRECTION_OPTIONS,
            onChange: setDirectionFilter,
          },
        ]}
      />

      <Card
        flush
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <ClipboardTaskListLtr20Regular style={{ color: '#737373' }} /> Dossiers à traiter
          </span>
        }
        subtitle={`${filtered.length} dossiers — triés par priorité SLA`}
      >
        {error ? (
          <div style={{ padding: '24px', color: '#C20012', fontSize: '13px' }}>
            Erreur de chargement depuis Dataverse : {error.message}
          </div>
        ) : isLoading ? (
          <div style={{ padding: '24px', color: '#767676', fontSize: '13px' }}>Chargement des dossiers…</div>
        ) : (
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(d) => d.id}
            emptyMessage="Aucun dossier ne correspond aux filtres."
            onRowClick={(d) => setOpenDossier(d)}
          />
        )}
      </Card>

      {/* ===== Drawer dossier ===== */}
      <DossierDrawer
        dossier={openDossier}
        onClose={() => setOpenDossier(null)}
        onAskComplement={() => setComplementOpen(true)}
        onValidate={() =>
          openDossier && setValidateAction({ dossier: openDossier, intent: 'validate' })
        }
        onReject={() =>
          openDossier && setValidateAction({ dossier: openDossier, intent: 'reject' })
        }
      />

      {/* ===== Nouveau dossier ===== */}
      <NewDossierDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={(label, ref, email) => {
          notifySuccess('Dossier créé', {
            description: `${ref} · ${label} — invitation envoyée à ${email}.`,
          });
        }}
      />

      {/* ===== Complément ===== */}
      {openDossier && (
        <ComplementDialog
          open={complementOpen}
          onOpenChange={setComplementOpen}
          dossier={openDossier}
          onSent={async (email, count, deadline) => {
            const guid = openDossier ? guidByRef.get(openDossier.id) : undefined;
            if (guid) {
              try {
                await updateDossier.mutateAsync({
                  id: guid,
                  changes: {
                    afb_statutdudossier: STATUT_DOSSIER_TO_DV.completer,
                    ...(deadline ? { afb_prochainecheancier: new Date(deadline).toISOString() } : {}),
                  },
                });
              } catch (e) {
                notifyError('Échec de la mise à jour', {
                  description: e instanceof Error ? e.message : 'Erreur Dataverse.',
                });
                return;
              }
            }
            notifySuccess('Demande envoyée', {
              description: `${count} élément(s) attendu(s) · ${email}${
                deadline ? ` · échéance ${deadline}` : ''
              }`,
            });
          }}
        />
      )}

      {/* ===== Valider / Rejeter ===== */}
      <ConfirmActionDialog
        open={!!validateAction}
        onOpenChange={(o) => !o && setValidateAction(null)}
        intent={validateAction?.intent === 'reject' ? 'reject' : 'validate'}
        entityRef={validateAction?.dossier.id}
        title={
          validateAction?.intent === 'reject'
            ? 'Rejeter ce dossier ?'
            : 'Valider ce dossier ?'
        }
        description={
          validateAction
            ? validateAction.intent === 'reject'
              ? `Le dossier de ${validateAction.dossier.entite} sera renvoyé à l'émetteur. Le motif sera consigné dans le journal COBAC.`
              : `Le dossier de ${validateAction.dossier.entite} sera archivé et la fiche partenaire activée. Une trace est conservée pendant 10 ans (Art. 38).`
            : ''
        }
        onConfirm={async (motif) => {
          if (validateAction) {
            const guid = guidByRef.get(validateAction.dossier.id);
            if (!guid) {
              notifyError('Action impossible', { description: 'Dossier introuvable dans Dataverse.' });
              throw new Error('GUID introuvable');
            }
            try {
              if (validateAction.intent === 'reject') {
                await updateDossier.mutateAsync({
                  id: guid,
                  changes: {
                    afb_statutdudossier: STATUT_DOSSIER_TO_DV.rejeter,
                    ...(motif ? { afb_commentairedconf: motif } : {}),
                  },
                });
                notifyInfo('Dossier rejeté', { description: `${validateAction.dossier.entite} · motif consigné.` });
              } else {
                await updateDossier.mutateAsync({
                  id: guid,
                  changes: {
                    afb_statutdudossier: STATUT_DOSSIER_TO_DV.valider,
                    afb_datededernierevalidation: new Date().toISOString(),
                  },
                });
                notifySuccess('Dossier validé', {
                  description: `${validateAction.dossier.entite} archivé${motif ? ' avec commentaire' : ''}.`,
                });
              }
            } catch (e) {
              notifyError('Échec de la mise à jour', {
                description: e instanceof Error ? e.message : 'Erreur Dataverse.',
              });
              throw e;
            }
            setOpenDossier(null);
          }
        }}
      />
    </div>
  );
}

/* =====================================================================
   Drawer dossier
   ===================================================================== */

function DossierDrawer({
  dossier,
  onClose,
  onAskComplement,
  onValidate,
  onReject,
}: {
  dossier: Dossier | null;
  onClose: () => void;
  onAskComplement: () => void;
  onValidate: () => void;
  onReject: () => void;
}) {
  const styles = useStyles();
  if (!dossier) return null;

  const entityType = inferEntityType(dossier);
  const docs = requiredDocsByType[entityType];

  const badges: DrawerStatusBadge[] = [
    {
      label: dossier.statut,
      color:
        dossier.statut === 'Validé'
          ? 'success'
          : dossier.statut === 'Expiré' || dossier.statut === 'Rejeté'
          ? 'danger'
          : dossier.statut === 'En revue'
          ? 'warning'
          : 'subtle',
      appearance: 'tint',
    },
    {
      label: `Risque ${dossier.risque}`,
      color: dossier.risque === 'High' ? 'danger' : dossier.risque === 'Medium' ? 'warning' : 'subtle',
      appearance: 'tint',
    },
    { label: dossier.type, color: 'brand', appearance: 'tint' },
    { label: dossier.direction, color: 'informative', appearance: 'tint' },
  ];

  const docsContent = (
    <>
      <DrawerSection
        title="Identification"
        description={`${entityTypeLabels[entityType]} — règle de validité par défaut ${entityTypeValidityMonths[entityType]} mois.`}
      >
        <FieldGrid
          items={[
            { label: 'Référence', value: dossier.id, mono: true },
            { label: 'Responsable', value: dossier.charge ?? '—' },
            { label: 'Direction porteuse', value: dossier.direction },
            { label: 'Pays', value: dossier.pays ?? '—' },
            { label: 'Date de création', value: dossier.dateCreation },
            { label: 'SLA', value: <SLABadge value={dossier.sla} /> },
          ]}
        />
      </DrawerSection>

      <DrawerSection title="Profil de risque composite">
        <div className={styles.riskGrid}>
          <div className={styles.riskCell}>
            <div className={styles.riskLabel}>KYC / AML</div>
            <RisqueBadge risque={dossier.risque} />
          </div>
          <div className={styles.riskCell}>
            <div className={styles.riskLabel}>Éthique</div>
            <RisqueBadge risque={entityType === 'intragroupe' ? 'High' : 'Low'} />
          </div>
          <div className={styles.riskCell}>
            <div className={styles.riskLabel}>Fiscal</div>
            <RisqueBadge risque={entityType === 'intragroupe' ? 'High' : 'Low'} />
          </div>
        </div>
      </DrawerSection>

      <DrawerSection
        title={`Documents requis · ${entityTypeLabels[entityType]}`}
        description="Les pièces obligatoires sont marquées. Chaque document accepté est versionné dans le coffre numérique."
      >
        <div className={styles.docList}>
          {docs.map((d, i) => {
            const status = i % 3 === 0 ? 'missing' : i % 3 === 1 ? 'review' : 'ok';
            return (
              <div key={d.key} className={styles.docRow}>
                {status === 'ok' && <CheckmarkCircle16Filled style={{ color: '#15803D', flexShrink: 0 }} />}
                {status === 'review' && <Clock16Filled style={{ color: '#B45309', flexShrink: 0 }} />}
                {status === 'missing' && <ErrorCircle16Filled style={{ color: '#C20012', flexShrink: 0 }} />}
                <div className={styles.docName}>
                  {d.name}
                  {d.hint && <span className={styles.docHint}> · {d.hint}</span>}
                </div>
                <span
                  className={mergeClasses(styles.docTag, d.mandatory ? styles.docTagMandatory : styles.docTagOptional)}
                >
                  {d.mandatory ? 'Obligatoire' : 'Optionnel'}
                </span>
                <button className={styles.docViewLink} type="button">
                  Voir
                </button>
              </div>
            );
          })}
        </div>
      </DrawerSection>
    </>
  );

  const auditContent = (
    <DrawerSection
      title="Journal de traçabilité"
      description="Trace non modifiable — Art. 38 COBAC. Conservée 10 ans."
    >
      <DrawerTimeline
        events={[
          {
            when: '08/05/2026 · 10:42',
            title: 'Création du dossier',
            author: 'J. Mbarga',
            description: 'Initialisation depuis la file Dataverse — invitation OTP envoyée au tiers.',
          },
          {
            when: '08/05/2026 · 11:05',
            title: 'Ajout document RCCM',
            author: 'M. Eboa (DMG)',
            description: 'Validation automatique de la signature — pièce certifiée.',
          },
          {
            when: '08/05/2026 · 14:18',
            title: 'Modification du score de risque',
            author: 'M. Eboa',
            description: 'Risque Low → Medium · escalade hiérarchique programmée.',
          },
          {
            when: '08/05/2026 · 15:30',
            title: 'Screening PPE / Sanctions',
            author: 'Système',
            description: 'Aucun match — sources ONU / OFAC / UE / PPE.',
          },
          {
            when: '08/05/2026 · 16:02',
            title: 'Demande de complément envoyée',
            author: 'S. Nkoa',
            description: 'Wolfsberg & Patriot Act — échéance 15/05/2026.',
          },
        ]}
      />
    </DrawerSection>
  );

  return (
    <DetailDrawer
      open={!!dossier}
      onClose={onClose}
      eyebrow={`${entityTypeLabels[entityType]}`}
      title={dossier.entite}
      subtitle={`${dossier.id} · validité par défaut ${entityTypeValidityMonths[entityType]} mois`}
      size="large"
      statusBadges={badges}
      tabs={[
        { key: 'docs', label: 'Documents', count: docs.length, content: docsContent },
        { key: 'audit', label: 'Journal de traçabilité', content: auditContent },
      ]}
      footer={
        <>
          <Button appearance="outline" icon={<Mail20Regular />} onClick={onAskComplement}>
            Demander complément
          </Button>
          <Button
            appearance="primary"
            icon={<DismissCircle20Regular />}
            onClick={onReject}
            style={{ backgroundColor: '#C20012', borderTopColor: '#C20012', borderRightColor: '#C20012', borderBottomColor: '#C20012', borderLeftColor: '#C20012'}}
          >
            Rejeter
          </Button>
          <Button appearance="primary" icon={<CheckmarkCircle20Regular />} onClick={onValidate}>
            Valider
          </Button>
        </>
      }
    />
  );
}

/* =====================================================================
   Nouveau dossier
   ===================================================================== */

function NewDossierDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (label: string, ref: string, email: string) => void;
}) {
  const styles = useStyles();
  const { notifyError } = useNotifications();
  const createDossier = dossiersKypKys.useCreate();
  const createTiers = tiersHooks.useCreate();
  const { data: ptData } = partnerTypes.useList({ top: 200 });
  const { data: userData } = utilisateursInternes.useList({ top: 200 });
  const [type, setType] = useState<EntityType | null>(null);
  const [nom, setNom] = useState('');
  const [contact, setContact] = useState('');
  const [pays, setPays] = useState('Cameroun');
  const [chargeId, setChargeId] = useState('');
  const [email, setEmail] = useState('');

  const reset = () => {
    setType(null);
    setNom('');
    setContact('');
    setPays('Cameroun');
    setChargeId('');
    setEmail('');
  };

  const valid =
    !!type &&
    nom.trim().length >= 3 &&
    pays.trim().length > 0 &&
    chargeId !== '' &&
    /^\S+@\S+\.\S+$/.test(email);

  /** Trouve un type juridique adapté au type d'entité choisi. */
  const pickPartnerTypeGuid = (kind: EntityType): string | undefined => {
    const list = ptData ?? [];
    // Famille Dataverse afb_familledinstitution : 747010000=BC, 747010003=Société commerciale, 747010002=Entreprise individuelle, etc.
    const wantedFamille =
      kind === 'correspondant' ? 747010000
      : kind === 'fournisseur' ? 747010002
      : kind === 'intragroupe' ? undefined
      : 747010003; // partenaire par défaut
    if (wantedFamille != null) {
      const match = list.find((p) => p.afb_familledinstitution === wantedFamille);
      if (match) return match.afb_partnertypeid;
    }
    // Fallback : premier type disponible.
    return list[0]?.afb_partnertypeid;
  };

  const submit = async () => {
    if (!type) return;
    const prefix =
      type === 'correspondant' ? 'KYC-B'
      : type === 'partenaire' ? 'KYP'
      : type === 'fournisseur' ? 'KYS'
      : 'KYI';
    const ref = `${prefix}-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const ptGuid = pickPartnerTypeGuid(type);
    if (!ptGuid) {
      notifyError('Création impossible', {
        description: "Aucun type de partenaire n'est disponible — créez-en un au moins dans Administration → Types de partenaires.",
      });
      throw new Error('partnertype manquant');
    }
    try {
      // 1) Création du tiers porteur de l'identité.
      const newTiers = await createTiers.mutateAsync({
        afb_nomdupartenaire: nom.trim(),
        afb_pays: pays.trim(),
        afb_directionporteuse: 1, // DCONF par défaut
        afb_niveauderisque: 2, // Standard par défaut (peut être affiné ultérieurement)
        afb_statutdutiers: 0, // Partenaireactif
        afb_datedecreationsysteme: new Date().toISOString(),
        ...(email ? { afb_emailcontactprincipal: email } : {}),
        'afb_typejuridique@odata.bind': `/afb_partnertypes(${ptGuid})`,
        'afb_chargederelation@odata.bind': `/afb_utilisateurinternes(${chargeId})`,
      } as unknown as Parameters<typeof createTiers.mutateAsync>[0]);

      // 2) Création du dossier rattaché à ce tiers.
      await createDossier.mutateAsync({
        afb_referencedudossier: ref,
        afb_statutdudossier: 1, // En revue → visible dans la file de validation
        afb_tauxdecompletude: 0,
        afb_versiondudossier: 1,
        afb_datedesoumission: new Date().toISOString(),
        'afb_nomdutiers@odata.bind': `/afb_tierses(${newTiers.afb_tiersid})`,
      } as unknown as Parameters<typeof createDossier.mutateAsync>[0]);

      onCreated(entityTypeLabels[type], ref, email);
      reset();
    } catch (e) {
      notifyError('Création impossible', {
        description: e instanceof Error ? e.message : 'Erreur Dataverse.',
      });
      throw e;
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
      eyebrow="Nouveau dossier de conformité"
      title="Sélectionnez la cible"
      subtitle="Les documents requis et la durée de validité par défaut s'adaptent automatiquement au type d'entité."
      size="large"
      submitLabel="Créer & envoyer l'invitation"
      submitDisabled={!valid}
      onSubmit={submit}
    >
      <FormSection title="Type de cible" description="Choisissez la catégorie qui correspond à votre tiers — chaque type embarque sa propre checklist KYC.">
        <div className={styles.typeGrid}>
          {ENTITY_TYPES.map(({ key, icon }) => {
            const active = type === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setType(key)}
                className={mergeClasses(styles.typeCard, active && styles.typeCardActive)}
              >
                {active && (
                  <span className={styles.selectedRing} aria-hidden="true">
                    <CheckmarkCircle16Filled />
                  </span>
                )}
                <div className={mergeClasses(styles.typeIconBubble, active && styles.typeIconActive)}>
                  {icon}
                </div>
                <span className={styles.typeTitle}>{entityTypeLabels[key]}</span>
                <span className={styles.typeDescription}>{entityTypeDescriptions[key]}</span>
                <span className={styles.typeValidity}>
                  <Calendar20Regular style={{ width: 12, height: 12 }} />
                  Validité {entityTypeValidityMonths[key]} mois
                </span>
              </button>
            );
          })}
        </div>
      </FormSection>

      <FormSection title="Identité du tiers" description="Renseignez la raison sociale, le pays et le contact principal qui recevra l'invitation sécurisée.">
        <FieldRow cols={2}>
          <Field label="Raison sociale" required>
            <Input value={nom} onChange={(_, d) => setNom(d.value)} placeholder="Ex. SOCAPALM SA" />
          </Field>
          <Field label="Nom du contact">
            <Input value={contact} onChange={(_, d) => setContact(d.value)} placeholder="Ex. M. Eboa" />
          </Field>
        </FieldRow>
        <FieldRow cols={2}>
          <Field label="Pays" required>
            <Dropdown
              value={pays}
              selectedOptions={[pays]}
              onOptionSelect={(_, d) => d.optionValue && setPays(d.optionValue)}
            >
              <Option value="Cameroun">Cameroun</Option>
              <Option value="Congo">Congo</Option>
              <Option value="Gabon">Gabon</Option>
              <Option value="Tchad">Tchad</Option>
              <Option value="Sénégal">Sénégal</Option>
              <Option value="Côte d'Ivoire">Côte d'Ivoire</Option>
              <Option value="France">France</Option>
              <Option value="Royaume-Uni">Royaume-Uni</Option>
              <Option value="États-Unis">États-Unis</Option>
              <Option value="Émirats arabes unis">Émirats arabes unis</Option>
            </Dropdown>
          </Field>
          <Field label="Chargé de relation" required hint="Utilisateur interne responsable du tiers.">
            <Dropdown
              placeholder="Sélectionner un chargé"
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
        <Field label="Email du destinataire" required hint="Le tiers recevra le lien d'onboarding sur cette adresse (validité 72 h).">
          <Input
            type="email"
            value={email}
            onChange={(_, d) => setEmail(d.value)}
            placeholder="contact@entreprise.com"
            contentBefore={<Mail20Regular style={{ color: '#737373' }} />}
          />
        </Field>
      </FormSection>

      {type && (
        <FormSection
          title={`Documents requis · ${entityTypeLabels[type]}`}
          description={`La date de validité de chaque pièce sera demandée au téléversement (règle ${entityTypeValidityMonths[type]} mois).`}
        >
          <div className={styles.docList}>
            {requiredDocsByType[type].map((d) => (
              <div key={d.key} className={styles.docRow}>
                <DocumentText20Regular style={{ color: '#737373', flexShrink: 0 }} />
                <div className={styles.docName}>
                  {d.name}
                  {d.hint && <span className={styles.docHint}> · {d.hint}</span>}
                </div>
                <span
                  className={mergeClasses(styles.docTag, d.mandatory ? styles.docTagMandatory : styles.docTagOptional)}
                >
                  {d.mandatory ? 'Obligatoire' : 'Optionnel'}
                </span>
              </div>
            ))}
          </div>
        </FormSection>
      )}
    </FormDialog>
  );
}

/* =====================================================================
   Demande de complément
   ===================================================================== */

function ComplementDialog({
  open,
  onOpenChange,
  dossier,
  onSent,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  dossier: Dossier;
  onSent: (email: string, count: number, deadline: string) => void;
}) {
  const styles = useStyles();
  const entityType = inferEntityType(dossier);
  const docs = requiredDocsByType[entityType];

  const [email, setEmail] = useState('compliance@citi.com');
  const [deadline, setDeadline] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState(
    `Bonjour,\n\nDans le cadre de l'instruction du dossier ${dossier.id} (${dossier.entite}), nous vous invitons à compléter les éléments manquants ci-dessous.\n\nCordialement,\nDirection de la Conformité — Afriland First Bank`,
  );

  const reset = () => {
    setEmail('compliance@citi.com');
    setDeadline('');
    setSelected([]);
  };

  const toggle = (k: string) =>
    setSelected((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  const valid = /^\S+@\S+\.\S+$/.test(email) && selected.length > 0;

  const submit = async () => {
    await new Promise((r) => setTimeout(r, 500));
    onSent(email, selected.length, deadline);
    reset();
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
      eyebrow="Demande de complément d'informations"
      title={dossier.entite}
      subtitle={`${dossier.id} · ${entityTypeLabels[entityType]}`}
      size="large"
      submitLabel="Envoyer la demande"
      submitDisabled={!valid}
      onSubmit={submit}
    >
      <FormSection
        title="Destinataire & échéance"
        description="L'invitation est envoyée par e-mail. Le tiers accède à l'espace dédié via un lien sécurisé."
      >
        <FieldRow cols={2}>
          <Field label="Email du destinataire" required>
            <Input
              type="email"
              value={email}
              onChange={(_, d) => setEmail(d.value)}
              placeholder="contact@entreprise.com"
              contentBefore={<Mail20Regular style={{ color: '#737373' }} />}
            />
          </Field>
          <Field label="Échéance souhaitée">
            <Input
              type="date"
              value={deadline}
              onChange={(_, d) => setDeadline(d.value)}
              contentBefore={<Calendar20Regular style={{ color: '#737373' }} />}
            />
          </Field>
        </FieldRow>
      </FormSection>

      <FormSection
        title="Éléments à compléter"
        description={`${selected.length} sélectionné(s) sur ${docs.length} pièces requises.`}
      >
        <div className={styles.complementDocList}>
          {docs.map((d) => {
            const checked = selected.includes(d.key);
            return (
              <label key={d.key} className={styles.complementDocRow} onClick={() => toggle(d.key)}>
                <Checkbox checked={checked} onChange={() => toggle(d.key)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500 }}>{d.name}</div>
                  {d.hint && <div className={styles.docHint}>{d.hint}</div>}
                </div>
                <span
                  className={mergeClasses(styles.docTag, d.mandatory ? styles.docTagMandatory : styles.docTagOptional)}
                >
                  {d.mandatory ? 'Obligatoire' : 'Optionnel'}
                </span>
              </label>
            );
          })}
        </div>
      </FormSection>

      <FormSection title="Message au destinataire" description="Personnalisez le texte d'accompagnement — la signature DCONF est ajoutée automatiquement.">
        <Field label="Message">
          <Textarea
            value={message}
            onChange={(_, d) => setMessage(d.value)}
            rows={5}
            resize="vertical"
          />
        </Field>
        <div className={styles.helperBanner} style={{ marginTop: '12px' }}>
          <CheckmarkCircle20Filled style={{ color: '#C20012', flexShrink: 0, marginTop: '1px' }} />
          <span>
            Le destinataire reçoit un lien sécurisé pour déposer les pièces demandées. Vous serez notifié à chaque
            téléversement et pourrez relancer manuellement avant l'échéance.
          </span>
        </div>
      </FormSection>
    </FormDialog>
  );
}
