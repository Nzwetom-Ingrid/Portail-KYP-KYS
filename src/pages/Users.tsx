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
  Key20Regular,
  Person20Regular,
  Eye20Regular,
  ShieldKeyhole20Regular,
} from '@fluentui/react-icons';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';
import { FilterBar } from '@/components/common/FilterBar';
import { DataTable, type Column } from '@/components/common/DataTable';
import { type Utilisateur } from '@/lib/mockData';
import { utilisateursInternes } from '@/lib/dataverse/entityHooks';
import { toUtilisateur, DV_DIRECTION_CODE, DV_ROLE_CODE, DV_ACTIF_OUI } from '@/lib/dataverse/userMappers';
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
    color: '#E30613',
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
    color: '#E30613',
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
  { label: 'Chargé conformité', value: 'Chargé conformité' },
  { label: 'Analyste', value: 'Analyste' },
  { label: 'Visiteur', value: 'Visiteur' },
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
  'Admin Direction': DV_ROLE_CODE.SuperadminDCONF,
  'Chargé conformité': DV_ROLE_CODE.ChargeConformite,
  Analyste: DV_ROLE_CODE.ChargeRelation,
  Visiteur: DV_ROLE_CODE.Auditeurinterne,
};

function roleColor(r: Utilisateur['role']) {
  if (r === 'Super Admin') return 'danger';
  if (r === 'Admin Direction') return 'severe';
  if (r === 'Chargé conformité') return 'important';
  if (r === 'Analyste') return 'warning';
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
  'Chargé conformité': [
    { name: 'Lecture · dossiers assignés', granted: true },
    { name: 'Édition · dossiers assignés', granted: true },
    { name: 'Validation · Standard', granted: true },
    { name: 'Validation · Élevé, Critique', granted: false },
    { name: 'Export · données nominatives', granted: false },
  ],
  Analyste: [
    { name: 'Lecture · dossiers assignés', granted: true },
    { name: 'Édition · pré-instruction', granted: true },
    { name: 'Validation', granted: false },
    { name: 'Export · données anonymisées uniquement', granted: true },
  ],
  Visiteur: [
    { name: 'Lecture · tableau de bord', granted: true },
    { name: 'Lecture · rapports publiés', granted: true },
    { name: 'Édition', granted: false },
    { name: 'Export', granted: false },
  ],
};

