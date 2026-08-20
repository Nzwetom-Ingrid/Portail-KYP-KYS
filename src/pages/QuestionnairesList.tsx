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
  CheckmarkCircle20Regular,
} from '@fluentui/react-icons';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';
import { FilterBar } from '@/components/common/FilterBar';
import { QuestionnaireResponsesReview } from '@/components/QuestionnaireResponsesReview';
import { DataTable, type Column } from '@/components/common/DataTable';
import { useTableFilters } from '@/lib/tables/useTableFilters';
import { type Questionnaire } from '@/lib/mockData';
import { questionnaires as questionnairesHooks, utilisateursInternes, questionnaireSections, questions as questionsHooks, questionnaireAssignments, tiers as tiersHooks } from '@/lib/dataverse/entityHooks';
import { seedAllQuestionnaires } from '@/lib/dataverse/seedQuestionnaires';
import { assignQuestionnaireToTiers } from '@/lib/dataverse/assignQuestionnaires';
import { getCurrentUser } from '@/lib/auth/currentUserRef';
import { toQuestionnaire } from '@/lib/dataverse/questionnaireMappers';
import { QuestionnaireBuilder } from '@/components/questionnaires/QuestionnaireBuilder';
import { exportToCsv } from '@/lib/exportCsv';
import { useT } from '@/i18n/i18n';

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
import { useRoleStore } from '@/store/roleStore';

