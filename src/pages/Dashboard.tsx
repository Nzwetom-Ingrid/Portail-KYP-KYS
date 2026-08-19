import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { exportToCsv } from '@/lib/exportCsv';
import { COUNTRIES } from '@/lib/countries';
import {
  makeStyles,
  Button,
  Dropdown,
  Option,
  Input,
  Radio,
  RadioGroup,
  Field,
  Textarea,
  Badge,
} from '@fluentui/react-components';
import {
  ArrowDownload20Regular,
  Add20Regular,
  CheckmarkCircle20Filled,
} from '@fluentui/react-icons';
import { KPICard } from '@/components/dashboard/KPICard';
import { ProgressionChart } from '@/components/dashboard/ProgressionChart';
import { RiskDistribution } from '@/components/dashboard/RiskDistribution';
import { RecentDossiersTable } from '@/components/dashboard/RecentDossiersTable';
import type { Dossier } from '@/lib/mockData';
import { SLAAlerts } from '@/components/dashboard/SLAAlerts';
import { mockKPIs } from '@/lib/mockData';
import { dossiersKypKys, tiers as tiersHooks, documents as documentsHooks, resultatsScreening, partnerTypes, utilisateursInternes } from '@/lib/dataverse/entityHooks';
import { useRoleStore } from '@/store/roleStore';
import { assignQuestionnairesForTiers } from '@/lib/dataverse/assignQuestionnaires';
import { toDossier } from '@/lib/dataverse/dossierMappers';
import { toDocExpiration } from '@/lib/dataverse/documentMappers';
import {
  DetailDrawer,
  DrawerSection,
  FieldGrid,
  DrawerTimeline,
} from '@/components/common/DetailDrawer';
import { FormDialog, FormSection, FieldRow } from '@/components/common/FormDialog';
import { ConfirmActionDialog } from '@/components/common/ConfirmActionDialog';
import { useNotifications } from '@/components/common/NotificationProvider';
import { useT } from '@/i18n/i18n';

const useStyles = makeStyles({
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '36px',
    gap: '24px',
    flexWrap: 'wrap',
  },
  titleBlock: { flex: 1, minWidth: 0 },
  eyebrow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    fontSize: '10.5px',
    fontWeight: 700,
    color: 'var(--accent)',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    marginBottom: '12px',
    padding: '4px 12px',
    backgroundColor: 'rgba(200, 16, 46, 0.06)',
    borderRadius: '999px',
    border: '1px solid rgba(200, 16, 46, 0.14)',
  },
  title: {
    fontSize: '33px',
    fontWeight: 700,
    color: '#141414',
    marginBottom: '10px',
    lineHeight: 1.12,
    letterSpacing: '-0.03em',
    margin: 0,
  },
  subtitle: {
    fontSize: '14.5px',
    color: '#5A5A5A',
    lineHeight: 1.6,
    maxWidth: '760px',
    margin: 0,
  },
  actions: {
    display: 'flex',
    gap: '10px',
    flexShrink: 0,
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#A3A3A3',
    textTransform: 'uppercase',
    letterSpacing: '0.10em',
    marginBottom: '12px',
    marginTop: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    '::after': {
      content: '""',
      flex: 1,
      height: '1px',
      backgroundColor: '#ECEAE4',
    },
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
    gap: '18px',
    marginBottom: '28px',
  },
  midRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '18px',
    marginBottom: '28px',
    '@media (max-width: 1024px)': { gridTemplateColumns: '1fr' },
  },
  bottomRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '18px',
    '@media (max-width: 1024px)': { gridTemplateColumns: '1fr' },
  },
});

type QuickDossier = {
  ref: string;
  entite: string;
  type: string;
  risque: 'Standard' | 'Élevé' | 'Critique';
  statut: string;
  progression: number;
  charge: string;
};

const DIRECTIONS = [
  { value: 'DCONF', label: 'DCONF — Direction de la Conformité' },
  { value: 'DMG', label: 'DMG — Direction Management Général' },
  { value: 'TRESO', label: 'TRESO — Trésorerie' },
  { value: 'COMEX', label: 'COMEX — Commerce Extérieur' },
];

