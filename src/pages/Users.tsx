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
  Switch,
} from '@fluentui/react-components';
import {
  Add20Regular,
  ArrowDownload20Regular,
  Edit20Regular,
  Person20Regular,
  Eye20Regular,
  ShieldKeyhole20Regular,
} from '@fluentui/react-icons';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';
import { FilterBar } from '@/components/common/FilterBar';
import { DataTable, type Column } from '@/components/common/DataTable';
import { type Utilisateur } from '@/lib/mockData';
import { utilisateursInternes, journalAudit } from '@/lib/dataverse/entityHooks';
import { toUtilisateur, DV_DIRECTION_CODE, DV_ROLE_CODE, DV_ACTIF_OUI, DV_ACTIF_NON } from '@/lib/dataverse/userMappers';
import { exportToCsv } from '@/lib/exportCsv';
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
  kpiValue: { fontSize: '28px', fontWeight: 700, color: '#1A1A1A', lineHeight: 1 },
  kpiMeta: { fontSize: '12px', color: '#767676', marginTop: '6px' },
  userCell: { display: 'flex', alignItems: 'center', gap: '12px' },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#FCE4E6',
    color: 'var(--accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 700,
    flexShrink: 0,
  },
  avatarLarge: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: '#FCE4E6',
    color: 'var(--accent)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    fontWeight: 700,
  },
  userMeta: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  userName: { fontSize: '13px', fontWeight: 600, color: '#1A1A1A' },
  userEmail: { fontSize: '11px', color: '#767676' },
  rowActions: { display: 'flex', gap: '4px', justifyContent: 'flex-end' },
  userHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    paddingBottom: '14px',
    borderBottom: '1px solid #F4F4F4',
    marginBottom: '14px',
  },
  perm: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    backgroundColor: '#FAFAFA',
    border: '1px solid #F4F4F4',
    borderRadius: '8px',
    marginBottom: '6px',
  },
  permName: { fontSize: '13px', fontWeight: 500, color: '#1A1A1A', flex: 1 },
});

const ROLE_OPTIONS = [
  { label: 'Tous rôles', value: '' },
  { label: 'Super Admin', value: 'Super Admin' },
  { label: 'Admin Direction', value: 'Admin Direction' },
  { label: 'Chargé KYC', value: 'Chargé KYC' },
  { label: 'Utilisateur AFB', value: 'Utilisateur AFB' },
  { label: 'Auditeur externe', value: 'Auditeur externe' },
];

const DIRECTION_OPTIONS = [
  { label: 'Toutes directions', value: '' },
  { label: 'DCONF', value: 'DCONF' },
  { label: 'DMG', value: 'DMG' },
  { label: 'TRESO', value: 'TRESO' },
  { label: 'COMEX', value: 'COMEX' },
];

const STATUT_OPTIONS = [
  { label: 'Tous statuts', value: '' },
  { label: 'Actif', value: 'Actif' },
  { label: 'Inactif', value: 'Inactif' },
  { label: 'Suspendu', value: 'Suspendu' },
];

// Correspondance des valeurs du formulaire vers les codes de choix Dataverse.
const DIR_FORM_TO_CODE: Record<string, number> = {
  DCONF: DV_DIRECTION_CODE.DCONF,
  DMG: DV_DIRECTION_CODE.DMG,
  TRESO: DV_DIRECTION_CODE.TRESO,
  COMEX: DV_DIRECTION_CODE.DCONF,
};
const ROLE_FORM_TO_CODE: Record<string, number> = {
  'Super Admin': DV_ROLE_CODE.SuperadminDCONF,
  // ⚠️ Ce libellé écrivait auparavant le code Super Admin, faute de valeur de
  // choix dédiée dans Dataverse. Créer un « Admin Direction » depuis l'interface
  // produisait donc un compte porteur de admin.full : une élévation de privilège
  // silencieuse, et le contraire du moindre privilège.
  // On écrit désormais le code correct. Tant que la valeur 747010005 n'est pas
  // créée dans la colonne afb_role, la création échoue visiblement — ce qui est
  // préférable à un compte trop puissant créé sans que personne ne le sache.
  'Admin Direction': DV_ROLE_CODE.AdminDirection,
  'Chargé KYC': DV_ROLE_CODE.ChargeConformite,
  'Utilisateur AFB': DV_ROLE_CODE.Auditeurinterne,
  'Auditeur externe': DV_ROLE_CODE.Auditeurexterne,
};

