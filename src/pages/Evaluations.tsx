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
  Edit20Regular,
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
    backgroundColor: '#E30613',
    marginTop: '6px',
    flexShrink: 0,
  },
  ecartTitle: { fontSize: '13px', fontWeight: 600, color: '#A50410', marginBottom: '2px' },
  ecartDetail: { fontSize: '12px', color: '#A50410', lineHeight: 1.5 },
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
  return '#E30613';
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
        <circle cx="48" cy="48" r={r} fill="none" stroke="#E30613" strokeWidth="14" strokeDasharray={`${sNon} ${c - sNon}`} strokeDashoffset={-(sConforme + sAmeliorer)} />
      </g>
      <text x="48" y="50" textAnchor="middle" fontSize="16" fontWeight="700" fill="#1A1A1A">{total}</text>
      <text x="48" y="64" textAnchor="middle" fontSize="9" fill="#767676">évaluations</text>
    </svg>
  );
}

export default function Evaluations() {
  const styles = useStyles();
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

  // Création + listes pour les lookups.
  const createEval = evaluationsPartenaire.useCreate();
  const { data: tiersData } = tiersHooks.useList({ top: 200 });
  const { data: grilleData } = grilleEvaluation.useList({ top: 200 });
  const { data: userData } = utilisateursInternes.useList({ top: 200 });

  // Données réelles depuis Dataverse (afb_evaluationpartenaire).
  const { data: rawEvals } = evaluationsPartenaire.useList({ top: 200 });
  const evaluations = useMemo(() => (rawEvals ?? []).map(toEvaluation), [rawEvals]);

  const filtered = useMemo(() => {
    return evaluations.filter((e) => {
      if (typeFilter && e.typeEval !== typeFilter) return false;
      if (statutFilter && e.statut !== statutFilter) return false;
      if (search && !e.partenaire.toLowerCase().includes(search.toLowerCase())) return false;
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
      total: { value: total, label: 'Évaluations' },
      conformes: { value: conformes, label: 'Conformes', pct: pct(conformes) },
      ameliorer: { value: ameliorer, label: 'À améliorer', pct: pct(ameliorer) },
      nonConformes: { value: nonConformes, label: 'Non conformes', pct: pct(nonConformes) },
    };
  }, [evaluations]);

  const open = (e: Evaluation) => {
    setOpenEval(e);
    setActiveTab('synthese');
  };

  const resetForm = () => {
    setTiersId('');
    setGrilleId('');
    setEvaluateurId('');
    setTypeEval('SLA');
    setPeriode('semestrielle');
    setDateLimite('');
    setContexte('');
  };

  const submitNew = async () => {
    const ref = `EVAL-${typeEval}-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    // Période évaluée déduite du choix (semestrielle = 6 mois, annuelle = 12 mois).
    const fin = new Date();
    const debut = new Date();
    debut.setMonth(debut.getMonth() - (periode === 'annuelle' ? 12 : periode === 'semestrielle' ? 6 : 1));
    const partenaireNom = tiersData?.find((t) => t.afb_tiersid === tiersId)?.afb_nomdupartenaire ?? 'le tiers';
    try {
      await createEval.mutateAsync({
        afb_referencedevaluation: ref,
        afb_datedevaluation: fin.toISOString(),
        afb_debutdelaperiodeevaluee: debut.toISOString(),
        afb_findelaperiodeevaluee: fin.toISOString(),
        afb_noteglobale: 0,
        afb_notemaximalepossible: 100,
        afb_niveauderisquecalcule: 0, // Faible (initial, avant notation)
        afb_statutdelevaluation: 747010002, // Brouillon
        ...(contexte ? { afb_commentaireglobal: contexte } : {}),
        'afb_tiersevalue@odata.bind': `/afb_tierses(${tiersId})`,
        'afb_grilleutilisee@odata.bind': `/afb_grilleevaluations(${grilleId})`,
        'afb_evaluateur@odata.bind': `/afb_utilisateurinternes(${evaluateurId})`,
      } as unknown as Parameters<typeof createEval.mutateAsync>[0]);

      notifySuccess('Évaluation lancée', {
        description: `${ref} · ${partenaireNom} — créée dans Dataverse (brouillon).`,
      });
      setNewOpen(false);
      resetForm();
    } catch (e) {
      notifySuccess('Création impossible', {
        description: e instanceof Error ? e.message : 'Erreur Dataverse lors de la création de l’évaluation.',
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
        <Badge appearance="tint" color={typeColor(e.typeEval)} size="small">
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
        <Badge appearance="tint" color={statutColor(e.statut)} size="small">
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
          <Tooltip content="Voir l'évaluation" relationship="label">
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
                    Référence: e.id,
                    Partenaire: e.partenaire,
                    Type: e.typeEval,
                    Score: `${e.score}/${e.scoreMax}`,
                    Statut: e.statut,
                    Évaluateur: e.evaluateur,
                    Date: e.date,
                  })),
                );
                notifySuccess(ok ? 'Export généré' : 'Aucune donnée', {
                  description: ok ? `${filtered.length} évaluations exportées (CSV).` : 'Aucune évaluation à exporter.',
                });
              }}
            >
              Export
            </Button>
            <Button icon={<Add20Regular />} appearance="primary" onClick={() => setNewOpen(true)}>
              Nouvelle évaluation
            </Button>
          </>
        }
      />

      <div className={styles.kpiRow}>
        <div className={styles.kpi} onClick={() => { setTypeFilter(''); setStatutFilter(''); }}>
          <div className={styles.kpiLabel}>{evalKpis.total.label}</div>
          <div className={styles.kpiValue}>{evalKpis.total.value}</div>
          <div className={styles.kpiMeta}>cumul depuis janvier</div>
        </div>
        <div className={styles.kpi} onClick={() => setStatutFilter('Conforme')}>
          <div className={styles.kpiLabel}>{evalKpis.conformes.label}</div>
          <div className={styles.kpiValue} style={{ color: '#15803D' }}>{evalKpis.conformes.value}</div>
          <div className={styles.kpiMeta}>{evalKpis.conformes.pct}% du total</div>
        </div>
        <div className={styles.kpi} onClick={() => setStatutFilter('À améliorer')}>
          <div className={styles.kpiLabel}>{evalKpis.ameliorer.label}</div>
          <div className={styles.kpiValue} style={{ color: '#B45309' }}>{evalKpis.ameliorer.value}</div>
          <div className={styles.kpiMeta}>{evalKpis.ameliorer.pct}% du total</div>
        </div>
        <div className={styles.kpi} onClick={() => setStatutFilter('Non conforme')}>
          <div className={styles.kpiLabel}>{evalKpis.nonConformes.label}</div>
          <div className={styles.kpiValue} style={{ color: '#E30613' }}>{evalKpis.nonConformes.value}</div>
          <div className={styles.kpiMeta}>{evalKpis.nonConformes.pct}% — escalade</div>
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
                <span className={styles.legendLabel}>Conformes</span>
                <span className={styles.legendValue}>{evalKpis.conformes.value}</span>
              </div>
              <div className={styles.legendRow}>
                <span className={styles.legendDot} style={{ backgroundColor: '#B45309' }} />
                <span className={styles.legendLabel}>À améliorer</span>
                <span className={styles.legendValue}>{evalKpis.ameliorer.value}</span>
              </div>
              <div className={styles.legendRow}>
                <span className={styles.legendDot} style={{ backgroundColor: '#E30613' }} />
                <span className={styles.legendLabel}>Non conformes</span>
                <span className={styles.legendValue}>{evalKpis.nonConformes.value}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card
          flush
          title={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <ClipboardCheckmark20Regular /> Dernières évaluations
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
        eyebrow={`Évaluation · ${openEval?.id ?? ''}`}
        title={openEval?.partenaire ?? ''}
        subtitle={openEval ? `${openEval.typeEval} · évalué par ${openEval.evaluateur}` : ''}
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
          { id: 'synthese', label: 'Synthèse' },
          { id: 'sections', label: 'Réponses' },
          { id: 'ecarts', label: 'Écarts', alertCount: openEval && openEval.statut !== 'Conforme' ? 3 : 0 },
          { id: 'historique', label: 'Historique' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        footer={
          openEval ? (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
              <Button
                appearance="outline"
                icon={<Edit20Regular />}
                onClick={() =>
                  notifyInfo('Modification des réponses', {
                    description: 'Ouverture du formulaire en mode édition — les modifications seront tracées dans l’historique.',
                  })
                }
              >
                Modifier les réponses
              </Button>
              <Button
                appearance="primary"
                icon={<ArrowDownload20Regular />}
                onClick={() => {
                  window.print();
                  notifySuccess('Impression de la fiche', {
                    description: 'Utilisez « Enregistrer au format PDF » dans la boîte d’impression.',
                  });
                }
                }
              >
                Export PDF
              </Button>
            </div>
          ) : null
        }
      >
        {openEval && (
          <>
            {activeTab === 'synthese' && (
              <>
                <DrawerSection title="Score global" description={`Pondération par section — score maximal théorique ${openEval.scoreMax}`}>
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
                        {openEval.score} points sur {openEval.scoreMax} — statut {' '}
                        <strong style={{ color: scoreColor(openEval.score) }}>{openEval.statut}</strong>
                      </div>
                    </div>
                  </div>
                </DrawerSection>

                <DrawerSection title="Informations">
                  <FieldGrid
                    items={[
                      { label: 'Référence', value: openEval.id, mono: true },
                      { label: 'Partenaire', value: openEval.partenaire },
                      { label: 'Type', value: openEval.typeEval },
                      { label: 'Évaluateur', value: openEval.evaluateur },
                      { label: 'Date', value: openEval.date },
                      { label: 'Échéance', value: 'Semestrielle' },
                    ]}
                  />
                </DrawerSection>
              </>
            )}

            {activeTab === 'sections' && (
              <DrawerSection title="Détail par section">
                {[
                  { name: 'Continuité opérationnelle', score: 18, max: 20 },
                  { name: 'Sécurité des données', score: 16, max: 20 },
                  { name: 'Engagement de service (SLA)', score: 19, max: 20 },
                  { name: 'Reporting', score: 14, max: 20 },
                  { name: 'Conformité réglementaire', score: 17, max: 20 },
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
                title="Écarts identifiés"
                description="Points nécessitant un plan d'action — suivi par le chargé de relation."
              >
                {openEval.statut === 'Conforme' ? (
                  <div style={{ fontSize: '13px', color: '#767676', padding: '20px', textAlign: 'center' }}>
                    Aucun écart identifié — évaluation conforme.
                  </div>
                ) : (
                  <>
                    <div className={styles.ecart}>
                      <span className={styles.ecartDot} />
                      <div>
                        <div className={styles.ecartTitle}>Reporting mensuel incomplet</div>
                        <div className={styles.ecartDetail}>
                          Indicateurs de qualité manquants sur les 2 derniers trimestres. Plan d'action requis sous 30 jours.
                        </div>
                      </div>
                    </div>
                    <div className={styles.ecart}>
                      <span className={styles.ecartDot} />
                      <div>
                        <div className={styles.ecartTitle}>Politique de sauvegarde non documentée</div>
                        <div className={styles.ecartDetail}>
                          Demander la fourniture du PCA/PRA mis à jour 2026 et la justification des tests de restauration.
                        </div>
                      </div>
                    </div>
                    {openEval.statut === 'Non conforme' && (
                      <div className={styles.ecart}>
                        <span className={styles.ecartDot} />
                        <div>
                          <div className={styles.ecartTitle}>Non-respect des engagements SLA Q1</div>
                          <div className={styles.ecartDetail}>
                            Taux de disponibilité 97.4% contre 99.5% engagé. Escalade comité conformité requise.
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </DrawerSection>
            )}

            {activeTab === 'historique' && (
              <DrawerSection title="Historique de l'évaluation">
                <DrawerTimeline
                  events={[
                    { when: openEval.date, title: 'Évaluation finalisée', detail: `Par ${openEval.evaluateur} — statut ${openEval.statut}` },
                    { when: '20/04/2026', title: 'Réponses soumises par le tiers', detail: 'Toutes les sections complétées' },
                    { when: '05/04/2026', title: 'Évaluation lancée', detail: `Questionnaire affecté avec échéance 30 jours` },
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
        eyebrow="Évaluations"
        title="Lancer une nouvelle évaluation"
        subtitle="Affectez un questionnaire à un partenaire et définissez le périmètre. L'invitation est envoyée immédiatement."
        size="large"
        steps={[{ label: 'Choix' }, { label: 'Configuration' }]}
        validateStep={(s) => (s === 0 ? stepOneValid : true)}
        submitLabel="Lancer l'évaluation"
        onSubmit={submitNew}
      >
        {(step) => (
          <>
            {step === 0 && (
              <FormSection title="Partenaire et questionnaire">
                <FieldRow>
                  <Field label="Partenaire à évaluer" required>
                    <Dropdown
                      placeholder="Sélectionner un tiers"
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
                  <Field label="Type d'évaluation" required>
                    <RadioGroup value={typeEval} onChange={(_, d) => setTypeEval(d.value as 'SLA' | 'OPS' | 'RISK' | 'EXT')}>
                      <Radio value="SLA" label="SLA — Niveau de service" />
                      <Radio value="OPS" label="OPS — Opérations" />
                      <Radio value="RISK" label="RISK — Risques" />
                      <Radio value="EXT" label="EXT — Externalisation" />
                    </RadioGroup>
                  </Field>
                  <Field label="Grille d'évaluation" required>
                    <Dropdown
                      placeholder="Sélectionner une grille"
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
                  <Field label="Évaluateur (DCONF)" required>
                    <Dropdown
                      placeholder="Sélectionner un évaluateur"
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
                <FormSection title="Périmètre temporel">
                  <FieldRow cols={2}>
                    <Field label="Périodicité" required>
                      <Dropdown
                        value={periode}
                        selectedOptions={[periode]}
                        onOptionSelect={(_, d) => setPeriode((d.optionValue ?? 'semestrielle') as 'semestrielle' | 'annuelle' | 'ad-hoc')}
                      >
                        <Option value="semestrielle">Semestrielle</Option>
                        <Option value="annuelle">Annuelle</Option>
                        <Option value="ad-hoc">Ad-hoc — événement déclenchant</Option>
                      </Dropdown>
                    </Field>
                    <Field label="Date limite de réponse">
                      <Input
                        type="date"
                        value={dateLimite}
                        onChange={(_, d) => setDateLimite(d.value)}
                      />
                    </Field>
                  </FieldRow>
                </FormSection>
                <FormSection title="Contexte (optionnel)">
                  <Field label="Note interne pour l'évaluateur">
                    <Textarea
                      value={contexte}
                      onChange={(_, d) => setContexte(d.value)}
                      rows={3}
                      placeholder="Éléments contextuels, périmètre spécifique à approfondir, suite à incident…"
                    />
                  </Field>
                </FormSection>
                <FormSection title="Récapitulatif">
                  <FieldGrid
                    items={[
                      { label: 'Partenaire', value: tiersData?.find((t) => t.afb_tiersid === tiersId)?.afb_nomdupartenaire ?? '—' },
                      { label: 'Type', value: typeEval },
                      { label: 'Grille', value: grilleData?.find((g) => g.afb_grilleevaluationid === grilleId)?.afb_libelleenfrancais ?? '—' },
                      { label: 'Évaluateur', value: userData?.find((u) => u.afb_utilisateurinterneid === evaluateurId)?.afb_nomcomplet ?? '—' },
                      { label: 'Périodicité', value: periode },
                      { label: 'Échéance', value: dateLimite || 'Libre' },
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