export default function Users() {
  const styles = useStyles();
  const { notifySuccess, notifyInfo, notifyWarning } = useNotifications();

  // Données réelles depuis Dataverse (table afb_utilisateurinterne).
  const { data: rawUsers, isLoading, error } = utilisateursInternes.useList({ top: 200 });
  const createUser = utilisateursInternes.useCreate();
  const updateUser = utilisateursInternes.useUpdate();
  const users = useMemo(() => (rawUsers ?? []).map(toUtilisateur), [rawUsers]);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [directionFilter, setDirectionFilter] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [openUser, setOpenUser] = useState<Utilisateur | null>(null);
  const [activeTab, setActiveTab] = useState('profil');
  const [newOpen, setNewOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmIntent, setConfirmIntent] = useState<ConfirmIntent | null>(null);

  // form state — new user
  const [uPrenom, setUPrenom] = useState('');
  const [uNom, setUNom] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uRole, setURole] = useState<Utilisateur['role']>('Chargé conformité');
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
    setUPrenom('');
    setUNom('');
    setUEmail('');
    setURole('Chargé conformité');
    setUDirection('DCONF');
    setUSendInvite(true);
    setUMfa(true);
  };

  const submitNew = async () => {
    try {
      await createUser.mutateAsync({
        afb_nomcomplet: `${uPrenom} ${uNom}`.trim(),
        afb_adresseemail: uEmail,
        afb_direction: DIR_FORM_TO_CODE[uDirection] ?? DV_DIRECTION_CODE.DCONF,
        afb_role: ROLE_FORM_TO_CODE[uRole] ?? DV_ROLE_CODE.Auditeurinterne,
        afb_actif: DV_ACTIF_OUI,
      } as unknown as Parameters<typeof createUser.mutateAsync>[0]);
      notifySuccess('Compte créé', {
        description: `${uPrenom} ${uNom} — ${uRole} (${uDirection}) enregistré dans Dataverse.${uSendInvite ? ' Invitation à envoyer par e-mail.' : ''}`,
      });
      setNewOpen(false);
      resetForm();
    } catch (e) {
      notifyInfo('Création échouée', {
        description: e instanceof Error ? e.message : 'Erreur lors de l\'enregistrement Dataverse.',
      });
    }
  };

  const submitReset = async () => {
    await new Promise((r) => setTimeout(r, 500));
    notifyInfo('Mot de passe réinitialisé', {
      description: `${openUser?.prenom} ${openUser?.nom} — e-mail de réinitialisation envoyé. Lien valide 4 heures.`,
    });
    setConfirmReset(false);
  };

  const onSuspend = async (motif?: string) => {
    if (openUser) {
      try {
        await updateUser.mutateAsync({
          id: openUser.id,
          changes: { afb_actif: 747010001 } as unknown as Parameters<typeof updateUser.mutateAsync>[0]['changes'],
        });
      } catch (e) {
        notifyWarning('Suspension impossible', { description: e instanceof Error ? e.message : 'Erreur Dataverse.' });
        throw e;
      }
    }
    notifyInfo('Compte suspendu', {
      description: `${openUser?.prenom} ${openUser?.nom} — accès révoqué. Motif : ${motif}.`,
    });
    setConfirmIntent(null);
    setOpenUser(null);
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
          <Tooltip content="Voir le profil" relationship="label">
            <Button size="small" appearance="subtle" icon={<Eye20Regular />} onClick={() => open(u)} />
          </Tooltip>
          <Tooltip content="Éditer" relationship="label">
            <Button size="small" appearance="subtle" icon={<Edit20Regular />} onClick={() => open(u)} />
          </Tooltip>
          <Tooltip content="Réinitialiser le mot de passe" relationship="label">
            <Button
              size="small"
              appearance="subtle"
              icon={<Key20Regular />}
              onClick={() => { setOpenUser(u); setConfirmReset(true); }}
            />
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
                notifySuccess(ok ? 'Export généré' : 'Aucune donnée', {
                  description: ok ? `${filtered.length} utilisateurs exportés (CSV).` : 'Aucun utilisateur à exporter.',
                });
              }}
            >
              Export
            </Button>
            <Button icon={<Add20Regular />} appearance="primary" onClick={() => setNewOpen(true)}>
              Nouvel utilisateur
            </Button>
          </>
        }
      />

      <div className={styles.kpiRow}>
        <div className={styles.kpi} onClick={() => { setRoleFilter(''); setDirectionFilter(''); setStatutFilter(''); }}>
          <div className={styles.kpiLabel}>Comptes</div>
          <div className={styles.kpiValue}>{kpis.total}</div>
          <div className={styles.kpiMeta}>tous statuts confondus</div>
        </div>
        <div className={styles.kpi} onClick={() => setStatutFilter('Actif')}>
          <div className={styles.kpiLabel}>Actifs</div>
          <div className={styles.kpiValue} style={{ color: '#15803D' }}>{kpis.actifs}</div>
          <div className={styles.kpiMeta}>connectés sous 30 jours</div>
        </div>
        <div className={styles.kpi} onClick={() => setRoleFilter('Super Admin')}>
          <div className={styles.kpiLabel}>Administrateurs</div>
          <div className={styles.kpiValue}>{kpis.admins}</div>
          <div className={styles.kpiMeta}>Super Admin + Admin Direction</div>
        </div>
        <div className={styles.kpi} onClick={() => setStatutFilter('Suspendu')}>
          <div className={styles.kpiLabel}>Suspendus</div>
          <div className={styles.kpiValue} style={{ color: '#E30613' }}>{kpis.suspendus}</div>
          <div className={styles.kpiMeta}>accès révoqué</div>
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
          <div style={{ padding: '24px', color: '#C20012', fontSize: '13px' }}>
            Erreur de chargement depuis Dataverse : {error.message}
          </div>
        ) : isLoading ? (
          <div style={{ padding: '24px', color: '#767676', fontSize: '13px' }}>Chargement des utilisateurs…</div>
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
        open={openUser !== null && !confirmReset && confirmIntent === null}
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
          { id: 'profil', label: 'Profil' },
          { id: 'roles', label: 'Rôles & permissions' },
          { id: 'activite', label: 'Activité récente' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        footer={
          openUser ? (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', width: '100%' }}>
              <Button
                appearance="subtle"
                onClick={() => setConfirmIntent('suspend')}
                disabled={openUser.statut === 'Suspendu'}
              >
                Suspendre l'accès
              </Button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button appearance="outline" icon={<Key20Regular />} onClick={() => setConfirmReset(true)}>
                  Réinitialiser le mot de passe
                </Button>
                <Button
                  appearance="primary"
                  icon={<Edit20Regular />}
                  onClick={() =>
                    notifyInfo('Édition du profil', {
                      description: `Ouverture de la fiche de ${openUser?.nom ?? 'l’utilisateur'} en mode édition.`,
                    })
                  }
                >
                  Éditer
                </Button>
              </div>
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
                <DrawerSection title="Identification">
                  <FieldGrid
                    items={[
                      { label: 'Prénom', value: openUser.prenom },
                      { label: 'Nom', value: openUser.nom },
                      { label: 'E-mail', value: openUser.email },
                      { label: 'Direction', value: openUser.direction },
                      { label: 'Dernière connexion', value: openUser.derniereConnexion },
                      { label: 'Dossiers traités', value: openUser.dossiersTraites },
                    ]}
                  />
                </DrawerSection>
                <DrawerSection title="Sécurité">
                  <FieldGrid
                    items={[
                      { label: 'Authentification', value: 'Azure AD B2C + MFA' },
                      { label: 'Dernière modif. MDP', value: 'Il y a 47 jours' },
                      { label: 'Sessions actives', value: '1 (Edge — Windows)' },
                    ]}
                  />
                </DrawerSection>
              </>
            )}

            {activeTab === 'roles' && (
              <DrawerSection
                title="Permissions effectives"
                description={`Découlent du rôle "${openUser.role}" — héritage RBAC complet.`}
              >
                {(PERMISSIONS_BY_ROLE[openUser.role] ?? []).map((p) => (
                  <div key={p.name} className={styles.perm}>
                    <ShieldKeyhole20Regular style={{ color: p.granted ? '#15803D' : '#C8C8C8' }} />
                    <span
                      className={styles.permName}
                      style={{ color: p.granted ? '#1A1A1A' : '#C8C8C8', textDecoration: p.granted ? 'none' : 'line-through' }}
                    >
                      {p.name}
                    </span>
                    {p.granted ? (
                      <Badge appearance="filled" color="success" size="small">Accordée</Badge>
                    ) : (
                      <Badge appearance="tint" color="subtle" size="small">Refusée</Badge>
                    )}
                  </div>
                ))}
              </DrawerSection>
            )}

            {activeTab === 'activite' && (
              <DrawerSection title="Dernières actions">
                <DrawerTimeline
                  events={[
                    { when: openUser.derniereConnexion, title: 'Connexion réussie', detail: 'IP 192.168.x.x · Edge / Windows 11' },
                    { when: 'Hier 16h22', title: 'Validation décision', detail: 'KYC-B-2026-1247 · Standard · Validé' },
                    { when: 'Hier 14h08', title: 'Dossier modifié', detail: 'KYC-B-2026-1247 · Mise à jour UBO' },
                    { when: '12/05/2026 09h00', title: 'Connexion réussie', detail: 'IP 192.168.x.x' },
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
        eyebrow="Administration"
        title="Créer un nouvel utilisateur"
        subtitle="L'utilisateur est créé dans Azure AD B2C. Une invitation lui est envoyée par e-mail pour finaliser son inscription et activer le MFA."
        size="large"
        submitLabel="Créer le compte"
        submitDisabled={!newUserValid}
        onSubmit={submitNew}
      >
        <FormSection title="Identité">
          <FieldRow cols={2}>
            <Field label="Prénom" required>
              <Input value={uPrenom} onChange={(_, d) => setUPrenom(d.value)} placeholder="Sarah" />
            </Field>
            <Field label="Nom" required>
              <Input value={uNom} onChange={(_, d) => setUNom(d.value)} placeholder="Mballa" />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label="Adresse e-mail (AD)" required hint="L'e-mail doit appartenir au domaine AFB ou aux domaines autorisés">
              <Input type="email" value={uEmail} onChange={(_, d) => setUEmail(d.value)} placeholder="s.mballa@afribank.com" />
            </Field>
          </FieldRow>
        </FormSection>

        <FormSection title="Affectation">
          <FieldRow cols={2}>
            <Field label="Rôle" required>
              <Dropdown
                value={uRole}
                selectedOptions={[uRole]}
                onOptionSelect={(_, d) => setURole((d.optionValue ?? 'Chargé conformité') as Utilisateur['role'])}
              >
                <Option value="Super Admin">Super Admin</Option>
                <Option value="Admin Direction">Admin Direction</Option>
                <Option value="Chargé conformité">Chargé conformité</Option>
                <Option value="Analyste">Analyste</Option>
                <Option value="Visiteur">Visiteur</Option>
              </Dropdown>
            </Field>
            <Field label="Direction" required>
              <Dropdown
                value={uDirection}
                selectedOptions={[uDirection]}
                onOptionSelect={(_, d) => setUDirection((d.optionValue ?? 'DCONF') as Utilisateur['direction'])}
              >
                <Option value="DCONF">DCONF — Direction Conformité</Option>
                <Option value="DMG">DMG — Management Général</Option>
                <Option value="TRESO">TRESO — Trésorerie</Option>
                <Option value="COMEX">COMEX — Commerce Extérieur</Option>
              </Dropdown>
            </Field>
          </FieldRow>
        </FormSection>

        <FormSection title="Sécurité et activation">
          <Field>
            <Switch
              checked={uMfa}
              onChange={(_, d) => setUMfa(d.checked)}
              label="Activer le MFA obligatoire (recommandé pour DCONF)"
            />
          </Field>
          <Field>
            <Switch
              checked={uSendInvite}
              onChange={(_, d) => setUSendInvite(d.checked)}
              label="Envoyer immédiatement l'invitation par e-mail"
            />
          </Field>
        </FormSection>
      </FormDialog>

      {/* Confirm reset password */}
      <ConfirmActionDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        intent="info"
        title="Réinitialiser le mot de passe ?"
        description="Un e-mail de réinitialisation sera envoyé à l'utilisateur. Le lien est valide 4 heures."
        confirmLabel="Envoyer le lien"
        entityRef={openUser ? `${openUser.prenom} ${openUser.nom}` : undefined}
        onConfirm={submitReset}
      />

      {/* Confirm suspend */}
      <ConfirmActionDialog
        open={confirmIntent === 'suspend' && openUser !== null}
        onOpenChange={(o) => !o && setConfirmIntent(null)}
        intent="suspend"
        title="Suspendre l'accès ?"
        description="L'utilisateur ne pourra plus se connecter. Les dossiers en cours seront réattribués manuellement."
        confirmLabel="Suspendre"
        requireMotif
        motifLabel="Motif de la suspension"
        motifPlaceholder="Départ, soupçon de fraude, congés prolongés…"
        entityRef={openUser ? `${openUser.prenom} ${openUser.nom}` : undefined}
        onConfirm={onSuspend}
      />
    </div>
  );
}