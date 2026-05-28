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
  Switch,
  Checkbox,
} from '@fluentui/react-components';
import {
  Add20Regular,
  ArrowDownload20Regular,
  DocumentBulletList20Regular,
  Edit20Regular,
  Send20Regular,
  Eye20Regular,
  Copy20Regular,
  Archive20Regular,
} from '@fluentui/react-icons';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';
import { FilterBar } from '@/components/common/FilterBar';
import { DataTable, type Column } from '@/components/common/DataTable';
import { type Questionnaire } from '@/lib/mockData';
import { questionnaires as questionnairesHooks, utilisateursInternes } from '@/lib/dataverse/entityHooks';
import { toQuestionnaire } from '@/lib/dataverse/questionnaireMappers';
import { exportToCsv } from '@/lib/exportCsv';

/** Famille (formulaire) → choix Dataverse afb_typededocument. */
const FAMILLE_TO_DV: Record<string, number> = { AML: 0, SLA: 1, KYC: 2, EXT: 3, RISK: 4, OPS: 747010001, LIBRE: 747010002 };
import {
  DetailDrawer,
  DrawerSection,
  FieldGrid,
  DrawerTimeline,
} from '@/components/common/DetailDrawer';
import { FormDialog, FormSection, FieldRow } from '@/components/common/FormDialog';
import { ConfirmActionDialog } from '@/components/common/ConfirmActionDialog';
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
  nameCell: { display: 'flex', flexDirection: 'column', gap: '2px' },
  nameTitle: { fontSize: '13px', fontWeight: 600, color: '#1A1A1A' },
  nameRef: { fontSize: '11px', color: '#767676', fontFamily: 'monospace' },
  rowActions: { display: 'flex', gap: '4px', justifyContent: 'flex-end' },
  section: {
    border: '1px solid #F4F4F4',
    borderRadius: '8px',
    padding: '14px 16px',
    backgroundColor: '#FAFAFA',
    marginBottom: '10px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
    paddingBottom: '8px',
    borderBottom: '1px solid #E5E7EB',
  },
  sectionTitle: { fontSize: '13px', fontWeight: 600, color: '#1A1A1A' },
  questionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '6px 0',
    fontSize: '12.5px',
    color: '#404040',
  },
  questionTag: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#767676',
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E7EB',
    padding: '2px 6px',
    borderRadius: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  partnerChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 8px',
    backgroundColor: '#FAFAFA',
    border: '1px solid #F4F4F4',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#404040',
    marginRight: '6px',
    marginBottom: '6px',
  },
});

const FAMILLE_OPTIONS = [
  { label: 'Toutes familles', value: '' },
  { label: 'AML', value: 'AML' },
  { label: 'KYC', value: 'KYC' },
  { label: 'EXT', value: 'EXT' },
  { label: 'RISK', value: 'RISK' },
];

const STATUT_OPTIONS = [
  { label: 'Tous statuts', value: '' },
  { label: 'Publié', value: 'Publié' },
  { label: 'Brouillon', value: 'Brouillon' },
  { label: 'Archivé', value: 'Archivé' },
];

function familleColor(f: Questionnaire['famille']) {
  if (f === 'AML') return 'danger';
  if (f === 'KYC') return 'brand';
  if (f === 'RISK') return 'warning';
  return 'informative';
}

function statutColor(s: Questionnaire['statut']) {
  if (s === 'Publié') return 'success';
  if (s === 'Brouillon') return 'warning';
  return 'subtle';
}

