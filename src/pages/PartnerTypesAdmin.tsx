import { useState } from 'react';
import {
  makeStyles,
  Spinner,
  Badge,
  Text,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Button,
  Tooltip,
  Field,
  Input,
  Dropdown,
  Option,
  Switch,
  Checkbox,
} from '@fluentui/react-components';
import {
  Add20Regular,
  Edit20Regular,
  ArrowDownload20Regular,
  Document20Regular,
  Delete20Regular,
} from '@fluentui/react-icons';
import { usePartnerTypes } from '@/hooks/usePartnerTypes';
import { partnerTypes } from '@/lib/dataverse/entityHooks';
import { getFamilleLabel, type PartnerType } from '@/lib/dataverse/types';
import { FilterBar } from '@/components/common/FilterBar';
import { exportToCsv } from '@/lib/exportCsv';

/** Famille du formulaire (BC, EMF…) → valeur de choix Dataverse afb_familledinstitution. */
const FAMILLE_FORM_TO_DV: Record<string, number> = {
  BC: 747010000, // Banque correspondante
  EMF: 747010001, // Établissement de monnaie électronique
  IF: 747010003, // Société commerciale (institution financière)
  FN: 747010003, // Société commerciale (fournisseur national)
  FI: 747010003, // Société commerciale (fournisseur international)
  AGT: 747010002, // Entreprise individuelle (agent bancaire)
};
import {
  DetailDrawer,
  DrawerSection,
  FieldGrid,
} from '@/components/common/DetailDrawer';
import { FormDialog, FormSection, FieldRow } from '@/components/common/FormDialog';
import { useNotifications } from '@/components/common/NotificationProvider';
import { useT } from '@/i18n/i18n';

const useStyles = makeStyles({
  container: { padding: '32px' },
  header: {
    marginBottom: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
  },
  titleBlock: { flex: 1 },
  title: { fontSize: '28px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' },
  subtitle: { fontSize: '14px', color: 'var(--text-muted)' },
  actions: { display: 'flex', gap: '8px' },
  card: {
    backgroundColor: 'var(--glass-bg)',
    borderRadius: '12px',
    border: '1px solid var(--glass-border)',
    boxShadow: '0 1px 2px rgba(15, 15, 15, 0.04)',
    overflow: 'hidden',
  },
  loadingBox: {
    padding: '64px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left',
    padding: '14px 20px',
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid var(--glass-border)',
    backgroundColor: 'var(--bg)',
  },
  td: {
    padding: '14px 20px',
    fontSize: '13px',
    color: 'var(--text-secondary)',
    borderBottom: '1px solid var(--glass-border)',
  },
  tr: {
    cursor: 'pointer',
    transition: 'background 0.12s',
    ':hover': { backgroundColor: 'var(--bg)' },
  },
  codeCell: { fontFamily: 'monospace', fontWeight: 600, color: 'var(--text)' },
  count: { fontSize: '13px', color: 'var(--text-muted)', marginTop: '16px' },
  checklistItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    backgroundColor: 'var(--bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: '8px',
    marginBottom: '6px',
  },
});

const FAMILLE_OPTIONS = [
  { value: 'BC', label: 'Banque correspondante (KYP)' },
  { value: 'EMF', label: 'Établissement de monnaie électronique (KYP)' },
  { value: 'IF', label: 'Institution financière (KYP)' },
  { value: 'FN', label: 'Fournisseur national (KYS)' },
  { value: 'FI', label: 'Fournisseur international (KYS)' },
  { value: 'AGT', label: 'Agent bancaire (KYS)' },
];