export default function Dashboard() {
  const styles = useStyles();
  const navigate = useNavigate();
  const can = useRoleStore(s => s.can);
  const { notifySuccess, notifyInfo } = useNotifications();
  const { t } = useT();

  // Dossiers réels depuis Dataverse (afb_dossierkypkys).
  const { data: rawDossiers } = dossiersKypKys.useList({ top: 200 });
  // Tiers chargés en parallèle pour enrichir les dossiers (pays, risque, chargé, type).
  const { data: tiersData } = tiersHooks.useList({ top: 500 });
  const tiersByGuid = useMemo(
    () => new Map((tiersData ?? []).map((t) => [t.afb_tiersid, t])),
    [tiersData],
  );
  // Utilisateurs internes : alimentent le sélecteur « chargé » et résolvent son nom (lookup).
  const { data: userData } = utilisateursInternes.useList({ top: 500 });
  const usersByGuid = useMemo(
    () => new Map((userData ?? []).map((u) => [u.afb_utilisateurinterneid, u])),
    [userData],
  );
  const dossiers = useMemo(
    () => (rawDossiers ?? []).map((d) => toDossier(d, tiersByGuid, usersByGuid)),
    [rawDossiers, tiersByGuid, usersByGuid],
  );
  const recents = useMemo(() => dossiers.slice(0, 8), [dossiers]);
  const dossiersEnCours = dossiers.filter((d) => d.statut === 'En revue' || d.statut === 'Brouillon').length;
  const validesCeMois = dossiers.filter((d) => d.statut === 'Validé').length;

  // Création de dossier (avec création de tiers automatique).
  const createDossier = dossiersKypKys.useCreate();
  const createTiers = tiersHooks.useCreate();
  const { data: ptData } = partnerTypes.useList({ top: 200 });

  // Documents (expirations) et alertes de screening, pour les KPI temps réel.
  const { data: rawDocs } = documentsHooks.useList({ top: 500 });
  const { data: rawScreening } = resultatsScreening.useList({ top: 500 });

  const documentsExpires = useMemo(
    () => (rawDocs ?? []).map((d) => toDocExpiration(d)).filter((d) => d.statut !== 'Valide').length,
    [rawDocs],
  );
  const alertesScreening = useMemo(
    () =>
      (rawScreening ?? []).filter(
        (s) => s.afb_resultatducontrolename === 'Matchpositif' || s.afb_resultatducontrolename === 'Matchfaible',
      ).length,
    [rawScreening],
  );

  // Distribution des risques à partir du référentiel tiers (afb_niveauderisque).
  const riskCounts = useMemo(() => {
    const c = { low: 0, medium: 0, high: 0 };
    for (const t of tiersData ?? []) {
      const n = t.afb_niveauderisquename;
      if (n === 'Critique') c.high += 1;
      else if (n === '_lev_' || n === 'Élevé') c.medium += 1;
      else c.low += 1;
    }
    return c;
  }, [tiersData]);

  const [newDossierOpen, setNewDossierOpen] = useState(false);
  const [confirmExport, setConfirmExport] = useState(false);
  const [openDossier, setOpenDossier] = useState<QuickDossier | null>(null);

  // form state for new dossier
  const [direction, setDirection] = useState('DCONF');
  // Type de partenaire choisi dans le référentiel Dataverse (GUID afb_partnertype).
  const [typeId, setTypeId] = useState<string>('');
  const [chargeId, setChargeId] = useState('');
  const [nom, setNom] = useState('');
  const [pays, setPays] = useState('Cameroun');
  const [risque, setRisque] = useState<'Standard' | 'Élevé' | 'Critique'>('Standard');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');

  const reset = () => {
    setDirection('DCONF');
    setTypeId('');
    setChargeId('');
    setNom('');
    setPays('Cameroun');
    setRisque('Standard');
    setEmail('');
    setNote('');
  };

  const DIRECTION_FORM_TO_DV: Record<string, number> = { TRESO: 0, DCONF: 1, DMG: 2, COMEX: 747010001 };
  const RISQUE_FORM_TO_DV: Record<string, number> = { Standard: 2, 'Élevé': 1, Critique: 0 };

  const submitNouveau = async () => {
    // Type juridique : GUID du type de partenaire sélectionné dans le référentiel.
    const ptGuid = typeId;
    if (!ptGuid) {
      notifyInfo(t('Création impossible'), {
        description: t('Sélectionnez un type de partenaire — gérez-les dans Administration → Types de partenaires.'),
      });
      return;
    }
    // Préfixe de référence selon la famille du type choisi (BC → B, EMF → E, sinon F).
    const famille = ptData?.find((p) => p.afb_partnertypeid === typeId)?.afb_familledinstitution;
    const refType = famille === 747010000 ? 'B' : famille === 747010001 ? 'E' : 'F';
    const ref = `KYC-${refType}-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    try {
      // 1) Création du tiers (porte raison sociale, pays, risque, direction, lookups).
      const newTiers = await createTiers.mutateAsync({
        afb_nomdupartenaire: nom.trim(),
        afb_pays: pays.trim(),
        afb_directionporteuse: DIRECTION_FORM_TO_DV[direction] ?? 1,
        afb_niveauderisque: RISQUE_FORM_TO_DV[risque] ?? 2,
        afb_statutdutiers: 0, // Partenaireactif
        afb_datedecreationsysteme: new Date().toISOString(),
        ...(email ? { afb_emailcontactprincipal: email } : {}),
        'afb_typejuridique@odata.bind': `/afb_partnertypes(${ptGuid})`,
        'afb_chargederelation@odata.bind': `/afb_utilisateurinternes(${chargeId})`,
      } as unknown as Parameters<typeof createTiers.mutateAsync>[0]);

      // 2) Création du dossier rattaché.
      await createDossier.mutateAsync({
        afb_referencedudossier: ref,
        afb_statutdudossier: 1, // En revue → visible dans la file de validation
        afb_tauxdecompletude: 0,
        afb_versiondudossier: 1,
        afb_datedesoumission: new Date().toISOString(),
        ...(note ? { afb_commentairedconf: note } : {}),
        'afb_nomdutiers@odata.bind': `/afb_tierses(${newTiers.afb_tiersid})`,
      } as unknown as Parameters<typeof createDossier.mutateAsync>[0]);

      // 3) Affecte automatiquement le(s) questionnaire(s) selon le type du tiers.
      await assignQuestionnairesForTiers(
        newTiers.afb_tiersid,
        ptData?.find((p) => p.afb_partnertypeid === typeId)?.afb_codeinstitution,
        (userData ?? [])[0]?.afb_utilisateurinterneid,
      );

      notifySuccess(t('Nouveau dossier créé'), {
        description: `${ref} · ${nom} — ${t('dossier initialisé dans Dataverse.')}`,
        action: { label: t('Voir'), onClick: () => navigate('/dossiers') },
      });
      setNewDossierOpen(false);
      reset();
    } catch (e) {
      notifyInfo(t('Création impossible'), {
        description: e instanceof Error ? e.message : t('Erreur Dataverse lors de la création du dossier.'),
      });
      throw e;
    }
  };

  const exportAction = async () => {
    const ok = exportToCsv(
      `dashboard-dossiers-${new Date().toISOString().slice(0, 10)}.csv`,
      dossiers.map((d) => ({
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
    notifySuccess(ok ? t('Export généré') : t('Aucune donnée'), {
      description: ok ? `${dossiers.length} ${t('dossiers exportés au format CSV.')}` : t('Aucun dossier à exporter.'),
    });
    setConfirmExport(false);
  };

  // intercept the table to surface a drawer when row clicked
  const handleRowClick = (rowItem: Dossier) => {
    const row = rowItem as unknown as Record<string, unknown>;
    const risqueMap: Record<string, QuickDossier['risque']> = {
      Low: 'Standard',
      Medium: 'Élevé',
      High: 'Critique',
      Standard: 'Standard',
      'Élevé': 'Élevé',
      Critique: 'Critique',
    };
    const rRisque = String(row.risque ?? 'Standard');
    setOpenDossier({
      ref: String(row.id ?? row.ref ?? 'KYC-X-2026-0000'),
      entite: String(row.entite ?? row.partenaire ?? 'Partenaire'),
      type: String(row.type ?? 'Banque correspondante'),
      risque: risqueMap[rRisque] ?? 'Standard',
      statut: String(row.statut ?? 'En revue'),
      progression: typeof row.progression === 'number' ? row.progression : 78,
      charge: String(row.charge ?? 'N. Mballa'),
    });
  };

  const stepValid =
    typeId !== '' &&
    nom.trim().length >= 3 &&
    pays.trim().length > 0 &&
    chargeId !== '' &&
    /^\S+@\S+\.\S+$/.test(email);

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.titleBlock}>
          <div className={styles.eyebrow}>{t('Conformité · COBAC R-2023/01')}</div>
          <h1 className={styles.title}>{t('Tableau de bord')}</h1>
          <p className={styles.subtitle}>
            {t('Suivi temps réel des dossiers, scoring de risque et alertes SLA — vue consolidée des activités KYP/KYS.')}
          </p>
        </div>
        <div className={styles.actions}>
          {can('reports.export') && (
            <Button
              icon={<ArrowDownload20Regular />}
              appearance="outline"
              onClick={() => setConfirmExport(true)}
            >
              {t('Exporter')}
            </Button>
          )}
          {can('partners.create') && (
            <Button
              icon={<Add20Regular />}
              appearance="primary"
              onClick={() => setNewDossierOpen(true)}
            >
              {t('Nouveau dossier')}
            </Button>
          )}
        </div>
      </div>

      <div className={styles.sectionLabel}>{t('Indicateurs clés')}</div>

      <div className={styles.kpiGrid}>
        <KPICard
          label={t('Dossiers en cours')}
          value={dossiersEnCours}
          evolution={mockKPIs.dossiersEnCours.evolution}
          period={mockKPIs.dossiersEnCours.period}
          variant="positive"
          onClick={() => navigate('/dossiers')}
        />
        <KPICard
          label={t('Documents expirés')}
          value={documentsExpires}
          evolution={mockKPIs.documentsExpires.evolution}
          period={mockKPIs.documentsExpires.period}
          variant="warning"
          onClick={() => navigate('/calendar')}
        />
        <KPICard
          label={t('Alertes screening')}
          value={alertesScreening}
          evolution={mockKPIs.alertesScreening.evolution}
          period={mockKPIs.alertesScreening.period}
          variant="critical"
          onClick={() => navigate('/screening')}
        />
        <KPICard
          label={t('Validés ce mois')}
          value={validesCeMois}
          evolution={mockKPIs.validesCeMois.evolution}
          period={mockKPIs.validesCeMois.period}
          variant="positive"
          onClick={() => navigate('/dossiers')}
        />
      </div>

      <div className={styles.sectionLabel}>{t('Activité & risques')}</div>

      <div className={styles.midRow}>
        <ProgressionChart />
        <RiskDistribution counts={riskCounts} />
      </div>

      <div className={styles.sectionLabel}>{t('Dossiers récents')}</div>

      <div className={styles.bottomRow}>
        <RecentDossiersTable onRowClick={handleRowClick} rows={recents} />
        <SLAAlerts />
      </div>

      {/* Drawer rapide */}
      <DetailDrawer
        open={openDossier !== null}
        onOpenChange={(o) => !o && setOpenDossier(null)}
        eyebrow={t('Aperçu rapide')}
        title={openDossier?.entite ?? ''}
        subtitle={openDossier?.ref}
        size="medium"
        statusBadges={
          openDossier ? (
            <>
              <Badge
                appearance="filled"
                color={
                  openDossier.risque === 'Critique'
                    ? 'danger'
                    : openDossier.risque === 'Élevé'
                      ? 'warning'
                      : 'subtle'
                }
                size="small"
              >
                {t('Risque')} {openDossier.risque}
              </Badge>
              <Badge appearance="tint" color="brand" size="small">
                {openDossier.statut}
              </Badge>
            </>
          ) : null
        }
        footer={
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
            <Button
              appearance="outline"
              onClick={() => {
                setOpenDossier(null);
                navigate('/dossiers');
              }}
            >
              {t('Ouvrir la fiche complète')}
            </Button>
          </div>
        }
      >
        {openDossier && (
          <>
            <DrawerSection title={t('Identification')}>
              <FieldGrid
                items={[
                  { label: t('Référence dossier'), value: openDossier.ref, mono: true },
                  { label: t('Entité'), value: openDossier.entite },
                  { label: t('Type'), value: openDossier.type },
                  { label: t('Chargé de relation'), value: openDossier.charge },
                ]}
              />
            </DrawerSection>

            <DrawerSection title={t('Progression')}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '10px',
                }}
              >
                <div
                  style={{
                    flex: 1,
                    height: '8px',
                    backgroundColor: '#F4F4F4',
                    borderRadius: '999px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${openDossier.progression}%`,
                      backgroundColor: openDossier.progression >= 80 ? '#15803D' : 'var(--accent)',
                      borderRadius: '999px',
                    }}
                  />
                </div>
                <strong style={{ fontSize: '13px', color: '#1A1A1A', minWidth: '40px' }}>
                  {openDossier.progression}%
                </strong>
              </div>
              <p style={{ fontSize: '12px', color: '#767676', margin: 0 }}>
                {t('Dossier en cours de constitution — 14 pièces sur 18 fournies.')}
              </p>
            </DrawerSection>

            <DrawerSection title={t('Activité récente')}>
              <DrawerTimeline
                events={[
                  {
                    when: `${t('Aujourd’hui')} 09h12`,
                    title: t('Pièce déposée'),
                    detail: t('Questionnaire Wolfsberg (signé) — par le tiers'),
                  },
                  {
                    when: `${t('Hier')} 16h44`,
                    title: t('Relance automatique J-30'),
                    detail: t('Attestation fiscale arrive à expiration le 17/06/2026'),
                  },
                  {
                    when: '14/05/2026',
                    title: t('Screening exécuté'),
                    detail: t('Aucun match — sources ONU / OFAC / UE / PPE'),
                  },
                ]}
              />
            </DrawerSection>
          </>
        )}
      </DetailDrawer>

      {/* Modal nouveau dossier (single-step) */}
      <FormDialog
        open={newDossierOpen}
        onOpenChange={(o) => {
          if (!o) reset();
          setNewDossierOpen(o);
        }}
        eyebrow={t('Workflow d’entrée en relation')}
        title={t('Créer un nouveau dossier KYP/KYS')}
        subtitle={t('Initialise la fiche dans Dataverse et déclenche l’invitation Azure AD B2C avec OTP.')}
        size="large"
        submitLabel={t('Créer et inviter')}
        submitDisabled={!stepValid}
        onSubmit={submitNouveau}
      >
        <FormSection
          title={t('Initialisation')}
          description={t('Le chargé de relation crée la fiche du tiers et envoie l’invitation sécurisée. Le lien est valable 72 heures.')}
        >
          <FieldRow cols={2}>
            <Field label={t('Direction porteuse')} required>
              <Dropdown value={t(DIRECTIONS.find((d) => d.value === direction)?.label ?? '')} selectedOptions={[direction]} onOptionSelect={(_, d) => setDirection(d.optionValue ?? 'DCONF')}>
                {DIRECTIONS.map((d) => (
                  <Option key={d.value} value={d.value} text={t(d.label)}>
                    {t(d.label)}
                  </Option>
                ))}
              </Dropdown>
            </Field>
            <Field label={t('Type de partenaire')} required hint={t('Référentiel « Types de partenaires » (Dataverse)')}>
              <Dropdown
                placeholder={t('Sélectionner un type de partenaire')}
                value={ptData?.find((p) => p.afb_partnertypeid === typeId)?.afb_libellefrancais ?? ''}
                selectedOptions={typeId ? [typeId] : []}
                onOptionSelect={(_, d) => d.optionValue && setTypeId(d.optionValue)}
              >
                {(ptData ?? []).map((p) => (
                  <Option key={p.afb_partnertypeid} value={p.afb_partnertypeid} text={p.afb_libellefrancais}>
                    {p.afb_libellefrancais}
                    {p.afb_codeinstitution ? ` · ${p.afb_codeinstitution}` : ''}
                  </Option>
                ))}
              </Dropdown>
            </Field>
          </FieldRow>
          <FieldRow cols={2}>
            <Field label={t('Raison sociale')} required>
              <Input value={nom} onChange={(_, d) => setNom(d.value)} placeholder={t('Ex. SOCAPALM SA')} />
            </Field>
            <Field label={t('Pays')} required>
              <Dropdown
                value={pays}
                selectedOptions={[pays]}
                onOptionSelect={(_, d) => d.optionValue && setPays(d.optionValue)}
              >
                {COUNTRIES.map((c) => (
                  <Option key={c} value={c}>{c}</Option>
                ))}
              </Dropdown>
            </Field>
          </FieldRow>
          <FieldRow cols={1}>
            <Field label={t('Chargé de relation')} required hint={t('Utilisateur interne responsable du tiers')}>
              <Dropdown
                placeholder={t('Sélectionner un chargé')}
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
          <Field label={t('Niveau de risque estimé')} required>
            <RadioGroup value={risque} onChange={(_, d) => setRisque(d.value as 'Standard' | 'Élevé' | 'Critique')} layout="horizontal">
              <Radio value="Standard" label={t('Standard — chargé conformité')} />
              <Radio value="Élevé" label={t('Élevé — +RCSI')} />
              <Radio value="Critique" label={t('Critique — +Comité (Art. 41-48)')} />
            </RadioGroup>
          </Field>
        </FormSection>

        <FormSection
          title={t('Invitation au tiers')}
          description={t('L’e-mail d’invitation est envoyé immédiatement après création. L’authentification se fait via Azure AD B2C + OTP.')}
        >
          <FieldRow cols={2}>
            <Field label={t('E-mail du contact')} required hint={t('Le tiers reçoit l’invitation sur cette adresse.')}>
              <Input
                type="email"
                value={email}
                onChange={(_, d) => setEmail(d.value)}
                placeholder="conformite@correspondant.com"
              />
            </Field>
            <Field label={t('Note interne (optionnelle)')}>
              <Textarea
                value={note}
                onChange={(_, d) => setNote(d.value)}
                rows={2}
                placeholder={t('Contexte de l’entrée en relation, contact pré-existant, etc.')}
              />
            </Field>
          </FieldRow>
          <div
            style={{
              display: 'flex',
              gap: '10px',
              padding: '12px 14px',
              backgroundColor: '#FAF9F6',
              border: '1px solid #ECEAE4',
              borderRadius: '8px',
            }}
          >
            <CheckmarkCircle20Filled style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '1px' }} />
            <div style={{ fontSize: '12.5px', color: '#525252', lineHeight: 1.5 }}>
              {t('Une fois soumis, le système crée la fiche dans le référentiel, charge la checklist KYC adaptée au type de tiers, et envoie l’e-mail d’invitation avec lien sécurisé (validité 72 h).')}
            </div>
          </div>
        </FormSection>
      </FormDialog>

      {/* Confirm export */}
      <ConfirmActionDialog
        open={confirmExport}
        onOpenChange={setConfirmExport}
        intent="info"
        title={t('Exporter le tableau de bord ?')}
        description={t('L’export inclut les KPI, la distribution des risques et les dossiers récents. Les données sont anonymisées avant export selon la politique RBAC.')}
        confirmLabel={t('Générer l’export')}
        onConfirm={exportAction}
      />
    </div>
  );
}