function roleColor(r: Utilisateur['role']) {
  if (r === 'Super Admin') return 'danger';
  if (r === 'Admin Direction') return 'severe';
  if (r === 'Chargé KYC') return 'important';
  if (r === 'Auditeur externe') return 'warning';
  return 'subtle';
}

function statutColor(s: Utilisateur['statut']) {
  if (s === 'Actif') return 'success';
  if (s === 'Suspendu') return 'danger';
  return 'subtle';
}

function initials(prenom: string, nom: string) {
  return `${prenom[0] ?? ''}${nom[0] ?? ''}`.toUpperCase();
}

const PERMISSIONS_BY_ROLE: Record<string, { name: string; granted: boolean }[]> = {
  'Super Admin': [
    { name: 'Lecture · tous les dossiers', granted: true },
    { name: 'Édition · tous les dossiers', granted: true },
    { name: 'Validation · tous niveaux (Standard, Élevé, Critique)', granted: true },
    { name: 'Administration · utilisateurs et rôles', granted: true },
    { name: 'Administration · configuration système', granted: true },
    { name: 'Export · données nominatives', granted: true },
    { name: 'Consultation · journaux d\'audit', granted: true },
  ],
  'Admin Direction': [
    { name: 'Lecture · dossiers de la direction', granted: true },
    { name: 'Édition · dossiers de la direction', granted: true },
    { name: 'Validation · Standard, Élevé', granted: true },
    { name: 'Validation · Critique', granted: false },
    { name: 'Administration · utilisateurs de la direction', granted: true },
    { name: 'Export · données nominatives', granted: true },
  ],
  'Chargé KYC': [
    { name: 'Création et édition · tiers', granted: true },
    { name: 'Instruction · dossiers, screening, UBO', granted: true },
    { name: 'Questionnaires · création et affectation', granted: true },
    // La validation est PROPOSÉE, jamais rendue effective : c'est la double
    // validation. Voir l'absence de 'dossiers.confirm' dans types/roles.ts.
    { name: 'Validation · proposition soumise à confirmation', granted: true },
    { name: 'Validation · confirmation effective', granted: false },
    { name: 'Export · données nominatives', granted: true },
  ],
  'Utilisateur AFB': [
    { name: 'Lecture · tableau de bord et dossiers', granted: true },
    { name: 'Lecture · screening et UBO', granted: true },
    { name: 'Édition', granted: false },
    { name: 'Export', granted: false },
  ],
  'Auditeur externe': [
    { name: 'Lecture · tableau de bord et dossiers', granted: true },
    { name: 'Lecture · screening et UBO', granted: true },
    { name: 'Édition', granted: false },
    { name: 'Export', granted: false },
  ],
};

