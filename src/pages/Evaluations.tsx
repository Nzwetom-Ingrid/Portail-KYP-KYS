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
  Textarea,
  Radio,
  RadioGroup,
} from '@fluentui/react-components';
import {
  Add20Regular,
  ArrowDownload20Regular,
  ClipboardCheckmark20Regular,
  Eye20Regular,
  CheckmarkCircle20Regular,
  DismissCircle20Regular,
  ShieldCheckmark20Regular,
  Send20Regular,
} from '@fluentui/react-icons';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';
import { FilterBar } from '@/components/common/FilterBar';
import { DataTable, type Column } from '@/components/common/DataTable';
import { type Evaluation } from '@/lib/mockData';
import { evaluationsPartenaire, tiers as tiersHooks, grilleEvaluation, utilisateursInternes } from '@/lib/dataverse/entityHooks';
import { toEvaluation } from '@/lib/dataverse/evaluationMappers';
import { exportToCsv } from '@/lib/exportCsv';
import {
  DetailDrawer,
  DrawerSection,
  FieldGrid,
  DrawerTimeline,
} from '@/components/common/DetailDrawer';
import { FormDialog, FormSection, FieldRow } from '@/components/common/FormDialog';
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
  kpiValue: { fontSize: '28px', fontWeight: 700, lineHeight: 1 },
  kpiMeta: { fontSize: '12px', color: '#767676', marginTop: '6px' },
  scoreCell: { display: 'flex', alignItems: 'center', gap: '10px' },
  scoreBar: {
    width: '80px',
    height: '6px',
    backgroundColor: '#F4F4F4',
    borderRadius: '999px',
    overflow: 'hidden',
  },
  scoreFill: { height: '100%', borderRadius: '999px' },
  scoreText: { fontWeight: 700, fontSize: '13px', minWidth: '52px' },
  donutContainer: { display: 'flex', alignItems: 'center', gap: '20px' },
  donutLegend: { display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 },
  legendRow: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' },
  legendDot: { width: '12px', height: '12px', borderRadius: '3px', flexShrink: 0 },
  legendLabel: { flex: 1, color: '#404040' },
  legendValue: { fontWeight: 600, color: '#1A1A1A' },
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
  sectionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    backgroundColor: '#FAFAFA',
    border: '1px solid #F4F4F4',
    borderRadius: '8px',
    marginBottom: '6px',
  },
  sectionRowName: { flex: 1, fontSize: '13px', fontWeight: 500, color: '#1A1A1A' },
  ecart: {
    display: 'flex',
    gap: '10px',
    padding: '12px 14px',
    border: '1px solid #FCE4E6',
    backgroundColor: '#FEF2F3',
    borderRadius: '8px',
    marginBottom: '8px',
  },
  ecartDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#c8102e',
    marginTop: '6px',
    flexShrink: 0,
  },
  ecartTitle: { fontSize: '13px', fontWeight: 600, color: '#a30f24', marginBottom: '2px' },
  ecartDetail: { fontSize: '12px', color: '#a30f24', lineHeight: 1.5 },
});

const TYPE_OPTIONS = [
  { label: 'Tous types', value: '' },
  { label: 'SLA', value: 'SLA' },
  { label: 'OPS', value: 'OPS' },
  { label: 'RISK', value: 'RISK' },
  { label: 'EXT', value: 'EXT' },
];

const STATUT_OPTIONS = [
  { label: 'Tous statuts', value: '' },
  { label: 'Conforme', value: 'Conforme' },
  { label: 'À améliorer', value: 'À améliorer' },
  { label: 'Non conforme', value: 'Non conforme' },
];

function scoreColor(score: number) {
  if (score >= 80) return '#15803D';
  if (score >= 60) return '#B45309';
  return '#c8102e';
}

function statutColor(s: Evaluation['statut']) {
  if (s === 'Conforme') return 'success';
  if (s === 'À améliorer') return 'warning';
  return 'danger';
}

function typeColor(t: Evaluation['typeEval']) {
  if (t === 'RISK') return 'danger';
  if (t === 'SLA') return 'brand';
  if (t === 'OPS') return 'informative';
  return 'subtle';
}