export default function QuestionnairesList() {
  const styles = useStyles();
  const { notifySuccess, notifyInfo, notifyWarning, notifyError } = useNotifications();

  // Modèles réels depuis Dataverse (afb_questionnaire).
  const { data: rawQ, isLoading, error } = questionnairesHooks.useList({ top: 200 });
  const questionnaires = useMemo(() => (rawQ ?? []).map(toQuestionnaire), [rawQ]);
  const createQuestionnaire = questionnairesHooks.useCreate();
  const updateQuestionnaire = questionnairesHooks.useUpdate();
  const { data: userData } = utilisateursInternes.useList({ top: 200 });
  const [editingQId, setEditingQId] = useState<string | null>(null);
  // Résout le GUID à partir de l'id affiché (code du document).
  const guidByCode = useMemo(
    () => new Map((rawQ ?? []).map((q) => [q.afb_codedudocument ?? q.afb_questionnaireid, q.afb_questionnaireid])),
    [rawQ],
  );

  const [search, setSearch] = useState('');
  const [familleFilter, setFamilleFilter] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [openQ, setOpenQ] = useState<Questionnaire | null>(null);
  const [activeTab, setActiveTab] = useState('apercu');
  const [newOpen, setNewOpen] = useState(false);
  const [affectOpen, setAffectOpen] = useState(false);
  const [confirmIntent, setConfirmIntent] = useState<'archive' | 'duplicate' | null>(null);

  // form Builder state
  const [qFamille, setQFamille] = useState<'AML' | 'KYC' | 'EXT' | 'RISK' | 'SLA' | 'OPS' | 'LIBRE'>('AML');
  const [qNom, setQNom] = useState('');
  const [qAuteurId, setQAuteurId] = useState('');
  const [qBase, setQBase] = useState<'vierge' | 'AML_AFB' | 'AGENT_BANKING' | 'SLA'>('vierge');
  const [qLangue, setQLangue] = useState<'fr' | 'fr_en'>('fr_en');
  const [qSections, setQSections] = useState('9');
  const [qBilan, setQBilan] = useState(true);
  const [qVersioning, setQVersioning] = useState(true);
  const [qDescription, setQDescription] = useState('');

  // form Affectation state
  const [partenaires, setPartenaires] = useState<string[]>([]);
  const [echeance, setEcheance] = useState('30');
  const [rappel30, setRappel30] = useState(true);
  const [rappel7, setRappel7] = useState(true);
  const [rappel1, setRappel1] = useState(true);
  const [autoUbo, setAutoUbo] = useState(true);

  const PARTNERS_PRESET = [
    { id: 'p1', label: 'Citibank N.A. — Branch London' },
    { id: 'p2', label: 'BNP Paribas — Paris' },
    { id: 'p3', label: 'Standard Chartered — UAE' },
    { id: 'p4', label: 'Equity Bank — Kenya' },
    { id: 'p5', label: 'Orange Money — Cameroun' },
  ];

  const filtered = useMemo(() => {
    return questionnaires.filter((q) => {
      if (familleFilter && q.famille !== familleFilter) return false;
      if (statutFilter && q.statut !== statutFilter) return false;
      if (search && !q.nom.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [questionnaires, search, familleFilter, statutFilter]);

  const kpis = {
    publies: questionnaires.filter((q) => q.statut === 'Publié').length,
    affectations: questionnaires.reduce((sum, q) => sum + q.affectations, 0),
    brouillons: questionnaires.filter((q) => q.statut === 'Brouillon').length,
    questions: questionnaires.reduce((sum, q) => sum + q.nbQuestions, 0),
  };

  const open = (q: Questionnaire) => {
    setOpenQ(q);
    setActiveTab('apercu');
  };

  const resetNew = () => {
    setEditingQId(null);
    setQFamille('AML');
    setQNom('');
    setQAuteurId('');
    setQBase('vierge');
    setQLangue('fr_en');
    setQSections('9');
    setQBilan(true);
    setQVersioning(true);
    setQDescription('');
  };

  const startEdit = (q: Questionnaire) => {
    const guid = guidByCode.get(q.id);
    if (!guid) return;
    setEditingQId(guid);
    setQNom(q.nom);
    setQFamille(q.famille);
    setQDescription('');
    setQAuteurId('');
    setOpenQ(null);
    setNewOpen(true);
  };

  const submitNew = async () => {
    try {
      if (editingQId) {
        await updateQuestionnaire.mutateAsync({
          id: editingQId,
          changes: {
            afb_titreenfrancais: qNom,
            afb_titreenanglais: qNom,
            afb_typededocument: FAMILLE_TO_DV[qFamille] ?? 0,
            ...(qDescription ? { afb_descriptionducontenu: qDescription } : {}),
          } as unknown as Parameters<typeof updateQuestionnaire.mutateAsync>[0]['changes'],
        });
        notifySuccess('Questionnaire modifié', { description: `${qNom} — modifications enregistrées.` });
      } else {
        const code = `QST-${String(Math.floor(Math.random() * 9000) + 1000)}`;
        await createQuestionnaire.mutateAsync({
          afb_codedudocument: code,
          afb_titreenfrancais: qNom,
          afb_titreenanglais: qNom,
          afb_typededocument: FAMILLE_TO_DV[qFamille] ?? 0,
          afb_statutdepublication: 1, // Brouillon
          afb_version: 1,
          afb_datedepublication: new Date().toISOString(),
          ...(qDescription ? { afb_descriptionducontenu: qDescription } : {}),
          'afb_auteur@odata.bind': `/afb_utilisateurinternes(${qAuteurId})`,
        } as unknown as Parameters<typeof createQuestionnaire.mutateAsync>[0]);
        notifySuccess('Questionnaire créé', {
          description: `${qNom} (${qFamille}) — version 1.0 enregistrée comme brouillon.`,
        });
      }
      setNewOpen(false);
      resetNew();
    } catch (e) {
      notifyError(editingQId ? 'Modification impossible' : 'Création impossible', {
        description: e instanceof Error ? e.message : 'Erreur Dataverse.',
      });
      throw e;
    }
  };

  const submitAffectation = async () => {
    await new Promise((r) => setTimeout(r, 700));
    notifySuccess('Affectation enregistrée', {
      description: `${openQ?.nom} envoyé à ${partenaires.length} partenaire${partenaires.length > 1 ? 's' : ''} — échéance ${echeance} jours.`,
    });
    setAffectOpen(false);
    setPartenaires([]);
  };

  const togglePartner = (id: string) => {
    setPartenaires((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

  const onConfirmAction = async () => {
    if (!openQ) return;
    const guid = guidByCode.get(openQ.id);
    try {
      if (confirmIntent === 'archive') {
        if (guid) {
          await updateQuestionnaire.mutateAsync({
            id: guid,
            changes: { afb_statutdepublication: 747010001 } as unknown as Parameters<
              typeof updateQuestionnaire.mutateAsync
            >[0]['changes'],
          });
        }
        notifyWarning('Questionnaire archivé', {
          description: `${openQ.nom} — n'est plus disponible pour de nouvelles affectations.`,
        });
      } else if (confirmIntent === 'duplicate') {
        const src = (rawQ ?? []).find((q) => (q.afb_codedudocument ?? q.afb_questionnaireid) === openQ.id);
        const auteurVal = src?._afb_auteur_value;
        const code = `QST-${String(Math.floor(Math.random() * 9000) + 1000)}`;
        await createQuestionnaire.mutateAsync({
          afb_codedudocument: code,
          afb_titreenfrancais: `${openQ.nom} (copie)`,
          afb_titreenanglais: `${openQ.nom} (copie)`,
          afb_typededocument: FAMILLE_TO_DV[qFamille] ?? 0,
          afb_statutdepublication: 1,
          afb_version: 1,
          afb_datedepublication: new Date().toISOString(),
          ...(auteurVal ? { 'afb_auteur@odata.bind': `/afb_utilisateurinternes(${auteurVal})` } : {}),
        } as unknown as Parameters<typeof createQuestionnaire.mutateAsync>[0]);
        notifyInfo('Questionnaire dupliqué', {
          description: `Copie créée — "${openQ.nom} (copie)" — brouillon.`,
        });
      }
    } catch (e) {
      notifyError('Action impossible', { description: e instanceof Error ? e.message : 'Erreur Dataverse.' });
      throw e;
    }
    setConfirmIntent(null);
    setOpenQ(null);
  };

  const columns: Column<Questionnaire>[] = [
    {
      key: 'nom',
      header: 'Modèle',
      render: (q) => (
        <div className={styles.nameCell}>
          <span className={styles.nameTitle}>{q.nom}</span>
          <span className={styles.nameRef}>{q.id} · v{q.version}</span>
        </div>
      ),
    },
    {
      key: 'famille',
      header: 'Famille',
      render: (q) => (
        <Badge appearance="tint" color={familleColor(q.famille)} size="small">
          {q.famille}
        </Badge>
      ),
    },
    { key: 'questions', header: 'Questions', render: (q) => `${q.nbQuestions} questions` },
    {
      key: 'affectations',
      header: 'Affectations',
      render: (q) => (
        <span style={{ fontWeight: 600, color: q.affectations > 0 ? '#1A1A1A' : '#C8C8C8' }}>
          {q.affectations}
        </span>
      ),
    },
    {
      key: 'statut',
      header: 'Statut',
      render: (q) => (
        <Badge appearance="tint" color={statutColor(q.statut)} size="small">
          {q.statut}
        </Badge>
      ),
    },
    { key: 'maj', header: 'Dernière MAJ', render: (q) => <span style={{ color: '#767676' }}>{q.dernierMaj}</span> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (q) => (
        <div className={styles.rowActions} onClick={(e) => e.stopPropagation()}>
          <Tooltip content="Voir" relationship="label">
            <Button size="small" appearance="subtle" icon={<Eye20Regular />} onClick={() => open(q)} />
          </Tooltip>
          <Tooltip content="Éditer" relationship="label">
            <Button size="small" appearance="subtle" icon={<Edit20Regular />} onClick={() => startEdit(q)} />
          </Tooltip>
          <Tooltip content="Affecter à un partenaire" relationship="label">
            <Button
              size="small"
              appearance="subtle"
              icon={<Send20Regular />}
              disabled={q.statut !== 'Publié'}
              onClick={() => { setOpenQ(q); setAffectOpen(true); }}
            />
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Évaluations"
        title="Questionnaires"
        subtitle="Bibliothèque de modèles (AML, KYC, EXT, RISK) — Builder no-code et affectations aux partenaires."
        actions={
          <>
            <Button
              icon={<ArrowDownload20Regular />}
              appearance="outline"
              onClick={() => {
                const ok = exportToCsv(
                  `questionnaires-${new Date().toISOString().slice(0, 10)}.csv`,
                  filtered.map((q) => ({
                    Code: q.id,
                    Nom: q.nom,
                    Famille: q.famille,
                    Version: q.version,
                    Statut: q.statut,
                    'Dernière MAJ': q.dernierMaj,
                  })),
                );
                notifySuccess(ok ? 'Export généré' : 'Aucune donnée', {
                  description: ok ? `${filtered.length} questionnaires exportés (CSV).` : 'Aucun questionnaire à exporter.',
                });
              }}
            >
              Export
            </Button>
            <Button icon={<Add20Regular />} appearance="primary" onClick={() => setNewOpen(true)}>
              Nouveau questionnaire
            </Button>
          </>
        }
      />

      <div className={styles.kpiRow}>
        <div className={styles.kpi} onClick={() => setStatutFilter('Publié')}>
          <div className={styles.kpiLabel}>Modèles publiés</div>
          <div className={styles.kpiValue} style={{ color: '#15803D' }}>{kpis.publies}</div>
          <div className={styles.kpiMeta}>en production</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Affectations actives</div>
          <div className={styles.kpiValue}>{kpis.affectations}</div>
          <div className={styles.kpiMeta}>partenaires destinataires</div>
        </div>
        <div className={styles.kpi} onClick={() => setStatutFilter('Brouillon')}>
          <div className={styles.kpiLabel}>Brouillons</div>
          <div className={styles.kpiValue} style={{ color: '#B45309' }}>{kpis.brouillons}</div>
          <div className={styles.kpiMeta}>en cours d’édition</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Questions totales</div>
          <div className={styles.kpiValue}>{kpis.questions}</div>
          <div className={styles.kpiMeta}>bibliothèque complète</div>
        </div>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher un questionnaire…"
        filters={[
          { key: 'famille', label: 'Famille', value: familleFilter, options: FAMILLE_OPTIONS, onChange: setFamilleFilter },
          { key: 'statut', label: 'Statut', value: statutFilter, options: STATUT_OPTIONS, onChange: setStatutFilter },
        ]}
      />

      <Card
        flush
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <DocumentBulletList20Regular /> Bibliothèque de modèles
          </span>
        }
        subtitle={`${filtered.length} sur ${questionnaires.length} modèles`}
      >
        {error ? (
          <div style={{ padding: '24px', color: '#C20012', fontSize: '13px' }}>
            Erreur de chargement depuis Dataverse : {error.message}
          </div>
        ) : isLoading ? (
          <div style={{ padding: '24px', color: '#767676', fontSize: '13px' }}>Chargement des questionnaires…</div>
        ) : (
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(q) => q.id}
            onRowClick={open}
            emptyMessage="Aucun questionnaire ne correspond aux filtres."
          />
        )}
      </Card>

      {/* Drawer questionnaire */}
      <DetailDrawer
        open={openQ !== null && !affectOpen && confirmIntent === null}
        onOpenChange={(o) => !o && setOpenQ(null)}
        eyebrow={openQ ? `${openQ.famille} · v${openQ.version}` : ''}
        title={openQ?.nom ?? ''}
        subtitle={openQ?.id}
        size="large"
        statusBadges={
          openQ ? (
            <>
              <Badge appearance="filled" color={familleColor(openQ.famille)} size="small">
                {openQ.famille}
              </Badge>
              <Badge appearance="tint" color={statutColor(openQ.statut)} size="small">
                {openQ.statut}
              </Badge>
              <Badge appearance="tint" color="brand" size="small">
                {openQ.nbQuestions} questions
              </Badge>
            </>
          ) : null
        }
        tabs={[
          { id: 'apercu', label: 'Aperçu' },
          { id: 'sections', label: 'Sections', count: 9 },
          { id: 'affectations', label: 'Affectations', count: openQ?.affectations ?? 0 },
          { id: 'historique', label: 'Historique' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        headerActions={
          openQ ? (
            <>
              <Tooltip content="Dupliquer" relationship="label">
                <Button
                  size="small"
                  appearance="subtle"
                  icon={<Copy20Regular />}
                  onClick={() => setConfirmIntent('duplicate')}
                />
              </Tooltip>
              <Tooltip content="Archiver" relationship="label">
                <Button
                  size="small"
                  appearance="subtle"
                  icon={<Archive20Regular />}
                  onClick={() => setConfirmIntent('archive')}
                  disabled={openQ.statut === 'Archivé'}
                />
              </Tooltip>
            </>
          ) : null
        }
        footer={
          openQ ? (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
              <Button appearance="outline" icon={<Edit20Regular />} onClick={() => openQ && startEdit(openQ)}>
                Éditer
              </Button>
              <Button
                appearance="primary"
                icon={<Send20Regular />}
                disabled={openQ.statut !== 'Publié'}
                onClick={() => setAffectOpen(true)}
              >
                Affecter à des partenaires
              </Button>
            </div>
          ) : null
        }
      >
        {openQ && (
          <>
            {activeTab === 'apercu' && (
              <>
                <DrawerSection title="Référence" description="Versionnement strict — toute modification d’un questionnaire publié crée une nouvelle version.">
                  <FieldGrid
                    items={[
                      { label: 'Code interne', value: openQ.id, mono: true },
                      { label: 'Famille', value: openQ.famille },
                      { label: 'Version', value: `v${openQ.version}`, mono: true },
                      { label: 'Statut', value: openQ.statut },
                      { label: 'Dernière MAJ', value: openQ.dernierMaj },
                      { label: 'Affectations actives', value: openQ.affectations },
                    ]}
                  />
                </DrawerSection>
                <DrawerSection title="Description">
                  <p style={{ fontSize: '13px', color: '#404040', lineHeight: 1.6, margin: 0 }}>
                    {openQ.famille === 'AML'
                      ? 'Questionnaire de Lutte contre le Blanchiment et le Financement du Terrorisme — couvre 9 catégories (Wolfsberg, US Patriot Act, FATCA). Aligné sur les exigences COBAC R-2023/01 Art. 41-48 pour les correspondants bancaires transfrontaliers.'
                      : openQ.famille === 'KYC'
                        ? 'Auto-déclaration de la structure actionnariale, des bénéficiaires effectifs, des dirigeants et de l’activité. Base du screening sanctions et PPE.'
                        : openQ.famille === 'EXT'
                          ? 'Évaluation des prestataires externalisés — Règlement COBAC R-2016-04. Aligné sur la Fiche de Contrôle Agent Banking AFB.'
                          : 'Évaluation structurée alignée sur les standards internes AFB.'}
                  </p>
                </DrawerSection>
              </>
            )}

            {activeTab === 'sections' && (
              <DrawerSection
                title="Sections et questions"
                description={`${openQ.nbQuestions} questions réparties en 9 sections — questions de suivi conditionnelles (follow-up) activées.`}
              >
                {[
                  { title: '1. Informations générales', count: 8 },
                  { title: '2. Structure de l’actionnariat', count: 6 },
                  { title: '3. Bénéficiaires effectifs (UBO)', count: 7 },
                  { title: '4. Conseil d’administration', count: 5 },
                  { title: '5. Dirigeants', count: 4 },
                  { title: '6. Responsable conformité', count: 4 },
                  { title: '7. Auditeurs externes', count: 3 },
                  { title: '8. PPE', count: 5 },
                  { title: '9. LBC-FT et prolifération', count: 9 },
                ].map((s) => (
                  <div key={s.title} className={styles.section}>
                    <div className={styles.sectionHeader}>
                      <span className={styles.sectionTitle}>{s.title}</span>
                      <Badge appearance="tint" color="subtle" size="small">
                        {s.count} questions
                      </Badge>
                    </div>
                    <div className={styles.questionRow}>
                      <span className={styles.questionTag}>Texte</span>
                      <span>Quelle est la dénomination sociale complète ?</span>
                    </div>
                    <div className={styles.questionRow}>
                      <span className={styles.questionTag}>Oui/Non</span>
                      <span>L'entité est-elle cotée sur un marché réglementé ?</span>
                    </div>
                    <div className={styles.questionRow}>
                      <span className={styles.questionTag}>Pièce</span>
                      <span>Téléverser le justificatif…</span>
                    </div>
                  </div>
                ))}
              </DrawerSection>
            )}

            {activeTab === 'affectations' && (
              <DrawerSection title="Affectations en cours" description={`${openQ.affectations} partenaires destinataires`}>
                {openQ.affectations === 0 ? (
                  <div style={{ fontSize: '13px', color: '#767676' }}>
                    Aucune affectation active. Cliquez sur "Affecter à des partenaires" pour démarrer.
                  </div>
                ) : (
                  <div>
                    {PARTNERS_PRESET.slice(0, Math.min(openQ.affectations, 5)).map((p) => (
                      <span key={p.id} className={styles.partnerChip}>{p.label}</span>
                    ))}
                  </div>
                )}
              </DrawerSection>
            )}

            {activeTab === 'historique' && (
              <DrawerSection title="Historique des versions">
                <DrawerTimeline
                  events={[
                    {
                      when: openQ.dernierMaj,
                      title: `Publication v${openQ.version}`,
                      detail: 'Verrouillage pour modification — toute évolution future crée une nouvelle version',
                    },
                    {
                      when: '02/03/2026',
                      title: 'Révision section LBC-FT',
                      detail: 'Ajout des questions sur la prolifération et la cartographie des risques',
                    },
                    {
                      when: '14/01/2026',
                      title: `Création v${openQ.version} (brouillon)`,
                      detail: 'Construction initiale par le Super Admin DCONF',
                    },
                  ]}
                />
              </DrawerSection>
            )}
          </>
        )}
      </DetailDrawer>

      {/* Modal Builder questionnaire (multi-step) */}
      <FormDialog
        open={newOpen}
        onOpenChange={(o) => {
          if (!o) resetNew();
          setNewOpen(o);
        }}
        eyebrow="Builder no-code"
        title={editingQId ? 'Modifier le questionnaire' : 'Nouveau questionnaire'}
        subtitle="Construit un questionnaire structuré avec sections, questions et follow-ups conditionnels. Versionnement automatique à la publication."
        size="xlarge"
        steps={[
          { label: 'Identité' },
          { label: 'Structure' },
          { label: 'Options' },
        ]}
        validateStep={(step) => {
          if (step === 0) return qNom.trim().length >= 3 && (editingQId !== null || qAuteurId !== '');
          return true;
        }}
        submitLabel={editingQId ? 'Enregistrer les modifications' : 'Créer comme brouillon'}
        onSubmit={submitNew}
      >
        {(step) => (
          <>
            {step === 0 && (
              <FormSection title="Identité du questionnaire">
                <FieldRow cols={2}>
                  <Field label="Famille" required hint="Détermine la catégorie réglementaire">
                    <Dropdown
                      value={qFamille}
                      selectedOptions={[qFamille]}
                      onOptionSelect={(_, d) => setQFamille((d.optionValue ?? 'AML') as 'AML' | 'KYC' | 'EXT' | 'RISK' | 'SLA' | 'OPS' | 'LIBRE')}
                    >
                      <Option value="AML">AML — Lutte anti-blanchiment</Option>
                      <Option value="KYC">KYC — Auto-déclaration</Option>
                      <Option value="EXT">EXT — Activités externalisées</Option>
                      <Option value="RISK">RISK — Évaluation des risques</Option>
                      <Option value="SLA">SLA — Niveau de service</Option>
                      <Option value="OPS">OPS — Opérations et processus</Option>
                      <Option value="LIBRE">LIBRE — Ad-hoc</Option>
                    </Dropdown>
                  </Field>
                  <Field label="Langue(s)" required>
                    <Dropdown
                      value={qLangue === 'fr' ? 'Français uniquement' : 'Français + Anglais (bilingue)'}
                      selectedOptions={[qLangue]}
                      onOptionSelect={(_, d) => setQLangue((d.optionValue ?? 'fr_en') as 'fr' | 'fr_en')}
                    >
                      <Option value="fr">Français uniquement</Option>
                      <Option value="fr_en">Français + Anglais (bilingue)</Option>
                    </Dropdown>
                  </Field>
                </FieldRow>
                <FieldRow>
                  <Field label="Intitulé" required>
                    <Input
                      value={qNom}
                      onChange={(_, d) => setQNom(d.value)}
                      placeholder="Questionnaire AML AFB — révision 2026"
                    />
                  </Field>
                </FieldRow>
                <FieldRow>
                  <Field label="Auteur" required hint="Utilisateur interne responsable du questionnaire">
                    <Dropdown
                      placeholder="Sélectionner un auteur"
                      value={userData?.find((u) => u.afb_utilisateurinterneid === qAuteurId)?.afb_nomcomplet ?? ''}
                      selectedOptions={qAuteurId ? [qAuteurId] : []}
                      onOptionSelect={(_, d) => setQAuteurId(d.optionValue ?? '')}
                    >
                      {(userData ?? []).map((u) => (
                        <Option key={u.afb_utilisateurinterneid} value={u.afb_utilisateurinterneid}>
                          {u.afb_nomcomplet}
                        </Option>
                      ))}
                    </Dropdown>
                  </Field>
                </FieldRow>
                <FieldRow>
                  <Field label="Description (optionnelle)">
                    <Textarea
                      value={qDescription}
                      onChange={(_, d) => setQDescription(d.value)}
                      rows={3}
                      placeholder="Finalité, périmètre, base réglementaire…"
                    />
                  </Field>
                </FieldRow>
              </FormSection>
            )}

            {step === 1 && (
              <>
                <FormSection title="Structure de base">
                  <Field label="Partir d’un modèle existant" required>
                    <RadioGroup
                      value={qBase}
                      onChange={(_, d) => setQBase(d.value as 'vierge' | 'AML_AFB' | 'AGENT_BANKING' | 'SLA')}
                    >
                      <Radio value="vierge" label="Questionnaire vierge — construire de zéro" />
                      <Radio value="AML_AFB" label="Modèle AML AFB révisé v1.2 (9 sections, ~50 questions)" />
                      <Radio value="AGENT_BANKING" label="Modèle Fiche de Contrôle Agent Banking" />
                      <Radio value="SLA" label="Modèle SLA Niveau de service standard" />
                    </RadioGroup>
                  </Field>
                </FormSection>
                <FormSection title="Sections initiales">
                  <FieldRow cols={2}>
                    <Field label="Nombre de sections à créer" hint="Modifiable ensuite dans l’éditeur">
                      <Input
                        type="number"
                        value={qSections}
                        onChange={(_, d) => setQSections(d.value)}
                      />
                    </Field>
                    <Field label="Type de questions supportées" hint="10 types disponibles">
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '8px' }}>
                        {['Texte court', 'Texte long', 'Oui/Non', 'Choix unique', 'Choix multiples', 'C/PC/NC/NA', 'Date', 'Numérique', 'Pièce', 'Tableau'].map((t) => (
                          <span key={t} className={styles.partnerChip} style={{ marginBottom: 0 }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </Field>
                  </FieldRow>
                </FormSection>
              </>
            )}

            {step === 2 && (
              <>
                <FormSection title="Options de soumission">
                  <Field>
                    <Switch
                      checked={qBilan}
                      onChange={(_, d) => setQBilan(d.checked)}
                      label="Pré-remplir automatiquement les réponses lors de la revue annuelle (Prepopulated Answer)"
                    />
                  </Field>
                  <Field>
                    <Switch
                      checked={qVersioning}
                      onChange={(_, d) => setQVersioning(d.checked)}
                      label="Versionnement strict — verrouiller le questionnaire à la publication (Art. 38 R-2023/01)"
                    />
                  </Field>
                </FormSection>
                <FormSection
                  title="Récapitulatif"
                  description="Ce questionnaire sera créé en brouillon. Une fois publié, il sera verrouillé."
                >
                  <FieldGrid
                    items={[
                      { label: 'Famille', value: qFamille },
                      { label: 'Intitulé', value: qNom || '—' },
                      { label: 'Langue', value: qLangue === 'fr' ? 'Français' : 'FR + EN' },
                      { label: 'Modèle de base', value: qBase === 'vierge' ? 'Vierge' : qBase },
                      { label: 'Sections initiales', value: qSections },
                      { label: 'Pré-remplissage', value: qBilan ? 'Activé' : 'Désactivé' },
                    ]}
                  />
                </FormSection>
              </>
            )}
          </>
        )}
      </FormDialog>

      {/* Modal Affectation */}
      <FormDialog
        open={affectOpen}
        onOpenChange={setAffectOpen}
        eyebrow="Affectation"
        title={openQ ? `Affecter "${openQ.nom}"` : 'Affecter le questionnaire'}
        subtitle="Sélectionnez les partenaires destinataires et l’échéance de réponse. Les rappels sont envoyés automatiquement."
        size="large"
        submitLabel={`Affecter à ${partenaires.length} partenaire${partenaires.length > 1 ? 's' : ''}`}
        submitDisabled={partenaires.length === 0}
        onSubmit={submitAffectation}
      >
        <FormSection title="Partenaires destinataires" description={`${partenaires.length} sélectionné${partenaires.length > 1 ? 's' : ''}`}>
          <div style={{ display: 'grid', gap: '8px' }}>
            {PARTNERS_PRESET.map((p) => (
              <label
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  border: '1px solid #F4F4F4',
                  borderRadius: '8px',
                  backgroundColor: partenaires.includes(p.id) ? '#FEF2F3' : '#FFFFFF',
                  borderTopColor: partenaires.includes(p.id) ? '#FCE4E6' : '#F4F4F4', borderRightColor: partenaires.includes(p.id) ? '#FCE4E6' : '#F4F4F4', borderBottomColor: partenaires.includes(p.id) ? '#FCE4E6' : '#F4F4F4', borderLeftColor: partenaires.includes(p.id) ? '#FCE4E6' : '#F4F4F4',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#1A1A1A',
                }}
              >
                <Checkbox
                  checked={partenaires.includes(p.id)}
                  onChange={() => togglePartner(p.id)}
                />
                <span style={{ flex: 1, fontWeight: 500 }}>{p.label}</span>
              </label>
            ))}
          </div>
        </FormSection>

        <FormSection title="Échéance et rappels">
          <FieldRow cols={2}>
            <Field label="Délai de réponse (jours)" required>
              <Input
                type="number"
                value={echeance}
                onChange={(_, d) => setEcheance(d.value)}
                contentAfter="jours"
              />
            </Field>
            <Field label="Rappels automatiques">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '6px' }}>
                <Checkbox checked={rappel30} onChange={(_, d) => setRappel30(!!d.checked)} label="J-30" />
                <Checkbox checked={rappel7} onChange={(_, d) => setRappel7(!!d.checked)} label="J-7" />
                <Checkbox checked={rappel1} onChange={(_, d) => setRappel1(!!d.checked)} label="J-1" />
              </div>
            </Field>
          </FieldRow>
          <Field>
            <Switch
              checked={autoUbo}
              onChange={(_, d) => setAutoUbo(d.checked)}
              label="Inclure automatiquement la déclaration de chaîne UBO si non encore fournie"
            />
          </Field>
        </FormSection>
      </FormDialog>

      {/* Confirms */}
      <ConfirmActionDialog
        open={confirmIntent === 'archive'}
        onOpenChange={(o) => !o && setConfirmIntent(null)}
        intent="suspend"
        title="Archiver ce questionnaire ?"
        description="Le questionnaire archivé ne pourra plus être affecté à de nouveaux partenaires. Les affectations existantes restent accessibles en lecture."
        confirmLabel="Archiver"
        requireMotif
        motifLabel="Motif d’archivage"
        motifPlaceholder="Remplacement par une nouvelle version, obsolescence réglementaire…"
        entityRef={openQ?.nom}
        onConfirm={onConfirmAction}
      />
      <ConfirmActionDialog
        open={confirmIntent === 'duplicate'}
        onOpenChange={(o) => !o && setConfirmIntent(null)}
        intent="info"
        title="Dupliquer ce questionnaire ?"
        description="Une copie sera créée en brouillon avec une nouvelle référence. Vous pourrez ensuite l’éditer librement sans impacter le questionnaire d’origine."
        confirmLabel="Dupliquer"
        entityRef={openQ?.nom}
        onConfirm={onConfirmAction}
      />
    </div>
  );
}