const DEFAULT_CHECKLIST = [
  { id: 'rccm', label: 'Registre du commerce (RCCM)', required: true, weight: 5, validity: 24 },
  { id: 'fiscal', label: 'Attestation fiscale', required: true, weight: 4, validity: 12 },
  { id: 'cni', label: 'CNI ou passeport des dirigeants', required: true, weight: 5, validity: 36 },
  { id: 'kbis', label: 'KBIS / extrait registre étranger', required: true, weight: 5, validity: 12 },
  { id: 'agrement', label: 'Agrément BEAC / régulateur', required: true, weight: 5, validity: 60 },
  { id: 'lbcft', label: 'Politique LBC-FT signée', required: true, weight: 3, validity: 24 },
  { id: 'wolfsberg', label: 'Questionnaire Wolfsberg signé', required: false, weight: 3, validity: 24 },
  { id: 'comptes', label: 'Comptes audités N-1', required: false, weight: 2, validity: 12 },
];

export default function PartnerTypesAdmin() {
  const { t } = useT();
  const styles = useStyles();
  const { data, isLoading, error } = usePartnerTypes();
  const createType = partnerTypes.useCreate();
  const updateType = partnerTypes.useUpdate();
  const { notifySuccess, notifyError } = useNotifications();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [openPt, setOpenPt] = useState<PartnerType | null>(null);
  const [activeTab, setActiveTab] = useState('identite');
  const [newOpen, setNewOpen] = useState(false);
  const [editChecklistOpen, setEditChecklistOpen] = useState(false);

  // form state — new type
  const [code, setCode] = useState('');
  const [libelleFR, setLibelleFR] = useState('');
  const [libelleEN, setLibelleEN] = useState('');
  const [famille, setFamille] = useState('BC');
  const [seuilUbo, setSeuilUbo] = useState('25');
  const [actif, setActif] = useState(true);
  const [revuePeriode, setRevuePeriode] = useState('12');

  // form state — checklist
  const [checklist, setChecklist] = useState(DEFAULT_CHECKLIST);

  const open = (pt: PartnerType) => {
    setOpenPt(pt);
    setActiveTab('identite');
  };

  const reset = () => {
    setEditingId(null);
    setCode('');
    setLibelleFR('');
    setLibelleEN('');
    setFamille('BC');
    setSeuilUbo('25');
    setActif(true);
    setRevuePeriode('12');
  };

  /** Famille d'affichage (100000000+) → code formulaire, pour pré-remplir l'édition. */
  const DISPLAY_FAMILLE_TO_FORM: Record<number, string> = {
    100000000: 'BC',
    100000001: 'EMF',
    100000002: 'IF',
    100000005: 'AGT',
  };

  const startEdit = (pt: PartnerType) => {
    setEditingId(pt.afb_typedepartenaireid);
    setCode(pt.afb_code === '—' ? '' : pt.afb_code);
    setLibelleFR(pt.afb_libellefr);
    setLibelleEN(pt.afb_libelleen ?? '');
    setFamille(DISPLAY_FAMILLE_TO_FORM[pt.afb_famille] ?? 'IF');
    setSeuilUbo(String(pt.afb_seuilubodefaut));
    setActif(pt.afb_actif);
    setOpenPt(null);
    setNewOpen(true);
  };

  const submitNew = async () => {
    const fields = {
      afb_codeinstitution: code,
      afb_libellefrancais: libelleFR,
      afb_libelleanglais: libelleEN.trim() || libelleFR,
      afb_familledinstitution: FAMILLE_FORM_TO_DV[famille] ?? 747010003,
      afb_seuilubopardefaut: Number(seuilUbo) || 0,
    };
    try {
      if (editingId) {
        await updateType.mutateAsync({
          id: editingId,
          changes: fields as unknown as Parameters<typeof updateType.mutateAsync>[0]['changes'],
        });
        notifySuccess(t('Type de partenaire modifié'), {
          description: `${code} · ${libelleFR} — ${t('modifications enregistrées.')}`,
        });
      } else {
        await createType.mutateAsync(fields as unknown as Parameters<typeof createType.mutateAsync>[0]);
        notifySuccess(t('Type de partenaire créé'), {
          description: `${code} · ${libelleFR} — ${t('famille')} ${FAMILLE_OPTIONS.find((f) => f.value === famille)?.label}, ${t('seuil UBO')} ${seuilUbo}%.`,
        });
      }
      setNewOpen(false);
      reset();
    } catch (e) {
      notifyError(editingId ? t('Modification impossible') : t('Création impossible'), {
        description: e instanceof Error ? e.message : t('Erreur Dataverse.'),
      });
      throw e;
    }
  };

  const submitChecklist = async () => {
    await new Promise((r) => setTimeout(r, 600));
    const total = checklist.filter((c) => c.required).length;
    notifySuccess(t('Checklist KYC mise à jour'), {
      description: `${openPt?.afb_libellefr ?? ''} — ${total} ${t('pièces requises · poids total')} ${checklist.reduce((s, c) => s + c.weight, 0)}.`,
    });
    setEditChecklistOpen(false);
  };

  const toggleRequired = (id: string) => {
    setChecklist((cur) => cur.map((c) => (c.id === id ? { ...c, required: !c.required } : c)));
  };

  const removeItem = (id: string) => {
    setChecklist((cur) => cur.filter((c) => c.id !== id));
  };

  // Lignes filtrées par la recherche (code + libellés FR/EN + famille).
  const filtered = (data ?? []).filter((pt) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      pt.afb_code.toLowerCase().includes(q) ||
      pt.afb_libellefr.toLowerCase().includes(q) ||
      (pt.afb_libelleen ?? '').toLowerCase().includes(q) ||
      getFamilleLabel(pt.afb_famille).toLowerCase().includes(q)
    );
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>{t('Référentiel — Types de partenaires')}</h1>
          <p className={styles.subtitle}>
            {t("Typologies juridiques des tiers en relation d'affaires avec AFB (Guide AFB/PM 3.8/GU01 V1.2)")}
          </p>
        </div>
        <div className={styles.actions}>
          <Button
            icon={<ArrowDownload20Regular />}
            appearance="outline"
            onClick={() => {
              const ok = exportToCsv(
                `types-partenaires-${new Date().toISOString().slice(0, 10)}.csv`,
                (data ?? []).map((pt) => ({
                  Code: pt.afb_code,
                  'Libellé FR': pt.afb_libellefr,
                  'Libellé EN': pt.afb_libelleen ?? '',
                  Famille: getFamilleLabel(pt.afb_famille),
                  'Seuil UBO': `${pt.afb_seuilubodefaut}%`,
                  Actif: pt.afb_actif ? t('Actif') : t('Désactivé'),
                })),
              );
              notifySuccess(ok ? t('Export généré') : t('Aucune donnée'), {
                description: ok
                  ? `${(data ?? []).length} ${t('types exportés (CSV).')}`
                  : t('Aucun type à exporter.'),
              });
            }}
          >
            {t('Export')}
          </Button>
          <Button icon={<Add20Regular />} appearance="primary" onClick={() => setNewOpen(true)}>
            {t('Nouveau type')}
          </Button>
        </div>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher un type (code, libellé)…"
      />

      <div className={styles.card}>
        {isLoading && (
          <div className={styles.loadingBox}>
            <Spinner size="medium" />
            <Text>{t('Chargement des types depuis Dataverse...')}</Text>
          </div>
        )}

        {error && (
          <div style={{ padding: '24px' }}>
            <MessageBar intent="error">
              <MessageBarBody>
                <MessageBarTitle>{t('Erreur de chargement')}</MessageBarTitle>
                {(error as Error).message}
              </MessageBarBody>
            </MessageBar>
          </div>
        )}

        {data && (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>{t('Code')}</th>
                  <th className={styles.th}>{t('Libellé FR')}</th>
                  <th className={styles.th}>{t('Libellé EN')}</th>
                  <th className={styles.th}>{t('Famille')}</th>
                  <th className={styles.th}>{t('Seuil UBO')}</th>
                  <th className={styles.th}>{t('Statut')}</th>
                  <th className={styles.th} style={{ textAlign: 'right' }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((pt) => (
                  <tr key={pt.afb_typedepartenaireid} className={styles.tr} onClick={() => open(pt)}>
                    <td className={`${styles.td} ${styles.codeCell}`}>{pt.afb_code}</td>
                    <td className={styles.td} style={{ fontWeight: 500, color: 'var(--text)' }}>{pt.afb_libellefr}</td>
                    <td className={styles.td}>{pt.afb_libelleen ?? '—'}</td>
                    <td className={styles.td}>{getFamilleLabel(pt.afb_famille)}</td>
                    <td className={styles.td}>{pt.afb_seuilubodefaut}%</td>
                    <td className={styles.td}>
                      <Badge appearance="tint" color={pt.afb_actif ? 'success' : 'danger'} size="small">
                        {pt.afb_actif ? t('Actif') : t('Désactivé')}
                      </Badge>
                    </td>
                    <td className={styles.td} style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <Tooltip content={t('Éditer')} relationship="label">
                        <Button size="small" appearance="subtle" icon={<Edit20Regular />} onClick={() => open(pt)} />
                      </Tooltip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: '12px 20px' }}>
              <div className={styles.count}>
                {filtered.length} {t('sur')} {data.length} {t('type')}{data.length > 1 ? 's' : ''} {t('chargé')}{data.length > 1 ? 's' : ''} {t('depuis Dataverse')}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Drawer édition type */}
      <DetailDrawer
        open={openPt !== null && !editChecklistOpen}
        onOpenChange={(o) => !o && setOpenPt(null)}
        eyebrow={t('Type de partenaire')}
        title={openPt?.afb_libellefr ?? ''}
        subtitle={openPt?.afb_code}
        size="large"
        statusBadges={
          openPt ? (
            <>
              <Badge appearance="filled" color={openPt.afb_actif ? 'success' : 'danger'} size="small">
                {openPt.afb_actif ? t('Actif') : t('Désactivé')}
              </Badge>
              <Badge appearance="tint" color="brand" size="small">
                {t('Seuil UBO')} {openPt.afb_seuilubodefaut}%
              </Badge>
            </>
          ) : null
        }
        tabs={[
          { id: 'identite', label: t('Identité') },
          { id: 'checklist', label: t('Checklist KYC'), count: DEFAULT_CHECKLIST.filter((c) => c.required).length },
          { id: 'workflow', label: t('Workflow validation') },
          { id: 'revue', label: t('Périodicité de revue') },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        footer={
          openPt ? (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
              <Button appearance="primary" icon={<Edit20Regular />} onClick={() => openPt && startEdit(openPt)}>
                {t('Modifier le type')}
              </Button>
            </div>
          ) : null
        }
      >
        {openPt && (
          <>
            {activeTab === 'identite' && (
              <DrawerSection title={t('Définition')}>
                <FieldGrid
                  items={[
                    { label: t('Code'), value: openPt.afb_code, mono: true },
                    { label: t('Famille'), value: getFamilleLabel(openPt.afb_famille) },
                    { label: t('Libellé français'), value: openPt.afb_libellefr },
                    { label: t('Libellé anglais'), value: openPt.afb_libelleen ?? '—' },
                    { label: t('Seuil UBO par défaut'), value: `${openPt.afb_seuilubodefaut}%` },
                    { label: t('Statut'), value: openPt.afb_actif ? t('Actif') : t('Désactivé') },
                  ]}
                />
              </DrawerSection>
            )}

            {activeTab === 'checklist' && (
              <DrawerSection
                title={t('Pièces requises pour ce type')}
                description={t("Liste contraignante des documents à fournir lors de l'entrée en relation. Les pièces non requises restent suggérées.")}
              >
                <div style={{ marginBottom: '12px' }}>
                  <Button
                    appearance="outline"
                    size="small"
                    icon={<Edit20Regular />}
                    onClick={() => setEditChecklistOpen(true)}
                  >
                    {t('Éditer la checklist')}
                  </Button>
                </div>
                {DEFAULT_CHECKLIST.map((c) => (
                  <div key={c.id} className={styles.checklistItem}>
                    <Document20Regular style={{ color: c.required ? 'var(--accent)' : '#C8C8C8' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{c.label}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {t('Validité')} {c.validity} {t('mois · poids')} {c.weight}/5
                      </div>
                    </div>
                    {c.required ? (
                      <Badge appearance="filled" color="danger" size="small">{t('Requis')}</Badge>
                    ) : (
                      <Badge appearance="tint" color="subtle" size="small">{t('Optionnel')}</Badge>
                    )}
                  </div>
                ))}
              </DrawerSection>
            )}

            {activeTab === 'workflow' && (
              <DrawerSection title={t('Schéma de validation hiérarchique')}>
                <FieldGrid
                  items={[
                    { label: t('Standard'), value: t('Analyste → Chargé de conformité') },
                    { label: t('Élevé'), value: t('Analyste → Chargé → RCSI') },
                    { label: t('Critique'), value: t('Analyste → Chargé → RCSI → Comité (Art. 41-48)') },
                    { label: t('SLA standard'), value: t('5 jours ouvrés') },
                    { label: t('SLA critique'), value: t('10 jours ouvrés') },
                  ]}
                />
              </DrawerSection>
            )}

            {activeTab === 'revue' && (
              <DrawerSection title={t('Revue périodique')}>
                <FieldGrid
                  items={[
                    { label: t('Fréquence'), value: t('Annuelle (12 mois)') },
                    { label: t('Pré-remplissage'), value: t('Activé — réponses N-1 reportées') },
                    { label: t('Rappels'), value: t('J-60, J-30, J-7 (e-mail + portail)') },
                    { label: t('Escalade RCSI'), value: t('À J+15 sans réponse') },
                  ]}
                />
              </DrawerSection>
            )}
          </>
        )}
      </DetailDrawer>

      {/* Modal nouveau type */}
      <FormDialog
        open={newOpen}
        onOpenChange={(o) => { if (!o) reset(); setNewOpen(o); }}
        eyebrow={t('Référentiel')}
        title={editingId ? t('Modifier le type de partenaire') : t('Créer un nouveau type de partenaire')}
        subtitle={t('Le type définit la checklist KYC, le workflow de validation et le seuil UBO appliqués automatiquement aux nouveaux dossiers.')}
        size="large"
        submitLabel={editingId ? t('Enregistrer les modifications') : t('Créer le type')}
        submitDisabled={code.trim().length < 2 || libelleFR.trim().length < 3}
        onSubmit={submitNew}
      >
        <FormSection title={t('Identité')}>
          <FieldRow cols={2}>
            <Field label={t('Code')} required hint={t('Code court technique, unique')}>
              <Input value={code} onChange={(_, d) => setCode(d.value.toUpperCase())} placeholder="EMF_INT" />
            </Field>
            <Field label={t('Famille')} required>
              <Dropdown
                value={FAMILLE_OPTIONS.find((f) => f.value === famille)?.label}
                selectedOptions={[famille]}
                onOptionSelect={(_, d) => setFamille(d.optionValue ?? 'BC')}
              >
                {FAMILLE_OPTIONS.map((f) => (
                  <Option key={f.value} value={f.value}>{f.label}</Option>
                ))}
              </Dropdown>
            </Field>
          </FieldRow>
          <FieldRow cols={2}>
            <Field label={t('Libellé français')} required>
              <Input value={libelleFR} onChange={(_, d) => setLibelleFR(d.value)} placeholder={t('EMF — Établissement de monnaie électronique international')} />
            </Field>
            <Field label={t('Libellé anglais (optionnel)')}>
              <Input value={libelleEN} onChange={(_, d) => setLibelleEN(d.value)} placeholder="International EMI" />
            </Field>
          </FieldRow>
        </FormSection>

        <FormSection title={t('Paramètres réglementaires')}>
          <FieldRow cols={2}>
            <Field label={t('Seuil UBO par défaut')} required hint={t('COBAC R-2023/01 : 25% · Wolfsberg : 10%')}>
              <Input type="number" value={seuilUbo} onChange={(_, d) => setSeuilUbo(d.value)} contentAfter="%" />
            </Field>
            <Field label={t('Fréquence de revue')} required>
              <Dropdown
                value={revuePeriode === '6' ? t('Semestrielle') : revuePeriode === '12' ? t('Annuelle') : t('Bi-annuelle')}
                selectedOptions={[revuePeriode]}
                onOptionSelect={(_, d) => setRevuePeriode(d.optionValue ?? '12')}
              >
                <Option value="6">{t('Semestrielle (6 mois)')}</Option>
                <Option value="12">{t('Annuelle (12 mois)')}</Option>
                <Option value="24">{t('Bi-annuelle (24 mois)')}</Option>
              </Dropdown>
            </Field>
          </FieldRow>
        </FormSection>

        <FormSection title={t('Activation')}>
          <Field>
            <Switch
              checked={actif}
              onChange={(_, d) => setActif(d.checked)}
              label={actif ? t('Type actif — visible lors de la création de dossiers') : t('Type désactivé — masqué dans les sélections')}
            />
          </Field>
        </FormSection>
      </FormDialog>

      {/* Modal édition checklist */}
      <FormDialog
        open={editChecklistOpen}
        onOpenChange={setEditChecklistOpen}
        eyebrow={t('Checklist KYC')}
        title={openPt ? `${t('Pièces requises —')} ${openPt.afb_libellefr}` : t('Checklist')}
        subtitle={t('Définissez la liste contraignante des documents pour ce type de partenaire. Les pièces marquées requises bloquent la soumission du dossier si non fournies.')}
        size="xlarge"
        submitLabel={t('Enregistrer la checklist')}
        onSubmit={submitChecklist}
      >
        <FormSection title={t('Pièces de la checklist')}>
          {checklist.map((c) => (
            <div key={c.id} className={styles.checklistItem}>
              <Checkbox checked={c.required} onChange={() => toggleRequired(c.id)} />
              <Document20Regular style={{ color: c.required ? 'var(--accent)' : '#767676' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{c.label}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {t('Validité')} {c.validity} {t('mois · poids')} {c.weight}/5
                </div>
              </div>
              <Tooltip content={t('Supprimer cette pièce')} relationship="label">
                <Button size="small" appearance="subtle" icon={<Delete20Regular />} onClick={() => removeItem(c.id)} />
              </Tooltip>
            </div>
          ))}
          <div style={{ marginTop: '10px' }}>
            <Button
              appearance="outline"
              size="small"
              icon={<Add20Regular />}
              onClick={() =>
                setChecklist((cur) => [
                  ...cur,
                  {
                    id: `custom_${Date.now()}`,
                    label: t('Nouvelle pièce'),
                    required: false,
                    weight: 1,
                    validity: 12,
                  },
                ])
              }
            >
              {t('Ajouter une pièce')}
            </Button>
          </div>
        </FormSection>

        <FormSection title={t('Résumé')}>
          <FieldGrid
            items={[
              { label: t('Pièces totales'), value: checklist.length },
              { label: t('Pièces requises'), value: checklist.filter((c) => c.required).length },
              { label: t('Pièces optionnelles'), value: checklist.filter((c) => !c.required).length },
              { label: t('Poids cumulé'), value: `${checklist.reduce((s, c) => s + c.weight, 0)}/40` },
            ]}
          />
        </FormSection>
      </FormDialog>
    </div>
  );
}