function Donut({ conforme, ameliorer, nonConforme }: { conforme: number; ameliorer: number; nonConforme: number }) {
  const { t } = useT();
  const total = conforme + ameliorer + nonConforme;
  const r = 36;
  const c = 2 * Math.PI * r;
  const sConforme = (conforme / total) * c;
  const sAmeliorer = (ameliorer / total) * c;
  const sNon = (nonConforme / total) * c;
  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <circle cx="48" cy="48" r={r} fill="none" stroke="#F4F4F4" strokeWidth="14" />
      <g transform="rotate(-90 48 48)">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#15803D" strokeWidth="14" strokeDasharray={`${sConforme} ${c - sConforme}`} />
        <circle cx="48" cy="48" r={r} fill="none" stroke="#B45309" strokeWidth="14" strokeDasharray={`${sAmeliorer} ${c - sAmeliorer}`} strokeDashoffset={-sConforme} />
        <circle cx="48" cy="48" r={r} fill="none" stroke="#c8102e" strokeWidth="14" strokeDasharray={`${sNon} ${c - sNon}`} strokeDashoffset={-(sConforme + sAmeliorer)} />
      </g>
      <text x="48" y="50" textAnchor="middle" fontSize="16" fontWeight="700" fill="#1A1A1A">{total}</text>
      <text x="48" y="64" textAnchor="middle" fontSize="9" fill="#767676">{t('évaluations')}</text>
    </svg>
  );
}

