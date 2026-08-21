import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { exportToCsv } from '@/lib/exportCsv';
import {
  makeStyles,
  Button,
  Badge,
} from '@fluentui/react-components';
import {
  ArrowDownload20Regular,
} from '@fluentui/react-icons';
import { KPICard } from '@/components/dashboard/KPICard';
import { ProgressionChart } from '@/components/dashboard/ProgressionChart';
import { RiskDistribution } from '@/components/dashboard/RiskDistribution';
import { RecentDossiersTable } from '@/components/dashboard/RecentDossiersTable';
import type { Dossier } from '@/lib/mockData';
import { SLAAlerts } from '@/components/dashboard/SLAAlerts';
import { mockKPIs } from '@/lib/mockData';
import { dossiersKypKys, tiers as tiersHooks, documents as documentsHooks, resultatsScreening, utilisateursInternes } from '@/lib/dataverse/entityHooks';
import { useRoleStore } from '@/store/roleStore';
import { toDossier } from '@/lib/dataverse/dossierMappers';
import { construireProgression } from '@/lib/dashboard/progression';
import { toDocExpiration } from '@/lib/dataverse/documentMappers';
import {
  DetailDrawer,
  DrawerSection,
  FieldGrid,
  DrawerTimeline,
} from '@/components/common/DetailDrawer';
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
    color: 'var(--text)',
    marginBottom: '10px',
    lineHeight: 1.12,
    letterSpacing: '-0.03em',
    margin: 0,
  },
  subtitle: {
    fontSize: '14.5px',
    color: 'var(--text-secondary)',
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
    color: 'var(--text-muted)',
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
      backgroundColor: 'var(--bg)',
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

export default function Dashboard() {
  const styles = useStyles();
  const navigate = useNavigate();
  const can = useRoleStore(s => s.can);
  const { notifySuccess } = useNotifications();
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
  // Serie mensuelle calculee sur les dossiers reels : le graphique affichait
  // jusqu'ici une serie de demonstration sans rapport avec la base.
  const progression = useMemo(
    () => construireProgression((rawDossiers ?? []) as Parameters<typeof construireProgression>[0]),
    [rawDossiers],
  );

  const dossiersEnCours = dossiers.filter((d) => d.statut === 'En revue' || d.statut === 'Brouillon').length;
  const validesCeMois = dossiers.filter((d) => d.statut === 'Validé').length;


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

  const [confirmExport, setConfirmExport] = useState(false);
  const [openDossier, setOpenDossier] = useState<QuickDossier | null>(null);

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
          {/* La création de dossier vit sur la page « Dossiers », qui porte le
              seul formulaire complet. Le raccourci qui existait ici ouvrait un
              second formulaire, aux champs différents — et qui ne demandait pas
              le type de partenaire, d'où des tiers systématiquement classés
              « Partenaire ». */}
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
        <ProgressionChart data={progression} />
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
                    backgroundColor: 'var(--bg)',
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
                <strong style={{ fontSize: '13px', color: 'var(--text)', minWidth: '40px' }}>
                  {openDossier.progression}%
                </strong>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
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