const useStyles = makeStyles({
  kpiRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
    marginBottom: '16px',
  },
  kpi: {
    backgroundColor: 'var(--glass-bg)',
    borderRadius: '12px',
    padding: '18px 20px',
    border: '1px solid var(--glass-border)',
    boxShadow: '0 1px 2px rgba(15, 15, 15, 0.04)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    ':hover': { borderTopColor: '#FCE4E6', borderRightColor: '#FCE4E6', borderBottomColor: '#FCE4E6', borderLeftColor: '#FCE4E6'},
  },
  kpiLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '6px',
  },
  kpiValue: { fontSize: '28px', fontWeight: 700, color: 'var(--text)', lineHeight: 1 },
  kpiMeta: { fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' },
  nameCell: { display: 'flex', flexDirection: 'column', gap: '2px' },
  nameTitle: { fontSize: '13px', fontWeight: 600, color: 'var(--text)' },
  nameRef: { fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' },
  rowActions: { display: 'flex', gap: '4px', justifyContent: 'flex-end' },
  section: {
    border: '1px solid var(--glass-border)',
    borderRadius: '8px',
    padding: '14px 16px',
    backgroundColor: 'var(--bg)',
    marginBottom: '10px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
    paddingBottom: '8px',
    borderBottom: '1px solid var(--glass-border)',
  },
  sectionTitle: { fontSize: '13px', fontWeight: 600, color: 'var(--text)' },
  questionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '6px 0',
    fontSize: '12.5px',
    color: 'var(--text-secondary)',
  },
  questionTag: {
    fontSize: '10px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    backgroundColor: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
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
    backgroundColor: 'var(--bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: '6px',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginRight: '6px',
    marginBottom: '6px',
  },
});

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
  const { t } = useT();
  const { notifySuccess, notifyInfo, notifyWarning, notifyError } = useNotifications();

  // Modèles réels depuis Dataverse (afb_questionnaire).
  const { data: rawQ, isLoading, error } = questionnairesHooks.useList({ top: 200 });
  // Comptes réels : questions (via sections) + affectations, par questionnaire.
  const { data: rawSections } = questionnaireSections.useList({ top: 1000 });
  const { data: rawQuestions } = questionsHooks.useList({ top: 2000 });
  const { data: rawAssignments } = questionnaireAssignments.useList({ top: 1000 });
  const counts = useMemo(() => {
    const secToQ = new Map<string, string>();
    for (const s of rawSections ?? []) {
      if (s._afb_questionnaireassocie_value) secToQ.set(s.afb_questionnairesectionid, s._afb_questionnaireassocie_value);
    }
    const qCount = new Map<string, number>();
    for (const question of rawQuestions ?? []) {
      const qId = secToQ.get(question._afb_section_value ?? '');
      if (qId) qCount.set(qId, (qCount.get(qId) ?? 0) + 1);
    }
    const aCount = new Map<string, number>();
    for (const a of rawAssignments ?? []) {
      const qId = a._afb_versionduquestionnaire_value;
      if (qId) aCount.set(qId, (aCount.get(qId) ?? 0) + 1);
    }
    return { qCount, aCount };
  }, [rawSections, rawQuestions, rawAssignments]);
  const questionnaires = useMemo(
    () => (rawQ ?? []).map((q) => toQuestionnaire(q, counts.qCount.get(q.afb_questionnaireid) ?? 0, counts.aCount.get(q.afb_questionnaireid) ?? 0)),
    [rawQ, counts],
  );
  const createQuestionnaire = questionnairesHooks.useCreate();
  const updateQuestionnaire = questionnairesHooks.useUpdate();
  const { data: userData } = utilisateursInternes.useList({ top: 200 });
  const [editingQId, setEditingQId] = useState<string | null>(null);

  // Seed (one-off) des questionnaires AML + EXT depuis les définitions PDF.
  const [seeding, setSeeding] = useState(false);
  const runSeed = async () => {
    const auteurGuid =
      getCurrentUser().utilisateurInterneId ?? (userData ?? [])[0]?.afb_utilisateurinterneid;
    if (!auteurGuid) {
      notifyError(t('Seed impossible'), { description: t('Aucun utilisateur interne (auteur) disponible.') });
      return;
    }
    setSeeding(true);
    try {
      const results = await seedAllQuestionnaires(auteurGuid);
      const created = results.filter((r) => r.created);
      const skipped = results.filter((r) => !r.created).map((r) => r.code);
      const totalQ = created.reduce((n, r) => n + r.questions, 0);
      notifySuccess(t('Questionnaires initialisés'), {
        description:
          (created.length
            ? `${created.length} ${t('questionnaire(s) créé(s) ·')} ${totalQ} questions. `
            : '') +
          (skipped.length ? `${t('Déjà présents (ignorés) :')} ${skipped.join(', ')}.` : '').trim(),
      });
    } catch (e) {
      notifyError(t('Seed interrompu'), { description: e instanceof Error ? e.message : t('Erreur Dataverse.') });
    } finally {
      setSeeding(false);
    }
  };
  // Résout le GUID à partir de l'id affiché (code du document).
  const guidByCode = useMemo(
    () => new Map((rawQ ?? []).map((q) => [q.afb_codedudocument ?? q.afb_questionnaireid, q.afb_questionnaireid])),
    [rawQ],
  );
  // KPI toggles : ne garder que les questionnaires effectivement affectés / dotés de questions.
  const [affectesFilter, setAffectesFilter] = useState(false);
  const [avecQuestionsFilter, setAvecQuestionsFilter] = useState(false);
  const [openQ, setOpenQ] = useState<Questionnaire | null>(null);
  const [activeTab, setActiveTab] = useState('apercu');
  const [newOpen, setNewOpen] = useState(false);
  const can = useRoleStore((s) => s.can);
  const canCreate = can('questionnaires.create');
  const canAssign = can('questionnaires.assign');
  const [affectOpen, setAffectOpen] = useState(false);
  const [assignSearch, setAssignSearch] = useState(''); // filtre nom dans l'affectation
  const [assignType, setAssignType] = useState(''); // filtre par type de partenaire
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

  // Vrais tiers Dataverse pour l'affectation manuelle.
  const { data: rawTiers } = tiersHooks.useList({ top: 500 });
  const partnersList = useMemo(
    () =>
      (rawTiers ?? [])
        .map((t) => ({
          id: t.afb_tiersid,
          label: t.afb_nomdupartenaire || '—',
          // Type dérivé : Cible (statut 1), Fournisseur (direction DMG=2), sinon Partenaire.
          type: t.afb_statutdutiers === 1 ? 'Cible' : t.afb_directionporteuse === 2 ? 'Fournisseur' : 'Partenaire',
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [rawTiers],
  );
  // Liste filtrée pour l'affectation (recherche par nom + filtre par type).
  const filteredPartners = useMemo(
    () =>
      partnersList.filter(
        (p) =>
          (!assignType || p.type === assignType) &&
          (!assignSearch || p.label.toLowerCase().includes(assignSearch.toLowerCase())),
      ),
    [partnersList, assignType, assignSearch],
  );


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
        notifySuccess(t('Questionnaire modifié'), { description: `${qNom} ${t('— modifications enregistrées.')}` });
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
        notifySuccess(t('Questionnaire créé'), {
          description: `${qNom} (${qFamille}) ${t('— version 1.0 enregistrée comme brouillon.')}`,
        });
      }
      setNewOpen(false);
      resetNew();
    } catch (e) {
      notifyError(editingQId ? t('Modification impossible') : t('Création impossible'), {
        description: e instanceof Error ? e.message : t('Erreur Dataverse.'),
      });
      throw e;
    }
  };

  // Publie un questionnaire (brouillon/archivé → publié) → devient affectable.
  const [publishing, setPublishing] = useState(false);
  const publishQuestionnaire = async () => {
    if (!openQ) return;
    const guid = guidByCode.get(openQ.id);
    if (!guid) return;
    setPublishing(true);
    try {
      await updateQuestionnaire.mutateAsync({
        id: guid,
        changes: { afb_statutdepublication: 0 } as unknown as Parameters<
          typeof updateQuestionnaire.mutateAsync
        >[0]['changes'],
      });
      notifySuccess(t('Questionnaire publié'), {
        description: `${openQ.nom} ${t('— disponible pour affectation aux partenaires.')}`,
      });
      setOpenQ({ ...openQ, statut: 'Publié' });
    } catch (e) {
      notifyError(t('Publication impossible'), { description: e instanceof Error ? e.message : t('Erreur Dataverse.') });
    } finally {
      setPublishing(false);
    }
  };

  const submitAffectation = async () => {
    if (!openQ) return;
    const guid = guidByCode.get(openQ.id);
    if (!guid) {
      notifyError(t('Affectation impossible'), { description: t('Questionnaire introuvable dans Dataverse.') });
      return;
    }
    try {
      const n = await assignQuestionnaireToTiers(
        guid,
        partenaires,
        Number(echeance) || 30,
        (userData ?? [])[0]?.afb_utilisateurinterneid,
      );
      notifySuccess(t('Affectation enregistrée'), {
        description: n
          ? `${openQ.nom} ${t('affecté à')} ${n} partenaire${n > 1 ? 's' : ''} ${t('— échéance')} ${echeance} ${t('jours.')}`
          : t('Aucune nouvelle affectation (déjà affecté à ces partenaires).'),
      });
      setAffectOpen(false);
      setPartenaires([]);
    } catch (e) {
      notifyError(t('Affectation impossible'), { description: e instanceof Error ? e.message : t('Erreur Dataverse.') });
    }
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
        notifyWarning(t('Questionnaire archivé'), {
          description: `${openQ.nom} ${t("— n'est plus disponible pour de nouvelles affectations.")}`,
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
        notifyInfo(t('Questionnaire dupliqué'), {
          description: `${t('Copie créée —')} "${openQ.nom} (copie)" ${t('— brouillon.')}`,
        });
      }
    } catch (e) {
      notifyError(t('Action impossible'), { description: e instanceof Error ? e.message : t('Erreur Dataverse.') });
      throw e;
    }
    setConfirmIntent(null);
    setOpenQ(null);
  };

  const columns: Column<Questionnaire>[] = [
    {
      key: 'nom',
      header: 'Modèle',
      sortValue: (q) => q.nom, searchValue: (q) => `${q.nom} ${q.id}`,
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
      sortValue: (q) => q.famille, searchValue: (q) => q.famille, filterable: true,
      render: (q) => (
        <Badge appearance="tint" color={familleColor(q.famille)} size="small">
          {q.famille}
        </Badge>
      ),
    },
    { key: 'questions', header: 'Questions', sortValue: (q) => q.nbQuestions, render: (q) => `${q.nbQuestions} ${t('questions')}` },
    {
      key: 'affectations',
      header: 'Affectations',
      sortValue: (q) => q.affectations,
      render: (q) => (
        <span style={{ fontWeight: 600, color: q.affectations > 0 ? '#1A1A1A' : '#C8C8C8' }}>
          {q.affectations}
        </span>
      ),
    },
    {
      key: 'statut',
      header: 'Statut',
      sortValue: (q) => q.statut, searchValue: (q) => q.statut, filterable: true,
      render: (q) => (
        <Badge appearance="tint" color={statutColor(q.statut)} size="small">
          {q.statut}
        </Badge>
      ),
    },
    { key: 'maj', header: 'Dernière MAJ', sortValue: (q) => q.dernierMaj, searchValue: (q) => q.dernierMaj, render: (q) => <span style={{ color: 'var(--text-muted)' }}>{q.dernierMaj}</span> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (q) => (
        <div className={styles.rowActions} onClick={(e) => e.stopPropagation()}>
          <Tooltip content={t('Voir')} relationship="label">
            <Button size="small" appearance="subtle" icon={<Eye20Regular />} onClick={() => open(q)} />
          </Tooltip>
          {canCreate && (
            <Tooltip content={t('Éditer')} relationship="label">
              <Button size="small" appearance="subtle" icon={<Edit20Regular />} onClick={() => startEdit(q)} />
            </Tooltip>
          )}
          {canAssign && (
            <Tooltip content={t('Affecter à un partenaire')} relationship="label">
              <Button
                size="small"
                appearance="subtle"
                icon={<Send20Regular />}
                disabled={q.statut !== 'Publié'}
                onClick={() => { setOpenQ(q); setAffectOpen(true); }}
              />
            </Tooltip>
          )}
        </div>
      ),
    },
  ];
  // Filtres et recherche derives des colonnes (cf. useTableFilters).
  const table = useTableFilters(questionnaires, columns);
  const { search, setSearch } = table;
  const filtered = table.rows;


  return (
    <div>
      <PageHeader
        eyebrow="Évaluations"
        title="Questionnaires"
        subtitle="Bibliothèque de modèles (AML, KYC, EXT, RISK) — Builder no-code et affectations aux partenaires."
        actions={
          <>
            {canCreate && (
              <Button
                appearance="outline"
                disabled={seeding}
                onClick={runSeed}
                title={t('Crée les questionnaires AML + EXT dans Dataverse (une seule fois)')}
              >
                {seeding ? t('Initialisation…') : t('Initialiser AML + EXT')}
              </Button>
            )}
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
                notifySuccess(ok ? t('Export généré') : t('Aucune donnée'), {
                  description: ok ? `${filtered.length} ${t('questionnaires exportés (CSV).')}` : t('Aucun questionnaire à exporter.'),
                });
              }}
            >
              {t('Export')}
            </Button>
            {canCreate && (
              <Button icon={<Add20Regular />} appearance="primary" onClick={() => setNewOpen(true)}>
                {t('Nouveau questionnaire')}
              </Button>
            )}
          </>
        }
      />

      <div className={styles.kpiRow}>
        <div className={styles.kpi} onClick={() => table.setFilter('statut', 'Publié')}>
          <div className={styles.kpiLabel}>{t('Modèles publiés')}</div>
          <div className={styles.kpiValue} style={{ color: 'var(--success)' }}>{kpis.publies}</div>
          <div className={styles.kpiMeta}>{t('en production')}</div>
        </div>
        <div
          className={styles.kpi}
          role="button"
          tabIndex={0}
          aria-pressed={affectesFilter}
          onClick={() => setAffectesFilter((cur) => !cur)}
        >
          <div className={styles.kpiLabel}>{t('Affectations actives')}</div>
          <div className={styles.kpiValue}>{kpis.affectations}</div>
          <div className={styles.kpiMeta}>{t('partenaires destinataires')}</div>
        </div>
        <div className={styles.kpi} onClick={() => table.setFilter('statut', 'Brouillon')}>
          <div className={styles.kpiLabel}>{t('Brouillons')}</div>
          <div className={styles.kpiValue} style={{ color: 'var(--warning)' }}>{kpis.brouillons}</div>
          <div className={styles.kpiMeta}>{t('en cours d’édition')}</div>
        </div>
        <div
          className={styles.kpi}
          role="button"
          tabIndex={0}
          aria-pressed={avecQuestionsFilter}
          onClick={() => setAvecQuestionsFilter((cur) => !cur)}
        >
          <div className={styles.kpiLabel}>{t('Questions totales')}</div>
          <div className={styles.kpiValue}>{kpis.questions}</div>
          <div className={styles.kpiMeta}>{t('bibliothèque complète')}</div>
        </div>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher un questionnaire…"
        filters={table.filterConfigs}
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
          <div style={{ padding: '24px', color: 'var(--accent)', fontSize: '13px' }}>
            {t('Erreur de chargement depuis Dataverse :')} {error.message}
          </div>
        ) : isLoading ? (
          <div style={{ padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>{t('Chargement des questionnaires…')}</div>
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
                {openQ.nbQuestions} {t('questions')}
              </Badge>
            </>
          ) : null
        }
        tabs={[
          { id: 'apercu', label: t('Aperçu') },
          { id: 'sections', label: t('Sections'), count: openQ ? (rawSections ?? []).filter((s) => s._afb_questionnaireassocie_value === guidByCode.get(openQ.id)).length : 0 },
          { id: 'affectations', label: t('Affectations'), count: openQ?.affectations ?? 0 },
          { id: 'historique', label: t('Historique') },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        headerActions={
          openQ ? (
            <>
              <Tooltip content={t('Dupliquer')} relationship="label">
                <Button
                  size="small"
                  appearance="subtle"
                  icon={<Copy20Regular />}
                  onClick={() => setConfirmIntent('duplicate')}
                />
              </Tooltip>
              <Tooltip content={t('Archiver')} relationship="label">
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
                {t('Éditer')}
              </Button>
              {openQ.statut !== 'Publié' ? (
                canCreate && (
                  <Button
                    appearance="primary"
                    icon={<CheckmarkCircle20Regular />}
                    disabled={publishing}
                    onClick={publishQuestionnaire}
                  >
                    {publishing ? t('Publication…') : t('Publier')}
                  </Button>
                )
              ) : (
                canAssign && (
                  <Button
                    appearance="primary"
                    icon={<Send20Regular />}
                    onClick={() => setAffectOpen(true)}
                  >
                    {t('Affecter à des partenaires')}
                  </Button>
                )
              )}
            </div>
          ) : null
        }
      >
        {openQ && (
          <>
            {activeTab === 'apercu' && (
              <>
                <DrawerSection title={t('Référence')} description={t('Versionnement strict — toute modification d’un questionnaire publié crée une nouvelle version.')}>
                  <FieldGrid
                    items={[
                      { label: t('Code interne'), value: openQ.id, mono: true },
                      { label: t('Famille'), value: openQ.famille },
                      { label: t('Version'), value: `v${openQ.version}`, mono: true },
                      { label: t('Statut'), value: openQ.statut },
                      { label: t('Dernière MAJ'), value: openQ.dernierMaj },
                      { label: t('Affectations actives'), value: openQ.affectations },
                    ]}
                  />
                </DrawerSection>
                <DrawerSection title={t('Description')}>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                    {openQ.famille === 'AML'
                      ? t('Questionnaire de Lutte contre le Blanchiment et le Financement du Terrorisme — couvre 9 catégories (Wolfsberg, US Patriot Act, FATCA). Aligné sur les exigences COBAC R-2023/01 Art. 41-48 pour les correspondants bancaires transfrontaliers.')
                      : openQ.famille === 'KYC'
                        ? t('Auto-déclaration de la structure actionnariale, des bénéficiaires effectifs, des dirigeants et de l’activité. Base du screening sanctions et PPE.')
                        : openQ.famille === 'EXT'
                          ? t('Évaluation des prestataires externalisés — Règlement COBAC R-2016-04. Aligné sur la Fiche de Contrôle Agent Banking AFB.')
                          : t('Évaluation structurée alignée sur les standards internes AFB.')}
                  </p>
                </DrawerSection>
              </>
            )}

            {activeTab === 'sections' && (
              <DrawerSection
                title={t('Sections et questions')}
                description={t('Construisez le questionnaire : ajoutez/éditez des sections et des questions (type, obligatoire). Les options Oui/Non et C/PC/NC/NA sont créées automatiquement.')}
              >
                <QuestionnaireBuilder questionnaireId={guidByCode.get(openQ.id)} />
              </DrawerSection>
            )}

            {activeTab === 'affectations' && (
              <DrawerSection
                title={t('Réponses par partenaire')}
                description={`${openQ.affectations} ${t('partenaires destinataires — déroulez pour voir les réponses soumises et validez / rejetez')}`}
              >
                <QuestionnaireResponsesReview
                  questionnaireGuid={guidByCode.get(openQ.id)}
                  labelById={new Map(partnersList.map((p) => [p.id, p.label]))}
                  rawAssignments={rawAssignments}
                />
              </DrawerSection>
            )}

            {activeTab === 'historique' && (
              <DrawerSection title={t('Historique des versions')}>
                <DrawerTimeline
                  events={[
                    {
                      when: openQ.dernierMaj,
                      title: `${t('Publication')} v${openQ.version}`,
                      detail: t('Verrouillage pour modification — toute évolution future crée une nouvelle version'),
                    },
                    {
                      when: '02/03/2026',
                      title: t('Révision section LBC-FT'),
                      detail: t('Ajout des questions sur la prolifération et la cartographie des risques'),
                    },
                    {
                      when: '14/01/2026',
                      title: `${t('Création')} v${openQ.version} ${t('(brouillon)')}`,
                      detail: t('Construction initiale par le Super Admin DCONF'),
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
        eyebrow={t('Builder no-code')}
        title={editingQId ? t('Modifier le questionnaire') : t('Nouveau questionnaire')}
        subtitle={t('Construit un questionnaire structuré avec sections, questions et follow-ups conditionnels. Versionnement automatique à la publication.')}
        size="xlarge"
        steps={[
          { label: t('Identité') },
          { label: t('Structure') },
          { label: t('Options') },
        ]}
        validateStep={(step) => {
          if (step === 0) return qNom.trim().length >= 3 && (editingQId !== null || qAuteurId !== '');
          return true;
        }}
        submitLabel={editingQId ? t('Enregistrer les modifications') : t('Créer comme brouillon')}
        onSubmit={submitNew}
      >
        {(step) => (
          <>
            {step === 0 && (
              <FormSection title={t('Identité du questionnaire')}>
                <FieldRow cols={2}>
                  <Field label={t('Famille')} required hint={t('Détermine la catégorie réglementaire')}>
                    <Dropdown
                      value={qFamille}
                      selectedOptions={[qFamille]}
                      onOptionSelect={(_, d) => setQFamille((d.optionValue ?? 'AML') as 'AML' | 'KYC' | 'EXT' | 'RISK' | 'SLA' | 'OPS' | 'LIBRE')}
                    >
                      <Option value="AML">{t('AML — Lutte anti-blanchiment')}</Option>
                      <Option value="KYC">{t('KYC — Auto-déclaration')}</Option>
                      <Option value="EXT">{t('EXT — Activités externalisées')}</Option>
                      <Option value="RISK">{t('RISK — Évaluation des risques')}</Option>
                      <Option value="SLA">{t('SLA — Niveau de service')}</Option>
                      <Option value="OPS">{t('OPS — Opérations et processus')}</Option>
                      <Option value="LIBRE">{t('LIBRE — Ad-hoc')}</Option>
                    </Dropdown>
                  </Field>
                  <Field label={t('Langue(s)')} required>
                    <Dropdown
                      value={qLangue === 'fr' ? t('Français uniquement') : t('Français + Anglais (bilingue)')}
                      selectedOptions={[qLangue]}
                      onOptionSelect={(_, d) => setQLangue((d.optionValue ?? 'fr_en') as 'fr' | 'fr_en')}
                    >
                      <Option value="fr">{t('Français uniquement')}</Option>
                      <Option value="fr_en">{t('Français + Anglais (bilingue)')}</Option>
                    </Dropdown>
                  </Field>
                </FieldRow>
                <FieldRow>
                  <Field label={t('Intitulé')} required>
                    <Input
                      value={qNom}
                      onChange={(_, d) => setQNom(d.value)}
                      placeholder={t('Questionnaire AML AFB — révision 2026')}
                    />
                  </Field>
                </FieldRow>
                <FieldRow>
                  <Field label={t('Auteur')} required hint={t('Utilisateur interne responsable du questionnaire')}>
                    <Dropdown
                      placeholder={t('Sélectionner un auteur')}
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
                  <Field label={t('Description (optionnelle)')}>
                    <Textarea
                      value={qDescription}
                      onChange={(_, d) => setQDescription(d.value)}
                      rows={3}
                      placeholder={t('Finalité, périmètre, base réglementaire…')}
                    />
                  </Field>
                </FieldRow>
              </FormSection>
            )}

            {step === 1 && (
              <>
                <FormSection title={t('Structure de base')}>
                  <Field label={t('Partir d’un modèle existant')} required>
                    <RadioGroup
                      value={qBase}
                      onChange={(_, d) => setQBase(d.value as 'vierge' | 'AML_AFB' | 'AGENT_BANKING' | 'SLA')}
                    >
                      <Radio value="vierge" label={t('Questionnaire vierge — construire de zéro')} />
                      <Radio value="AML_AFB" label={t('Modèle AML AFB révisé v1.2 (9 sections, ~50 questions)')} />
                      <Radio value="AGENT_BANKING" label={t('Modèle Fiche de Contrôle Agent Banking')} />
                      <Radio value="SLA" label={t('Modèle SLA Niveau de service standard')} />
                    </RadioGroup>
                  </Field>
                </FormSection>
                <FormSection title={t('Sections initiales')}>
                  <FieldRow cols={2}>
                    <Field label={t('Nombre de sections à créer')} hint={t('Modifiable ensuite dans l’éditeur')}>
                      <Input
                        type="number"
                        value={qSections}
                        onChange={(_, d) => setQSections(d.value)}
                      />
                    </Field>
                    <Field label={t('Type de questions supportées')} hint={t('10 types disponibles')}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '8px' }}>
                        {['Texte court', 'Texte long', 'Oui/Non', 'Choix unique', 'Choix multiples', 'C/PC/NC/NA', 'Date', 'Numérique', 'Pièce', 'Tableau'].map((qt) => (
                          <span key={qt} className={styles.partnerChip} style={{ marginBottom: 0 }}>
                            {t(qt)}
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
                <FormSection title={t('Options de soumission')}>
                  <Field>
                    <Switch
                      checked={qBilan}
                      onChange={(_, d) => setQBilan(d.checked)}
                      label={t('Pré-remplir automatiquement les réponses lors de la revue annuelle (Prepopulated Answer)')}
                    />
                  </Field>
                  <Field>
                    <Switch
                      checked={qVersioning}
                      onChange={(_, d) => setQVersioning(d.checked)}
                      label={t('Versionnement strict — verrouiller le questionnaire à la publication (Art. 38 R-2023/01)')}
                    />
                  </Field>
                </FormSection>
                <FormSection
                  title={t('Récapitulatif')}
                  description={t('Ce questionnaire sera créé en brouillon. Une fois publié, il sera verrouillé.')}
                >
                  <FieldGrid
                    items={[
                      { label: t('Famille'), value: qFamille },
                      { label: t('Intitulé'), value: qNom || '—' },
                      { label: t('Langue'), value: qLangue === 'fr' ? t('Français') : t('FR + EN') },
                      { label: t('Modèle de base'), value: qBase === 'vierge' ? t('Vierge') : qBase },
                      { label: t('Sections initiales'), value: qSections },
                      { label: t('Pré-remplissage'), value: qBilan ? t('Activé') : t('Désactivé') },
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
        eyebrow={t('Affectation')}
        title={openQ ? `${t('Affecter')} "${openQ.nom}"` : t('Affecter le questionnaire')}
        subtitle={t('Sélectionnez les partenaires destinataires et l’échéance de réponse. Les rappels sont envoyés automatiquement.')}
        size="large"
        submitLabel={`${t('Affecter à')} ${partenaires.length} partenaire${partenaires.length > 1 ? 's' : ''}`}
        submitDisabled={partenaires.length === 0}
        onSubmit={submitAffectation}
      >
        <FormSection title={t('Partenaires destinataires')} description={`${partenaires.length} ${t('sélectionné')}${partenaires.length > 1 ? 's' : ''} · ${filteredPartners.length} ${t('affiché')}${filteredPartners.length > 1 ? 's' : ''} ${t('sur')} ${partnersList.length}`}>
          {/* Filtres : recherche par nom + type de partenaire */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <Input
              placeholder={t('Rechercher un partenaire…')}
              value={assignSearch}
              onChange={(_, d) => setAssignSearch(d.value)}
              style={{ flex: 1, minWidth: 180 }}
            />
            <Dropdown
              placeholder={t('Tous les types')}
              value={assignType || t('Tous les types')}
              selectedOptions={[assignType]}
              onOptionSelect={(_, d) => setAssignType(d.optionValue ?? '')}
              style={{ minWidth: 160 }}
            >
              <Option value="">{t('Tous les types')}</Option>
              <Option value="Partenaire">{t('Partenaire')}</Option>
              <Option value="Fournisseur">{t('Fournisseur')}</Option>
              <Option value="Cible">{t('Cible')}</Option>
            </Dropdown>
            <Button
              size="small"
              appearance="outline"
              onClick={() =>
                setPartenaires((prev) => Array.from(new Set([...prev, ...filteredPartners.map((p) => p.id)])))
              }
            >
              {t('Tout sélectionner')}
            </Button>
            {partenaires.length > 0 && (
              <Button size="small" appearance="subtle" onClick={() => setPartenaires([])}>
                {t('Effacer')}
              </Button>
            )}
          </div>
          <div style={{ display: 'grid', gap: '8px', maxHeight: 340, overflowY: 'auto' }}>
            {filteredPartners.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{t('Aucun partenaire ne correspond au filtre.')}</p>
            )}
            {filteredPartners.map((p) => (
              <label
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '8px',
                  backgroundColor: partenaires.includes(p.id) ? '#FEF2F3' : '#FFFFFF',
                  borderTopColor: partenaires.includes(p.id) ? '#FCE4E6' : '#F4F4F4', borderRightColor: partenaires.includes(p.id) ? '#FCE4E6' : '#F4F4F4', borderBottomColor: partenaires.includes(p.id) ? '#FCE4E6' : '#F4F4F4', borderLeftColor: partenaires.includes(p.id) ? '#FCE4E6' : '#F4F4F4',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: 'var(--text)',
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

        <FormSection title={t('Échéance et rappels')}>
          <FieldRow cols={2}>
            <Field label={t('Délai de réponse (jours)')} required>
              <Input
                type="number"
                value={echeance}
                onChange={(_, d) => setEcheance(d.value)}
                contentAfter={t('jours')}
              />
            </Field>
            <Field label={t('Rappels automatiques')}>
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
              label={t('Inclure automatiquement la déclaration de chaîne UBO si non encore fournie')}
            />
          </Field>
        </FormSection>
      </FormDialog>

      {/* Confirms */}
      <ConfirmActionDialog
        open={confirmIntent === 'archive'}
        onOpenChange={(o) => !o && setConfirmIntent(null)}
        intent="suspend"
        title={t('Archiver ce questionnaire ?')}
        description={t('Le questionnaire archivé ne pourra plus être affecté à de nouveaux partenaires. Les affectations existantes restent accessibles en lecture.')}
        confirmLabel={t('Archiver')}
        requireMotif
        motifLabel={t('Motif d’archivage')}
        motifPlaceholder={t('Remplacement par une nouvelle version, obsolescence réglementaire…')}
        entityRef={openQ?.nom}
        onConfirm={onConfirmAction}
      />
      <ConfirmActionDialog
        open={confirmIntent === 'duplicate'}
        onOpenChange={(o) => !o && setConfirmIntent(null)}
        intent="info"
        title={t('Dupliquer ce questionnaire ?')}
        description={t('Une copie sera créée en brouillon avec une nouvelle référence. Vous pourrez ensuite l’éditer librement sans impacter le questionnaire d’origine.')}
        confirmLabel={t('Dupliquer')}
        entityRef={openQ?.nom}
        onConfirm={onConfirmAction}
      />
    </div>
  );
}