export default function Evaluations() {
  const styles = useStyles();
  const { t } = useT();
  const { notifySuccess, notifyInfo } = useNotifications();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [openEval, setOpenEval] = useState<Evaluation | null>(null);
  const [activeTab, setActiveTab] = useState('synthese');
  const [newOpen, setNewOpen] = useState(false);

  // form state — lookups GUID
  const [tiersId, setTiersId] = useState('');
  const [grilleId, setGrilleId] = useState('');
  const [evaluateurId, setEvaluateurId] = useState('');
  const [typeEval, setTypeEval] = useState<'SLA' | 'OPS' | 'RISK' | 'EXT'>('SLA');
  const [periode, setPeriode] = useState<'semestrielle' | 'annuelle' | 'ad-hoc'>('semestrielle');
  const [dateLimite, setDateLimite] = useState('');
  const [contexte, setContexte] = useState('');
  // Score attribué par l'évaluateur (0–100).
  const [noteGlobale, setNoteGlobale] = useState('');

  // Création + mutations + listes pour les lookups.
  const createEval = evaluationsPartenaire.useCreate();
  const updateEval = evaluationsPartenaire.useUpdate();
  const updateTiers = tiersHooks.useUpdate();
  const { data: tiersData } = tiersHooks.useList({ top: 200 });
  const { data: grilleData } = grilleEvaluation.useList({ top: 200 });
  const { data: userData } = utilisateursInternes.useList({ top: 200 });

  // Données réelles depuis Dataverse (afb_evaluationpartenaire).
  const { data: rawEvals } = evaluationsPartenaire.useList({ top: 200 });
  const evaluations = useMemo(() => {
    // Résolution des libellés (les *name ne sont pas renvoyés par le SDK).
    const tiersById = new Map((tiersData ?? []).map((t) => [t.afb_tiersid, t.afb_nomdupartenaire ?? '—']));
    const usersById = new Map((userData ?? []).map((u) => [u.afb_utilisateurinterneid, u.afb_nomcomplet ?? '—']));
    return (rawEvals ?? []).map((e) => toEvaluation(e, { tiersById, usersById }));
  }, [rawEvals, tiersData, userData]);

  const filtered = useMemo(() => {
    return evaluations.filter((e) => {
      if (typeFilter && e.typeEval !== typeFilter) return false;
      if (statutFilter && e.statut !== statutFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !e.partenaire.toLowerCase().includes(q) &&
          !e.id.toLowerCase().includes(q) &&
          !e.evaluateur.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [evaluations, search, typeFilter, statutFilter]);

  // KPIs calculés à partir des évaluations réelles (même forme que le mock).
  const evalKpis = useMemo(() => {
    const total = evaluations.length;
    const conformes = evaluations.filter((e) => e.statut === 'Conforme').length;
    const ameliorer = evaluations.filter((e) => e.statut === 'À améliorer').length;
    const nonConformes = evaluations.filter((e) => e.statut === 'Non conforme').length;
    const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
    return {
      total: { value: total, label: t('Évaluations') },
      conformes: { value: conformes, label: t('Conformes'), pct: pct(conformes) },
      ameliorer: { value: ameliorer, label: t('À améliorer'), pct: pct(ameliorer) },
      nonConformes: { value: nonConformes, label: t('Non conformes'), pct: pct(nonConformes) },
    };
  }, [evaluations, t]);

  const open = (e: Evaluation) => {
    setOpenEval(e);
    setActiveTab('synthese');
  };

  const isValidated = (e: Evaluation | null) => !!e?.statutEval && /valid/i.test(e.statutEval);

  // Valide l'évaluation (Brouillon/En revue → Validée) — décision INTERNE.
  // ⚠️ Ne rend PAS l'évaluation visible par le tiers : il faut « Pousser au
  // partenaire » (ci-dessous) pour la publier.
  const validateEval = async () => {
    if (!openEval?.recordId) return;
    try {
      await updateEval.mutateAsync({
        id: openEval.recordId,
        changes: { afb_statutdelevaluation: 0 },
      });
      notifySuccess(t('Évaluation validée'), {
        description: `${openEval.id} — ${openEval.partenaire}. ${t('Validée en interne (non encore visible par le tiers).')}`,
      });
      setOpenEval((prev) => (prev ? { ...prev, statutEval: 'Validée' } : prev));
    } catch (err) {
      notifyInfo(t('Action impossible'), { description: err instanceof Error ? err.message : t('Erreur Dataverse.') });
    }
  };

  // Publie l'évaluation vers l'espace du tiers (« push »). On horodate
  // afb_datedevalidation, utilisée comme date de mise à disposition : le portail
  // ne montre QUE les évaluations validées ET publiées.
  const pushEval = async () => {
    if (!openEval?.recordId) return;
    try {
      await updateEval.mutateAsync({
        id: openEval.recordId,
        changes: { afb_datedevalidation: new Date().toISOString() },
      });
      notifySuccess(t('Évaluation publiée'), {
        description: `${openEval.id} — ${openEval.partenaire}. ${t('Elle est désormais visible dans l\'espace du tiers.')}`,
      });
      setOpenEval((prev) => (prev ? { ...prev, publie: true } : prev));
    } catch (err) {
      notifyInfo(t('Publication impossible'), { description: err instanceof Error ? err.message : t('Erreur Dataverse.') });
    }
  };

  // Décision de partenariat (Maintenir=0 / Sous surveillance=1 / Annuler=2).
  // « Annuler » clôture aussi le tiers (afb_statutdutiers = Clôturé = 747010003).
  const decide = async (value: 0 | 1 | 2, label: string) => {
    if (!openEval?.recordId) return;
    try {
      await updateEval.mutateAsync({
        id: openEval.recordId,
        changes: { afb_decisionpartenariat: value },
      } as unknown as Parameters<typeof updateEval.mutateAsync>[0]);
      if (value === 2 && openEval.tiersId) {
        await updateTiers.mutateAsync({
          id: openEval.tiersId,
          changes: { afb_statutdutiers: 747010003 },
        });
      }
      notifySuccess(`${t('Décision enregistrée —')} ${label}`, {
        description:
          value === 2
            ? `${openEval.partenaire} : ${t('partenariat clôturé. Le tiers en est informé via son espace.')}`
            : `${openEval.partenaire} : ${t('décision')} « ${label} » ${t('communiquée au tiers.')}`,
      });
      setOpenEval((prev) => (prev ? { ...prev, decision: label } : prev));
    } catch (err) {
      notifyInfo(t('Action impossible'), { description: err instanceof Error ? err.message : t('Erreur Dataverse.') });
    }
  };

  const resetForm = () => {
    setTiersId('');
    setGrilleId('');
    setEvaluateurId('');
    setTypeEval('SLA');
    setPeriode('semestrielle');
    setDateLimite('');
    setContexte('');
    setNoteGlobale('');
  };

  const submitNew = async () => {
    const ref = `EVAL-${typeEval}-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    // Période évaluée déduite du choix (semestrielle = 6 mois, annuelle = 12 mois).
    const fin = new Date();
    const debut = new Date();
    debut.setMonth(debut.getMonth() - (periode === 'annuelle' ? 12 : periode === 'semestrielle' ? 6 : 1));
    const partenaireNom = tiersData?.find((ti) => ti.afb_tiersid === tiersId)?.afb_nomdupartenaire ?? t('le tiers');
    try {
      await createEval.mutateAsync({
        afb_referencedevaluation: ref,
        afb_datedevaluation: fin.toISOString(),
        afb_debutdelaperiodeevaluee: debut.toISOString(),
        afb_findelaperiodeevaluee: fin.toISOString(),
        afb_noteglobale: Math.max(0, Math.min(100, Number(noteGlobale) || 0)),
        afb_notemaximalepossible: 100,
        afb_niveauderisquecalcule: 0, // Faible (initial, avant notation)
        afb_statutdelevaluation: 747010002, // Brouillon
        ...(contexte ? { afb_commentaireglobal: contexte } : {}),
        'afb_tiersevalue@odata.bind': `/afb_tierses(${tiersId})`,
        'afb_grilleutilisee@odata.bind': `/afb_grilleevaluations(${grilleId})`,
        'afb_evaluateur@odata.bind': `/afb_utilisateurinternes(${evaluateurId})`,
      } as unknown as Parameters<typeof createEval.mutateAsync>[0]);

      notifySuccess(t('Évaluation lancée'), {
        description: `${ref} · ${partenaireNom} — ${t('créée dans Dataverse (brouillon).')}`,
      });
      setNewOpen(false);
      resetForm();
    } catch (e) {
      notifySuccess(t('Création impossible'), {
        description: e instanceof Error ? e.message : t('Erreur Dataverse lors de la création de l’évaluation.'),
      });
      throw e;
    }
  };

  const stepOneValid = tiersId !== '' && grilleId !== '' && evaluateurId !== '';

  const columns: Column<Evaluation>[] = [
    { key: 'id', header: 'Réf.', render: (e) => <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{e.id}</span> },
    { key: 'partenaire', header: 'Partenaire', render: (e) => <strong style={{ color: '#1A1A1A' }}>{e.partenaire}</strong> },
    {
      key: 'type',
      header: 'Type',
      render: (e) => (
        <Badge appearance="tint" color={typeColor(e.typeEval)} size="small" style={{ whiteSpace: 'nowrap' }}>
          {e.typeEval}
        </Badge>
      ),
    },
    {
      key: 'score',
      header: 'Score',
      render: (e) => {
        const pct = (e.score / e.scoreMax) * 100;
        return (
          <div className={styles.scoreCell}>
            <div className={styles.scoreBar}>
              <div className={styles.scoreFill} style={{ width: `${pct}%`, backgroundColor: scoreColor(e.score) }} />
            </div>
            <span className={styles.scoreText} style={{ color: scoreColor(e.score) }}>
              {e.score}/{e.scoreMax}
            </span>
          </div>
        );
      },
    },
    {
      key: 'statut',
      header: 'Statut',
      render: (e) => (
        <Badge appearance="tint" color={statutColor(e.statut)} size="small" style={{ whiteSpace: 'nowrap' }}>
          {e.statut}
        </Badge>
      ),
    },
    { key: 'evaluateur', header: 'Évaluateur', render: (e) => e.evaluateur },
    { key: 'date', header: 'Date', render: (e) => e.date },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (e) => (
        <div className={styles.rowActions} onClick={(ev) => ev.stopPropagation()}>
          <Tooltip content={t('Voir l\'évaluation')} relationship="label">
            <Button size="small" appearance="subtle" icon={<Eye20Regular />} onClick={() => open(e)} />
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Évaluations"
        title="Évaluations prestataires"
        subtitle="Suivi des évaluations SLA, OPS, RISK et fiches de contrôle Agent Banking — semestrielles et annuelles."
        actions={
          <>
            <Button
              icon={<ArrowDownload20Regular />}
              appearance="outline"
              onClick={() => {
                const ok = exportToCsv(
                  `evaluations-${new Date().toISOString().slice(0, 10)}.csv`,
                  filtered.map((e) => ({
                    [t('Référence')]: e.id,
                    [t('Partenaire')]: e.partenaire,
                    [t('Type')]: e.typeEval,
                    [t('Score')]: `${e.score}/${e.scoreMax}`,
                    [t('Statut')]: e.statut,
                    [t('Évaluateur')]: e.evaluateur,
                    [t('Date')]: e.date,
                  })),
                );
                notifySuccess(ok ? t('Export généré') : t('Aucune donnée'), {
                  description: ok ? `${filtered.length} ${t('évaluations exportées (CSV).')}` : t('Aucune évaluation à exporter.'),
                });
              }}
            >
              {t('Export')}
            </Button>
            <Button icon={<Add20Regular />} appearance="primary" onClick={() => setNewOpen(true)}>
              {t('Nouvelle évaluation')}
            </Button>
          </>
        }
      />

      <div className={styles.kpiRow}>
        <div className={styles.kpi} onClick={() => { setTypeFilter(''); setStatutFilter(''); }}>
          <div className={styles.kpiLabel}>{evalKpis.total.label}</div>
          <div className={styles.kpiValue}>{evalKpis.total.value}</div>
          <div className={styles.kpiMeta}>{t('cumul depuis janvier')}</div>
        </div>
        <div className={styles.kpi} onClick={() => setStatutFilter('Conforme')}>
          <div className={styles.kpiLabel}>{evalKpis.conformes.label}</div>
          <div className={styles.kpiValue} style={{ color: '#15803D' }}>{evalKpis.conformes.value}</div>
          <div className={styles.kpiMeta}>{evalKpis.conformes.pct}% {t('du total')}</div>
        </div>
        <div className={styles.kpi} onClick={() => setStatutFilter('À améliorer')}>
          <div className={styles.kpiLabel}>{evalKpis.ameliorer.label}</div>
          <div className={styles.kpiValue} style={{ color: '#B45309' }}>{evalKpis.ameliorer.value}</div>
          <div className={styles.kpiMeta}>{evalKpis.ameliorer.pct}% {t('du total')}</div>
        </div>
        <div className={styles.kpi} onClick={() => setStatutFilter('Non conforme')}>
          <div className={styles.kpiLabel}>{evalKpis.nonConformes.label}</div>
          <div className={styles.kpiValue} style={{ color: '#c8102e' }}>{evalKpis.nonConformes.value}</div>
          <div className={styles.kpiMeta}>{evalKpis.nonConformes.pct}% {t('— escalade')}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '16px' }}>
        <Card title="Répartition globale" subtitle="Année en cours">
          <div className={styles.donutContainer}>
            <Donut
              conforme={evalKpis.conformes.value}
              ameliorer={evalKpis.ameliorer.value}
              nonConforme={evalKpis.nonConformes.value}
            />
            <div className={styles.donutLegend}>
              <div className={styles.legendRow}>
                <span className={styles.legendDot} style={{ backgroundColor: '#15803D' }} />
                <span className={styles.legendLabel}>{t('Conformes')}</span>
                <span className={styles.legendValue}>{evalKpis.conformes.value}</span>
              </div>
              <div className={styles.legendRow}>
                <span className={styles.legendDot} style={{ backgroundColor: '#B45309' }} />
                <span className={styles.legendLabel}>{t('À améliorer')}</span>
                <span className={styles.legendValue}>{evalKpis.ameliorer.value}</span>
              </div>
              <div className={styles.legendRow}>
                <span className={styles.legendDot} style={{ backgroundColor: '#c8102e' }} />
                <span className={styles.legendLabel}>{t('Non conformes')}</span>
                <span className={styles.legendValue}>{evalKpis.nonConformes.value}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card
          flush
          title={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <ClipboardCheckmark20Regular /> {t('Dernières évaluations')}
            </span>
          }
          subtitle={`${filtered.length} sur ${evaluations.length}`}
        >
          <div style={{ padding: '0 24px 16px' }}>
            <FilterBar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Rechercher un partenaire…"
              filters={[
                { key: 'type', label: 'Type', value: typeFilter, options: TYPE_OPTIONS, onChange: setTypeFilter },
                { key: 'statut', label: 'Statut', value: statutFilter, options: STATUT_OPTIONS, onChange: setStatutFilter },
              ]}
            />
          </div>
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(e) => e.id}
            onRowClick={open}
            emptyMessage="Aucune évaluation ne correspond aux filtres."
          />
        </Card>
      </div>

      {/* Drawer évaluation */}
      <DetailDrawer
        open={openEval !== null}
        onOpenChange={(o) => !o && setOpenEval(null)}
        eyebrow={`${t('Évaluation')} · ${openEval?.id ?? ''}`}
        title={openEval?.partenaire ?? ''}
        subtitle={openEval ? `${openEval.typeEval} · ${t('évalué par')} ${openEval.evaluateur}` : ''}
        size="large"
        statusBadges={
          openEval ? (
            <>
              <Badge appearance="filled" color={typeColor(openEval.typeEval)} size="small">
                {openEval.typeEval}
              </Badge>
              <Badge appearance="tint" color={statutColor(openEval.statut)} size="small">
                {openEval.statut}
              </Badge>
              <Badge appearance="tint" color="brand" size="small">
                {openEval.score}/{openEval.scoreMax}
              </Badge>
            </>
          ) : null
        }
        tabs={[
          { id: 'synthese', label: t('Synthèse') },
          { id: 'sections', label: t('Réponses') },
          { id: 'ecarts', label: t('Écarts'), alertCount: openEval && openEval.statut !== 'Conforme' ? 3 : 0 },
          { id: 'historique', label: t('Historique') },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        footer={
          openEval ? (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%', flexWrap: 'wrap' }}>
              {!isValidated(openEval) ? (
                <Button appearance="primary" icon={<CheckmarkCircle20Regular />} onClick={validateEval}>
                  {t('Valider l\'évaluation')}
                </Button>
              ) : (
                <>
                  {openEval.publie ? (
                    <Button
                      appearance="subtle"
                      icon={<CheckmarkCircle20Regular style={{ color: '#15803D' }} />}
                      disabled
                    >
                      {t('Publié au tiers')}
                    </Button>
                  ) : (
                    <Button appearance="primary" icon={<Send20Regular />} onClick={pushEval}>
                      {t('Pousser au partenaire')}
                    </Button>
                  )}
                  <Button
                    appearance="outline"
                    icon={<CheckmarkCircle20Regular style={{ color: '#15803D' }} />}
                    onClick={() => decide(0, t('Maintenir'))}
                  >
                    {t('Maintenir')}
                  </Button>
                  <Button
                    appearance="outline"
                    icon={<ShieldCheckmark20Regular style={{ color: '#B45309' }} />}
                    onClick={() => decide(1, t('Sous surveillance'))}
                  >
                    {t('Sous surveillance')}
                  </Button>
                  <Button
                    appearance="outline"
                    icon={<DismissCircle20Regular style={{ color: '#c8102e' }} />}
                    onClick={() => decide(2, t('Annuler'))}
                  >
                    {t('Annuler le partenariat')}
                  </Button>
                </>
              )}
              <Button appearance="subtle" icon={<ArrowDownload20Regular />} onClick={() => window.print()}>
                {t('Export PDF')}
              </Button>
            </div>
          ) : null
        }
      >
        {openEval && (
          <>
            {activeTab === 'synthese' && (
              <>
                <DrawerSection title={t('Score global')} description={`${t('Pondération par section — score maximal théorique')} ${openEval.scoreMax}`}>
                  <div className={styles.bigScore}>
                    <div className={styles.bigScoreNumber} style={{ color: scoreColor(openEval.score) }}>
                      {Math.round((openEval.score / openEval.scoreMax) * 100)}%
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className={styles.bigScoreBar}>
                        <div
                          style={{
                            height: '100%',
                            width: `${(openEval.score / openEval.scoreMax) * 100}%`,
                            backgroundColor: scoreColor(openEval.score),
                            borderRadius: '999px',
                          }}
                        />
                      </div>
                      <div style={{ marginTop: '8px', fontSize: '13px', color: '#767676' }}>
                        {openEval.score} {t('points sur')} {openEval.scoreMax} {t('— statut')} {' '}
                        <strong style={{ color: scoreColor(openEval.score) }}>{openEval.statut}</strong>
                      </div>
                    </div>
                  </div>
                </DrawerSection>

                <DrawerSection title={t('Informations')}>
                  <FieldGrid
                    items={[
                      { label: t('Référence'), value: openEval.id, mono: true },
                      { label: t('Partenaire'), value: openEval.partenaire },
                      { label: t('Type'), value: openEval.typeEval },
                      { label: t('Évaluateur'), value: openEval.evaluateur },
                      { label: t('Date'), value: openEval.date },
                      { label: t('Échéance'), value: t('Semestrielle') },
                    ]}
                  />
                </DrawerSection>
              </>
            )}

            {activeTab === 'sections' && (
              <DrawerSection title={t('Détail par section')}>
                {[
                  { name: t('Continuité opérationnelle'), score: 18, max: 20 },
                  { name: t('Sécurité des données'), score: 16, max: 20 },
                  { name: t('Engagement de service (SLA)'), score: 19, max: 20 },
                  { name: t('Reporting'), score: 14, max: 20 },
                  { name: t('Conformité réglementaire'), score: 17, max: 20 },
                ].map((s) => (
                  <div key={s.name} className={styles.sectionRow}>
                    <span className={styles.sectionRowName}>{s.name}</span>
                    <div className={styles.scoreBar} style={{ width: '100px' }}>
                      <div className={styles.scoreFill} style={{ width: `${(s.score / s.max) * 100}%`, backgroundColor: scoreColor(s.score * 5) }} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: scoreColor(s.score * 5), minWidth: '46px', textAlign: 'right' }}>
                      {s.score}/{s.max}
                    </span>
                  </div>
                ))}
              </DrawerSection>
            )}

            {activeTab === 'ecarts' && (
              <DrawerSection
                title={t('Écarts identifiés')}
                description={t('Points nécessitant un plan d\'action — suivi par le chargé de relation.')}
              >
                {openEval.statut === 'Conforme' ? (
                  <div style={{ fontSize: '13px', color: '#767676', padding: '20px', textAlign: 'center' }}>
                    {t('Aucun écart identifié — évaluation conforme.')}
                  </div>
                ) : (
                  <>
                    <div className={styles.ecart}>
                      <span className={styles.ecartDot} />
                      <div>
                        <div className={styles.ecartTitle}>{t('Reporting mensuel incomplet')}</div>
                        <div className={styles.ecartDetail}>
                          {t('Indicateurs de qualité manquants sur les 2 derniers trimestres. Plan d\'action requis sous 30 jours.')}
                        </div>
                      </div>
                    </div>
                    <div className={styles.ecart}>
                      <span className={styles.ecartDot} />
                      <div>
                        <div className={styles.ecartTitle}>{t('Politique de sauvegarde non documentée')}</div>
                        <div className={styles.ecartDetail}>
                          {t('Demander la fourniture du PCA/PRA mis à jour 2026 et la justification des tests de restauration.')}
                        </div>
                      </div>
                    </div>
                    {openEval.statut === 'Non conforme' && (
                      <div className={styles.ecart}>
                        <span className={styles.ecartDot} />
                        <div>
                          <div className={styles.ecartTitle}>{t('Non-respect des engagements SLA Q1')}</div>
                          <div className={styles.ecartDetail}>
                            {t('Taux de disponibilité 97.4% contre 99.5% engagé. Escalade comité conformité requise.')}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </DrawerSection>
            )}

            {activeTab === 'historique' && (
              <DrawerSection title={t('Historique de l\'évaluation')}>
                <DrawerTimeline
                  events={[
                    { when: openEval.date, title: t('Évaluation finalisée'), detail: `${t('Par')} ${openEval.evaluateur} ${t('— statut')} ${openEval.statut}` },
                    { when: '20/04/2026', title: t('Réponses soumises par le tiers'), detail: t('Toutes les sections complétées') },
                    { when: '05/04/2026', title: t('Évaluation lancée'), detail: t('Questionnaire affecté avec échéance 30 jours') },
                  ]}
                />
              </DrawerSection>
            )}
          </>
        )}
      </DetailDrawer>

      {/* Modal nouvelle évaluation */}
      <FormDialog
        open={newOpen}
        onOpenChange={(o) => { if (!o) resetForm(); setNewOpen(o); }}
        eyebrow={t('Évaluations')}
        title={t('Lancer une nouvelle évaluation')}
        subtitle={t('Affectez un questionnaire à un partenaire et définissez le périmètre. L\'invitation est envoyée immédiatement.')}
        size="large"
        steps={[{ label: t('Choix') }, { label: t('Configuration') }]}
        validateStep={(s) => (s === 0 ? stepOneValid : true)}
        submitLabel={t('Lancer l\'évaluation')}
        onSubmit={submitNew}
      >
        {(step) => (
          <>
            {step === 0 && (
              <FormSection title={t('Partenaire et questionnaire')}>
                <FieldRow>
                  <Field label={t('Partenaire à évaluer')} required>
                    <Dropdown
                      placeholder={t('Sélectionner un tiers')}
                      value={tiersData?.find((t) => t.afb_tiersid === tiersId)?.afb_nomdupartenaire ?? ''}
                      selectedOptions={tiersId ? [tiersId] : []}
                      onOptionSelect={(_, d) => d.optionValue && setTiersId(d.optionValue)}
                    >
                      {(tiersData ?? []).map((t) => (
                        <Option key={t.afb_tiersid} value={t.afb_tiersid}>
                          {t.afb_nomdupartenaire ?? t.afb_tiersid}
                        </Option>
                      ))}
                    </Dropdown>
                  </Field>
                </FieldRow>
                <FieldRow cols={2}>
                  <Field label={t('Type d\'évaluation')} required>
                    <RadioGroup value={typeEval} onChange={(_, d) => setTypeEval(d.value as 'SLA' | 'OPS' | 'RISK' | 'EXT')}>
                      <Radio value="SLA" label={t('SLA — Niveau de service')} />
                      <Radio value="OPS" label={t('OPS — Opérations')} />
                      <Radio value="RISK" label={t('RISK — Risques')} />
                      <Radio value="EXT" label={t('EXT — Externalisation')} />
                    </RadioGroup>
                  </Field>
                  <Field label={t('Grille d\'évaluation')} required>
                    <Dropdown
                      placeholder={t('Sélectionner une grille')}
                      value={grilleData?.find((g) => g.afb_grilleevaluationid === grilleId)?.afb_libelleenfrancais ?? ''}
                      selectedOptions={grilleId ? [grilleId] : []}
                      onOptionSelect={(_, d) => d.optionValue && setGrilleId(d.optionValue)}
                    >
                      {(grilleData ?? []).map((g) => (
                        <Option key={g.afb_grilleevaluationid} value={g.afb_grilleevaluationid}>
                          {g.afb_libelleenfrancais ?? g.afb_grilleevaluationid}
                        </Option>
                      ))}
                    </Dropdown>
                  </Field>
                </FieldRow>
                <FieldRow>
                  <Field label={t('Évaluateur (DCONF)')} required>
                    <Dropdown
                      placeholder={t('Sélectionner un évaluateur')}
                      value={userData?.find((u) => u.afb_utilisateurinterneid === evaluateurId)?.afb_nomcomplet ?? ''}
                      selectedOptions={evaluateurId ? [evaluateurId] : []}
                      onOptionSelect={(_, d) => d.optionValue && setEvaluateurId(d.optionValue)}
                    >
                      {(userData ?? []).map((u) => (
                        <Option key={u.afb_utilisateurinterneid} value={u.afb_utilisateurinterneid}>
                          {u.afb_nomcomplet}
                        </Option>
                      ))}
                    </Dropdown>
                  </Field>
                </FieldRow>
              </FormSection>
            )}

            {step === 1 && (
              <>
                <FormSection title={t('Périmètre temporel')}>
                  <FieldRow cols={2}>
                    <Field label={t('Périodicité')} required>
                      <Dropdown
                        value={periode}
                        selectedOptions={[periode]}
                        onOptionSelect={(_, d) => setPeriode((d.optionValue ?? 'semestrielle') as 'semestrielle' | 'annuelle' | 'ad-hoc')}
                      >
                        <Option value="semestrielle">{t('Semestrielle')}</Option>
                        <Option value="annuelle">{t('Annuelle')}</Option>
                        <Option value="ad-hoc">{t('Ad-hoc — événement déclenchant')}</Option>
                      </Dropdown>
                    </Field>
                    <Field label={t('Date limite de réponse')}>
                      <Input
                        type="date"
                        value={dateLimite}
                        onChange={(_, d) => setDateLimite(d.value)}
                      />
                    </Field>
                  </FieldRow>
                </FormSection>
                <FormSection title={t('Notation')}>
                  <Field label={t('Score global attribué par l\'évaluateur (sur 100)')} required>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={noteGlobale}
                      onChange={(_, d) => setNoteGlobale(d.value)}
                      placeholder={t('Ex. 85 — détermine le statut (≥80 Conforme, ≥60 À améliorer, sinon Non conforme)')}
                    />
                  </Field>
                </FormSection>
                <FormSection title={t('Contexte (optionnel)')}>
                  <Field label={t('Avis / note pour le partenaire et l\'évaluateur')}>
                    <Textarea
                      value={contexte}
                      onChange={(_, d) => setContexte(d.value)}
                      rows={3}
                      placeholder={t('Éléments contextuels, avis communiqué au partenaire, points à approfondir…')}
                    />
                  </Field>
                </FormSection>
                <FormSection title={t('Récapitulatif')}>
                  <FieldGrid
                    items={[
                      { label: t('Partenaire'), value: tiersData?.find((ti) => ti.afb_tiersid === tiersId)?.afb_nomdupartenaire ?? '—' },
                      { label: t('Type'), value: typeEval },
                      { label: t('Grille'), value: grilleData?.find((g) => g.afb_grilleevaluationid === grilleId)?.afb_libelleenfrancais ?? '—' },
                      { label: t('Évaluateur'), value: userData?.find((u) => u.afb_utilisateurinterneid === evaluateurId)?.afb_nomcomplet ?? '—' },
                      { label: t('Périodicité'), value: periode },
                      { label: t('Échéance'), value: dateLimite || t('Libre') },
                      { label: t('Score attribué'), value: noteGlobale ? `${noteGlobale}/100` : '—' },
                    ]}
                  />
                </FormSection>
              </>
            )}
          </>
        )}
      </FormDialog>
    </div>
  );
}