export default function Users() {
  const styles = useStyles();
  const { t } = useT();
  const { notifySuccess, notifyInfo, notifyWarning } = useNotifications();

  // Données réelles depuis Dataverse (table afb_utilisateurinterne).
  const { data: rawUsers, isLoading, error } = utilisateursInternes.useList({ top: 200 });
  // Journal d'audit : source des stats par utilisateur (auteur = afb_utilisateurinterne).
  const { data: rawAudit } = journalAudit.useList({ top: 2000 });
  const createUser = utilisateursInternes.useCreate();
  const updateUser = utilisateursInternes.useUpdate();

  // Statistiques dérivées du journal d'audit, indexées par GUID d'utilisateur :
  //  - dossiers traités  = nb de dossiers distincts validés ou rejetés par l'utilisateur.
  //  - dernière connexion = horodatage le plus récent d'une action « Connexion ».
  const statsByUser = useMemo(() => {
    const ACTION_VALIDATION = 747010004;
    const ACTION_REJET = 747010002;
    const ACTION_CONNEXION = 3;
    const map = new Map<string, { dossiers: Set<string>; lastLogin: string }>();
    for (const l of rawAudit ?? []) {
      const uid = l._afb_auteurdelamodification_value;
      if (!uid) continue;
      let s = map.get(uid);
      if (!s) {
        s = { dossiers: new Set<string>(), lastLogin: '' };
        map.set(uid, s);
      }
      const action = l.afb_typedaction as number;
      if ((action === ACTION_VALIDATION || action === ACTION_REJET) && l.afb_guiddelenregistrement) {
        s.dossiers.add(l.afb_guiddelenregistrement);
      }
      if (action === ACTION_CONNEXION && l.afb_horodatage && l.afb_horodatage > s.lastLogin) {
        s.lastLogin = l.afb_horodatage;
      }
    }
    return map;
  }, [rawAudit]);

  const users = useMemo(
    () =>
      (rawUsers ?? []).map((u) => {
        const base = toUtilisateur(u);
        const s = statsByUser.get(base.id);
        if (!s) return base;
        return {
          ...base,
          // On complète depuis l'audit ; on garde la valeur du mapper en repli.
          dossiersTraites: s.dossiers.size > 0 ? s.dossiers.size : base.dossiersTraites,
          derniereConnexion: s.lastLogin
            ? new Date(s.lastLogin).toLocaleString('fr-FR')
            : base.derniereConnexion,
        };
      }),
    [rawUsers, statsByUser],
  );

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [directionFilter, setDirectionFilter] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [openUser, setOpenUser] = useState<Utilisateur | null>(null);
  const [activeTab, setActiveTab] = useState('profil');
  const [newOpen, setNewOpen] = useState(false);
  // GUID de l'utilisateur en cours d'édition (null = création).
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmIntent, setConfirmIntent] = useState<ConfirmIntent | null>(null);

  // form state — new user
  const [uPrenom, setUPrenom] = useState('');
  const [uNom, setUNom] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uRole, setURole] = useState<Utilisateur['role']>('Chargé KYC');
  const [uDirection, setUDirection] = useState<Utilisateur['direction']>('DCONF');
  const [uSendInvite, setUSendInvite] = useState(true);
  const [uMfa, setUMfa] = useState(true);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false;
      if (directionFilter && u.direction !== directionFilter) return false;
      if (statutFilter && u.statut !== statutFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const fullName = `${u.prenom} ${u.nom}`.toLowerCase();
        if (!fullName.includes(q) && !u.email.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [users, search, roleFilter, directionFilter, statutFilter]);

  const kpis = {
    total: users.length,
    actifs: users.filter((u) => u.statut === 'Actif').length,
    admins: users.filter((u) => u.role === 'Super Admin' || u.role === 'Admin Direction').length,
    suspendus: users.filter((u) => u.statut === 'Suspendu').length,
  };

  const open = (u: Utilisateur) => {
    setOpenUser(u);
    setActiveTab('profil');
  };

  const resetForm = () => {
    setEditingId(null);
    setUPrenom('');
    setUNom('');
    setUEmail('');
    setURole('Chargé KYC');
    setUDirection('DCONF');
    setUSendInvite(true);
    setUMfa(true);
  };

  /** Ouvre le formulaire pré-rempli pour éditer un utilisateur existant. */
  const startEdit = (u: Utilisateur) => {
    setEditingId(u.id);
    setUPrenom(u.prenom);
    setUNom(u.nom);
    setUEmail(u.email);
    setURole(u.role);
    setUDirection(u.direction);
    setUSendInvite(false);
    setUMfa(true);
    setOpenUser(null);
    setNewOpen(true);
  };

  const submitUser = async () => {
    const fields = {
      afb_nomcomplet: `${uPrenom} ${uNom}`.trim(),
      afb_adresseemail: uEmail,
      afb_direction: DIR_FORM_TO_CODE[uDirection] ?? DV_DIRECTION_CODE.DCONF,
      afb_role: ROLE_FORM_TO_CODE[uRole] ?? DV_ROLE_CODE.Auditeurinterne,
    };
    try {
      if (editingId) {
        await updateUser.mutateAsync({
          id: editingId,
          changes: fields as unknown as Parameters<typeof updateUser.mutateAsync>[0]['changes'],
        });
        notifySuccess(t('Compte modifié'), {
          description: `${uPrenom} ${uNom} — ${uRole} (${uDirection}) ${t('mis à jour dans Dataverse.')}`,
        });
      } else {
        await createUser.mutateAsync({
          ...fields,
          afb_actif: DV_ACTIF_OUI,
        } as unknown as Parameters<typeof createUser.mutateAsync>[0]);
        notifySuccess(t('Compte créé'), {
          description: `${uPrenom} ${uNom} — ${uRole} (${uDirection}) ${t('enregistré dans Dataverse.')}${uSendInvite ? ' ' + t('Invitation à envoyer par e-mail.') : ''}`,
        });
      }
      setNewOpen(false);
      resetForm();
    } catch (e) {
      notifyInfo(editingId ? t('Modification échouée') : t('Création échouée'), {
        description: e instanceof Error ? e.message : t('Erreur lors de l\'enregistrement Dataverse.'),
      });
      throw e;
    }
  };

  const onSuspend = async (motif?: string) => {
    if (openUser) {
      try {
        await updateUser.mutateAsync({
          id: openUser.id,
          changes: { afb_actif: DV_ACTIF_NON } as unknown as Parameters<typeof updateUser.mutateAsync>[0]['changes'],
        });
      } catch (e) {
        notifyWarning(t('Suspension impossible'), { description: e instanceof Error ? e.message : t('Erreur Dataverse.') });
        throw e;
      }
    }
    notifyInfo(t('Compte suspendu'), {
      description: `${openUser?.prenom} ${openUser?.nom} — ${t('accès révoqué. Motif :')} ${motif}.`,
    });
    setConfirmIntent(null);
    setOpenUser(null);
  };

  /** Réactive un compte suspendu (afb_actif = Oui). */
  const onReactivate = async (u: Utilisateur) => {
    try {
      await updateUser.mutateAsync({
        id: u.id,
        changes: { afb_actif: DV_ACTIF_OUI } as unknown as Parameters<typeof updateUser.mutateAsync>[0]['changes'],
      });
      notifySuccess(t('Accès réactivé'), { description: `${u.prenom} ${u.nom} — ${t('le compte peut de nouveau se connecter.')}` });
      setOpenUser(null);
    } catch (e) {
      notifyWarning(t('Réactivation impossible'), { description: e instanceof Error ? e.message : t('Erreur Dataverse.') });
    }
  };

  const newUserValid = uPrenom.trim().length >= 2 && uNom.trim().length >= 2 && /^\S+@\S+\.\S+$/.test(uEmail);

  const columns: Column<Utilisateur>[] = [
    {
      key: 'user',
      header: 'Utilisateur',
      render: (u) => (
        <div className={styles.userCell}>
          <div className={styles.avatar}>{initials(u.prenom, u.nom)}</div>
          <div className={styles.userMeta}>
            <span className={styles.userName}>{u.prenom} {u.nom}</span>
            <span className={styles.userEmail}>{u.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Rôle',
      render: (u) => (
        <Badge appearance="tint" color={roleColor(u.role)} size="small">
          {u.role}
        </Badge>
      ),
    },
    { key: 'direction', header: 'Direction', render: (u) => u.direction },
    {
      key: 'dossiers',
      header: 'Dossiers traités',
      render: (u) => (
        <span style={{ fontWeight: 600, color: u.dossiersTraites > 0 ? '#1A1A1A' : '#C8C8C8' }}>
          {u.dossiersTraites > 0 ? u.dossiersTraites : '—'}
        </span>
      ),
    },
    { key: 'connexion', header: 'Dernière connexion', render: (u) => <span style={{ color: '#767676' }}>{u.derniereConnexion}</span> },
    {
      key: 'statut',
      header: 'Statut',
      render: (u) => (
        <Badge appearance="tint" color={statutColor(u.statut)} size="small">
          {u.statut}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (u) => (
        <div className={styles.rowActions} onClick={(e) => e.stopPropagation()}>
          <Tooltip content={t('Voir le profil')} relationship="label">
            <Button size="small" appearance="subtle" icon={<Eye20Regular />} onClick={() => open(u)} />
          </Tooltip>
          <Tooltip content={t('Éditer')} relationship="label">
            <Button size="small" appearance="subtle" icon={<Edit20Regular />} onClick={() => startEdit(u)} />
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Utilisateurs"
        subtitle="Gestion des comptes Portail KYP/KYS — affectation des rôles, directions et permissions Dataverse."
        actions={
          <>
            <Button
              icon={<ArrowDownload20Regular />}
              appearance="outline"
              onClick={() => {
                const ok = exportToCsv(
                  `utilisateurs-${new Date().toISOString().slice(0, 10)}.csv`,
                  filtered.map((u) => ({
                    Nom: u.nom,
                    Prénom: u.prenom,
                    Email: u.email,
                    Rôle: u.role,
                    Direction: u.direction,
                    Statut: u.statut,
                    'Dernière connexion': u.derniereConnexion,
                  })),
                );
                notifySuccess(ok ? t('Export généré') : t('Aucune donnée'), {
                  description: ok ? `${filtered.length} ${t('utilisateurs exportés (CSV).')}` : t('Aucun utilisateur à exporter.'),
                });
              }}
            >
              {t('Export')}
            </Button>
            <Button icon={<Add20Regular />} appearance="primary" onClick={() => setNewOpen(true)}>
              {t('Nouvel utilisateur')}
            </Button>
          </>
        }
      />

      <div className={styles.kpiRow}>
        <div className={styles.kpi} onClick={() => { setRoleFilter(''); setDirectionFilter(''); setStatutFilter(''); }}>
          <div className={styles.kpiLabel}>{t('Comptes')}</div>
          <div className={styles.kpiValue}>{kpis.total}</div>
          <div className={styles.kpiMeta}>{t('tous statuts confondus')}</div>
        </div>
        <div className={styles.kpi} onClick={() => setStatutFilter('Actif')}>
          <div className={styles.kpiLabel}>{t('Actifs')}</div>
          <div className={styles.kpiValue} style={{ color: '#15803D' }}>{kpis.actifs}</div>
          <div className={styles.kpiMeta}>{t('connectés sous 30 jours')}</div>
        </div>
        <div className={styles.kpi} onClick={() => setRoleFilter('Super Admin')}>
          <div className={styles.kpiLabel}>{t('Administrateurs')}</div>
          <div className={styles.kpiValue}>{kpis.admins}</div>
          <div className={styles.kpiMeta}>{t('Super Admin + Admin Direction')}</div>
        </div>
        <div className={styles.kpi} onClick={() => setStatutFilter('Suspendu')}>
          <div className={styles.kpiLabel}>{t('Suspendus')}</div>
          <div className={styles.kpiValue} style={{ color: 'var(--accent)' }}>{kpis.suspendus}</div>
          <div className={styles.kpiMeta}>{t('accès révoqué')}</div>
        </div>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher un utilisateur ou un email…"
        filters={[
          { key: 'role', label: 'Rôle', value: roleFilter, options: ROLE_OPTIONS, onChange: setRoleFilter },
          { key: 'direction', label: 'Direction', value: directionFilter, options: DIRECTION_OPTIONS, onChange: setDirectionFilter },
          { key: 'statut', label: 'Statut', value: statutFilter, options: STATUT_OPTIONS, onChange: setStatutFilter },
        ]}
      />

      <Card
        flush
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Person20Regular /> Annuaire interne
          </span>
        }
        subtitle={`${filtered.length} sur ${users.length} utilisateurs`}
      >
        {error ? (
          <div style={{ padding: '24px', color: 'var(--accent)', fontSize: '13px' }}>
            {t('Erreur de chargement depuis Dataverse :')} {error.message}
          </div>
        ) : isLoading ? (
          <div style={{ padding: '24px', color: '#767676', fontSize: '13px' }}>{t('Chargement des utilisateurs…')}</div>
        ) : (
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(u) => u.id}
            onRowClick={open}
            emptyMessage="Aucun utilisateur ne correspond aux filtres."
          />
        )}
      </Card>

      {/* Drawer utilisateur */}
      <DetailDrawer
        open={openUser !== null && confirmIntent === null}
        onOpenChange={(o) => !o && setOpenUser(null)}
        eyebrow={openUser?.direction ?? ''}
        title={openUser ? `${openUser.prenom} ${openUser.nom}` : ''}
        subtitle={openUser?.email}
        size="large"
        statusBadges={
          openUser ? (
            <>
              <Badge appearance="filled" color={roleColor(openUser.role)} size="small">
                {openUser.role}
              </Badge>
              <Badge appearance="tint" color={statutColor(openUser.statut)} size="small">
                {openUser.statut}
              </Badge>
            </>
          ) : null
        }
        tabs={[
          { id: 'profil', label: t('Profil') },
          { id: 'roles', label: t('Rôles & permissions') },
          { id: 'activite', label: t('Activité récente') },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        footer={
          openUser ? (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', width: '100%' }}>
              {openUser.statut === 'Suspendu' ? (
                <Button appearance="subtle" onClick={() => openUser && onReactivate(openUser)}>
                  {t('Réactiver l\'accès')}
                </Button>
              ) : (
                <Button appearance="subtle" onClick={() => setConfirmIntent('suspend')}>
                  {t('Suspendre l\'accès')}
                </Button>
              )}
              <Button
                appearance="primary"
                icon={<Edit20Regular />}
                onClick={() => openUser && startEdit(openUser)}
              >
                {t('Éditer')}
              </Button>
            </div>
          ) : null
        }
      >
        {openUser && (
          <>
            <div className={styles.userHeader}>
              <div className={styles.avatarLarge}>{initials(openUser.prenom, openUser.nom)}</div>
              <div>
                <div style={{ fontSize: '17px', fontWeight: 600, color: '#1A1A1A' }}>
                  {openUser.prenom} {openUser.nom}
                </div>
                <div style={{ fontSize: '13px', color: '#767676' }}>
                  {openUser.role} · {openUser.direction}
                </div>
              </div>
            </div>

            {activeTab === 'profil' && (
              <>
                <DrawerSection title={t('Identification')}>
                  <FieldGrid
                    items={[
                      { label: t('Prénom'), value: openUser.prenom },
                      { label: t('Nom'), value: openUser.nom },
                      { label: t('E-mail'), value: openUser.email },
                      { label: t('Direction'), value: openUser.direction },
                      { label: t('Dernière connexion'), value: openUser.derniereConnexion },
                      { label: t('Dossiers traités'), value: openUser.dossiersTraites },
                    ]}
                  />
                </DrawerSection>
                <DrawerSection title={t('Sécurité')}>
                  <FieldGrid
                    items={[
                      { label: t('Authentification'), value: 'Azure AD B2C + MFA' },
                      { label: t('Dernière modif. MDP'), value: t('Il y a 47 jours') },
                      { label: t('Sessions actives'), value: t('1 (Edge — Windows)') },
                    ]}
                  />
                </DrawerSection>
              </>
            )}

            {activeTab === 'roles' && (
              <DrawerSection
                title={t('Permissions effectives')}
                description={`${t('Découlent du rôle')} "${openUser.role}" ${t('— héritage RBAC complet.')}`}
              >
                {(PERMISSIONS_BY_ROLE[openUser.role] ?? []).map((p) => (
                  <div key={p.name} className={styles.perm}>
                    <ShieldKeyhole20Regular style={{ color: p.granted ? '#15803D' : '#C8C8C8' }} />
                    <span
                      className={styles.permName}
                      style={{ color: p.granted ? '#1A1A1A' : '#C8C8C8', textDecoration: p.granted ? 'none' : 'line-through' }}
                    >
                      {t(p.name)}
                    </span>
                    {p.granted ? (
                      <Badge appearance="filled" color="success" size="small">{t('Accordée')}</Badge>
                    ) : (
                      <Badge appearance="tint" color="subtle" size="small">{t('Refusée')}</Badge>
                    )}
                  </div>
                ))}
              </DrawerSection>
            )}

            {activeTab === 'activite' && (
              <DrawerSection title={t('Dernières actions')}>
                <DrawerTimeline
                  events={[
                    { when: openUser.derniereConnexion, title: t('Connexion réussie'), detail: 'IP 192.168.x.x · Edge / Windows 11' },
                    { when: t('Hier 16h22'), title: t('Validation décision'), detail: `KYC-B-2026-1247 · Standard · ${t('Validé')}` },
                    { when: t('Hier 14h08'), title: t('Dossier modifié'), detail: `KYC-B-2026-1247 · ${t('Mise à jour UBO')}` },
                    { when: '12/05/2026 09h00', title: t('Connexion réussie'), detail: 'IP 192.168.x.x' },
                  ]}
                />
              </DrawerSection>
            )}
          </>
        )}
      </DetailDrawer>

      {/* Modal nouvel utilisateur */}
      <FormDialog
        open={newOpen}
        onOpenChange={(o) => { if (!o) resetForm(); setNewOpen(o); }}
        eyebrow={t('Administration')}
        title={editingId ? t('Modifier l\'utilisateur') : t('Créer un nouvel utilisateur')}
        subtitle={
          editingId
            ? t('Mettez à jour l\'identité, le rôle et la direction. Les permissions découlent automatiquement du rôle.')
            : t("L'utilisateur est créé dans Azure AD B2C. Une invitation lui est envoyée par e-mail pour finaliser son inscription et activer le MFA.")
        }
        size="large"
        submitLabel={editingId ? t('Enregistrer les modifications') : t('Créer le compte')}
        submitDisabled={!newUserValid}
        onSubmit={submitUser}
      >
        <FormSection title={t('Identité')}>
          <FieldRow cols={2}>
            <Field label={t('Prénom')} required>
              <Input value={uPrenom} onChange={(_, d) => setUPrenom(d.value)} placeholder="Sarah" />
            </Field>
            <Field label={t('Nom')} required>
              <Input value={uNom} onChange={(_, d) => setUNom(d.value)} placeholder="Mballa" />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label={t('Adresse e-mail (AD)')} required hint={t('L\'e-mail doit appartenir au domaine AFB ou aux domaines autorisés')}>
              <Input type="email" value={uEmail} onChange={(_, d) => setUEmail(d.value)} placeholder="s.mballa@afribank.com" />
            </Field>
          </FieldRow>
        </FormSection>

        <FormSection title={t('Affectation')}>
          <FieldRow cols={2}>
            <Field label={t('Rôle')} required>
              <Dropdown
                value={uRole}
                selectedOptions={[uRole]}
                onOptionSelect={(_, d) => setURole((d.optionValue ?? 'Chargé KYC') as Utilisateur['role'])}
              >
                <Option value="Super Admin">{t('Super Admin')}</Option>
                <Option value="Admin Direction">{t('Admin Direction')}</Option>
                <Option value="Chargé KYC">{t('Chargé KYC')}</Option>
                <Option value="Utilisateur AFB">{t('Utilisateur AFB')}</Option>
                <Option value="Auditeur externe">{t('Auditeur externe')}</Option>
              </Dropdown>
            </Field>
            <Field label={t('Direction')} required>
              <Dropdown
                value={uDirection}
                selectedOptions={[uDirection]}
                onOptionSelect={(_, d) => setUDirection((d.optionValue ?? 'DCONF') as Utilisateur['direction'])}
              >
                <Option value="DCONF">{t('DCONF — Direction Conformité')}</Option>
                <Option value="DMG">{t('DMG — Management Général')}</Option>
                <Option value="TRESO">{t('TRESO — Trésorerie')}</Option>
                <Option value="COMEX">{t('COMEX — Commerce Extérieur')}</Option>
              </Dropdown>
            </Field>
          </FieldRow>
        </FormSection>

        {!editingId && (
          <FormSection title={t('Sécurité et activation')}>
            <Field>
              <Switch
                checked={uMfa}
                onChange={(_, d) => setUMfa(d.checked)}
                label={t('Activer le MFA obligatoire (recommandé pour DCONF)')}
              />
            </Field>
            <Field>
              <Switch
                checked={uSendInvite}
                onChange={(_, d) => setUSendInvite(d.checked)}
                label={t('Envoyer immédiatement l\'invitation par e-mail')}
              />
            </Field>
          </FormSection>
        )}
      </FormDialog>

      {/* Confirm suspend */}
      <ConfirmActionDialog
        open={confirmIntent === 'suspend' && openUser !== null}
        onOpenChange={(o) => !o && setConfirmIntent(null)}
        intent="suspend"
        title={t('Suspendre l\'accès ?')}
        description={t('L\'utilisateur ne pourra plus se connecter. Les dossiers en cours seront réattribués manuellement.')}
        confirmLabel={t('Suspendre')}
        requireMotif
        motifLabel={t('Motif de la suspension')}
        motifPlaceholder={t('Départ, soupçon de fraude, congés prolongés…')}
        entityRef={openUser ? `${openUser.prenom} ${openUser.nom}` : undefined}
        onConfirm={onSuspend}
      />
    </div>
  );
}