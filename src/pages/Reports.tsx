import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  makeStyles,
  Field,
  Input,
  Dropdown,
  Option,
} from '@fluentui/react-components';
import {
  ArrowDownload20Regular,
  ChartMultiple20Regular,
  DocumentPdf20Regular,
  Document20Regular,
  PeopleTeam20Regular,
  Play20Regular,
  ShieldCheckmark20Regular,
  Branch20Regular,
} from '@fluentui/react-icons';
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';
import { FilterBar } from '@/components/common/FilterBar';
import { DataTable, type Column } from '@/components/common/DataTable';
import { exportToCsv } from '@/lib/exportCsv';
import { FormDialog, FormSection, FieldRow } from '@/components/common/FormDialog';
import { useNotifications } from '@/components/common/NotificationProvider';
import {
  tiers as tiersHooks,
  documents as documentsHooks,
  ubo as uboHooks,
  resultatsScreening,
  dossiersKypKys,
} from '@/lib/dataverse/entityHooks';
import { toPartenaire } from '@/lib/dataverse/tiersMappers';
import { toDocExpiration } from '@/lib/dataverse/documentMappers';
import { toUBO } from '@/lib/dataverse/uboMappers';
import { toScreeningAlert } from '@/lib/dataverse/screeningMappers';
import { useT } from '@/i18n/i18n';

const useStyles = makeStyles({
  templateGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '14px',
    marginBottom: '16px',
  },
  template: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #F4F4F4',
    boxShadow: '0 1px 2px rgba(15, 15, 15, 0.04)',
    transition: 'all 0.15s',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    ':hover': {
      borderTopColor: '#c8102e', borderRightColor: '#c8102e', borderBottomColor: '#c8102e', borderLeftColor: '#c8102e',
      backgroundColor: '#FEF2F3',
    },
  },
  templateIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: '#FCE4E6',
    color: '#c8102e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
  },
  templateTitle: { fontSize: '14px', fontWeight: 600, color: '#1A1A1A' },
  templateDesc: { fontSize: '12px', color: '#767676', lineHeight: 1.5, flex: 1 },
  templateAction: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#c8102e',
    marginTop: '4px',
  },
  nameCell: { display: 'flex', flexDirection: 'column' },
  nameTitle: { fontSize: '13px', fontWeight: 600, color: '#1A1A1A' },
  nameRef: { fontSize: '11px', color: '#767676', fontFamily: 'monospace' },
});

/** Modèles de rapports — chacun lit une table Dataverse réelle. */
const TEMPLATES = [
  { id: 'partners',  nom: 'Synthèse des partenaires',       type: 'Synthèse',     icon: 'people',   description: 'Liste des tiers : type juridique, pays, niveau de risque, direction porteuse.' },
  { id: 'docs',      nom: 'État documentaire',              type: 'Documentaire', icon: 'document', description: 'Pièces déposées : catégorie, référence, dates d’émission/expiration, statut.' },
  { id: 'ubo',       nom: 'Bénéficiaires effectifs (UBO)',  type: 'UBO',          icon: 'branch',   description: 'Chaîne de détention déclarée : %, nature du contrôle, PPE, statut de validation.' },
  { id: 'screening', nom: 'Résultats de screening',         type: 'Screening',    icon: 'shield',   description: 'Contrôles sanctions / PPE : cible, source, date de détection, statut.' },
  { id: 'dossiers',  nom: 'Suivi des dossiers KYP/KYS',     type: 'Dossiers',     icon: 'chart',    description: 'Dossiers : référence, tiers, statut, taux de complétude, date de soumission.' },
] as const;

type TemplateId = (typeof TEMPLATES)[number]['id'];

const ICON_MAP: Record<string, ReactNode> = {
  document: <Document20Regular />,
  chart: <ChartMultiple20Regular />,
  people: <PeopleTeam20Regular />,
  shield: <ShieldCheckmark20Regular />,
  branch: <Branch20Regular />,
};

const TYPE_OPTIONS = [
  { label: 'Tous types', value: '' },
  ...TEMPLATES.map((t) => ({ label: t.type, value: t.type })),
];

type GeneratedReport = {
  id: string;
  nom: string;
  type: string;
  perimetre: string;
  date: string;
  lignes: number;
  fichier: string;
  rows: Record<string, unknown>[];
};

function frDate(v?: string): string {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR');
}

/** Une date ISO tombe-t-elle dans [start, end] ? (les lignes sans date sont conservées) */
function inRange(raw: string | undefined | null, start: string, end: string): boolean {
  if (!raw) return true;
  const d = raw.slice(0, 10);
  return d >= start && d <= end;
}

export default function Reports() {
  const styles = useStyles();
  const { t } = useT();
  const { notifySuccess, notifyInfo } = useNotifications();

  // Données réelles Dataverse
  const { data: rawTiers } = tiersHooks.useList({ top: 500 });
  const { data: rawDocs } = documentsHooks.useList({ top: 500 });
  const { data: rawUbos } = uboHooks.useList({ top: 300 });
  const { data: rawScreening } = resultatsScreening.useList({ top: 300 });
  const { data: rawDossiers } = dossiersKypKys.useList({ top: 300 });

  // Exports générés pendant la session (pas de table « rapport » côté Dataverse)
  const [generated, setGenerated] = useState<GeneratedReport[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [newOpen, setNewOpen] = useState(false);

  // Formulaire
  const [template, setTemplate] = useState<TemplateId>('partners');
  const [periodeStart, setPeriodeStart] = useState('2026-01-01');
  const [periodeEnd, setPeriodeEnd] = useState(new Date().toISOString().slice(0, 10));
  const [risk, setRisk] = useState<'all' | 'Low' | 'Medium' | 'High'>('all');

  const perimetreLabel = () =>
    risk === 'all'
      ? `${t('Tous les tiers')} (${rawTiers?.length ?? 0})`
      : risk === 'High'
        ? t('Risque critique')
        : risk === 'Medium'
          ? t('Risque élevé')
          : t('Risque standard');

  /** Construit les lignes du rapport à partir des données Dataverse réelles. */
  const buildRows = (id: TemplateId): Record<string, unknown>[] => {
    switch (id) {
      case 'partners':
        return (rawTiers ?? [])
          .filter((t) => inRange(t.afb_datedecreationsysteme, periodeStart, periodeEnd))
          .map(toPartenaire)
          .filter((p) => risk === 'all' || p.risque === risk)
          .map((p) => ({
            'Raison sociale': p.raisonSociale,
            Code: p.code,
            'Type juridique': p.typeJuridique,
            Pays: p.pays,
            Risque: p.risque,
            Direction: p.direction,
            'Date création': p.dateCreation,
          }));
      case 'docs':
        return (rawDocs ?? [])
          .filter((d) => inRange(d.createdon ?? d.afb_datedeteleversement, periodeStart, periodeEnd))
          .map((d) => toDocExpiration(d))
          .map((x) => ({
            Partenaire: x.partenaire,
            'Type de pièce': x.typeDoc,
            Référence: x.reference,
            'Émis le': x.emisLe,
            'Expire le': x.expireLe,
            'Jours restants': x.joursRestants,
            Statut: x.statut,
          }));
      case 'ubo':
        return (rawUbos ?? [])
          .filter((u) => inRange(u.createdon, periodeStart, periodeEnd))
          .map((u) => toUBO(u))
          .map((u) => ({
            Nom: u.nom,
            Nationalité: u.nationalite,
            Partenaire: u.partenaire,
            'Part %': u.partPct,
            'Nature contrôle': u.natureControle,
            PPE: u.ppe ? 'Oui' : 'Non',
            'Date naissance': u.dateNaissance,
            Validation: u.validation,
          }));
      case 'screening':
        return (rawScreening ?? [])
          .filter((r) => inRange(r.afb_datedexecution, periodeStart, periodeEnd))
          .map(toScreeningAlert)
          .map((a) => ({
            Cible: a.cible,
            'Type cible': a.typeCible,
            Source: a.source,
            'Détecté le': a.detecteLe,
            Statut: a.statut,
            Chargé: a.charge,
            Niveau: a.match,
          }));
      case 'dossiers':
        return (rawDossiers ?? [])
          .filter((d) => inRange(d.afb_datedesoumission ?? d.createdon, periodeStart, periodeEnd))
          .map((d) => ({
            Référence: d.afb_referencedudossier ?? '—',
            Tiers: d.afb_nomdutiersname ?? '—',
            Statut: d.afb_statutdudossiername ?? '—',
            'Complétude %': d.afb_tauxdecompletude ?? 0,
            'Soumis le': frDate(d.afb_datedesoumission),
            Version: d.afb_versiondudossier ?? 1,
          }));
      default:
        return [];
    }
  };

  const generate = (id: TemplateId) => {
    const tpl = TEMPLATES.find((t) => t.id === id);
    if (!tpl) return;
    const rows = buildRows(id);
    if (rows.length === 0) {
      notifyInfo(t('Aucune donnée'), {
        description: `${t('Aucune ligne pour')} « ${tpl.nom} » ${t('sur la période choisie.')}`,
      });
      return;
    }
    const fichier = `${id}_${periodeStart}_${periodeEnd}.csv`;
    exportToCsv(fichier, rows);
    const entry: GeneratedReport = {
      id: `${id}-${Date.now()}`,
      nom: tpl.nom,
      type: tpl.type,
      perimetre: id === 'partners' ? perimetreLabel() : `${periodeStart} → ${periodeEnd}`,
      date: new Date().toISOString().slice(0, 10),
      lignes: rows.length,
      fichier,
      rows,
    };
    setGenerated((g) => [entry, ...g]);
    notifySuccess(t('Rapport généré'), {
      description: `${tpl.nom} — ${rows.length} ${t('ligne(s) exportée(s) dans')} ${fichier}.`,
    });
    setNewOpen(false);
  };

  const openWithTemplate = (id: TemplateId) => {
    setTemplate(id);
    setNewOpen(true);
  };

  const filtered = useMemo(
    () =>
      generated.filter((r) => {
        if (typeFilter && r.type !== typeFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          if (!r.nom.toLowerCase().includes(q) && !r.type.toLowerCase().includes(q)) return false;
        }
        return true;
      }),
    [generated, search, typeFilter],
  );

  const columns: Column<GeneratedReport>[] = [
    {
      key: 'nom',
      header: 'Rapport',
      render: (r) => (
        <div className={styles.nameCell}>
          <span className={styles.nameTitle}>{r.nom}</span>
          <span className={styles.nameRef}>{r.fichier}</span>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (r) => (
        <Badge appearance="tint" color="brand" size="small">
          {r.type}
        </Badge>
      ),
    },
    { key: 'perimetre', header: 'Périmètre', render: (r) => r.perimetre },
    { key: 'lignes', header: 'Lignes', render: (r) => r.lignes },
    { key: 'date', header: 'Généré le', render: (r) => frDate(r.date) },
    {
      key: 'statut',
      header: 'Statut',
      render: () => (
        <Badge appearance="tint" color="success" size="small">
          {t('Disponible')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <Button
          size="small"
          appearance="subtle"
          icon={<ArrowDownload20Regular />}
          onClick={() => {
            exportToCsv(r.fichier, r.rows);
            notifySuccess(t('Téléchargement'), { description: `${r.nom} — ${r.fichier}` });
          }}
        >
          {t('Re-télécharger')}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Reporting"
        title="Rapports"
        subtitle="Génération d’états à partir des données Dataverse réelles — export CSV immédiat (objectif C4 < 48 h)."
        actions={
          <Button icon={<DocumentPdf20Regular />} appearance="primary" onClick={() => setNewOpen(true)}>
            Nouveau rapport
          </Button>
        }
      />

      <div
        style={{
          marginBottom: '8px',
          fontSize: '12px',
          fontWeight: 700,
          color: '#767676',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        {t('Modèles disponibles')}
      </div>
      <div className={styles.templateGrid}>
        {TEMPLATES.map((tpl) => (
          <div key={tpl.id} className={styles.template} onClick={() => openWithTemplate(tpl.id)}>
            <div className={styles.templateIcon}>{ICON_MAP[tpl.icon] ?? <Document20Regular />}</div>
            <div className={styles.templateTitle}>{t(tpl.nom)}</div>
            <div className={styles.templateDesc}>{t(tpl.description)}</div>
            <div className={styles.templateAction}>
              <Play20Regular /> {t('Générer')}
            </div>
          </div>
        ))}
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher un rapport généré…"
        filters={[
          { key: 'type', label: 'Type', value: typeFilter, options: TYPE_OPTIONS, onChange: setTypeFilter },
        ]}
      />

      <Card
        flush
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <DocumentPdf20Regular /> {t('Exports de cette session')}
          </span>
        }
        subtitle={
          generated.length
            ? `${filtered.length} sur ${generated.length} export(s) — non persistés (régénérables à tout moment)`
            : 'Aucun export généré pour l’instant'
        }
      >
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(r) => r.id}
          emptyMessage="Aucun rapport généré dans cette session. Choisissez un modèle ci-dessus."
        />
      </Card>

      {/* Modal Nouveau rapport */}
      <FormDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        eyebrow="Reporting"
        title={t('Générer un rapport')}
        subtitle={t('Le rapport est construit à partir des données Dataverse réelles et téléchargé immédiatement en CSV.')}
        size="large"
        submitLabel={t('Générer et télécharger')}
        onSubmit={() => generate(template)}
      >
        <FormSection title={t('Modèle de rapport')}>
          <Field label={t('Type de rapport')} required>
            <Dropdown
              value={t(TEMPLATES.find((tpl) => tpl.id === template)?.nom ?? '')}
              selectedOptions={[template]}
              onOptionSelect={(_, d) => setTemplate((d.optionValue ?? 'partners') as TemplateId)}
            >
              {TEMPLATES.map((tpl) => (
                <Option key={tpl.id} value={tpl.id}>
                  {t(tpl.nom)}
                </Option>
              ))}
            </Dropdown>
          </Field>
          <div style={{ fontSize: '12.5px', color: '#767676', lineHeight: 1.5 }}>
            {t(TEMPLATES.find((tpl) => tpl.id === template)?.description ?? '')}
          </div>
        </FormSection>

        <FormSection title={t('Période')}>
          <FieldRow cols={2}>
            <Field label={t('Date de début')} required>
              <Input type="date" value={periodeStart} onChange={(_, d) => setPeriodeStart(d.value)} />
            </Field>
            <Field label={t('Date de fin')} required>
              <Input type="date" value={periodeEnd} onChange={(_, d) => setPeriodeEnd(d.value)} />
            </Field>
          </FieldRow>
          <div style={{ fontSize: '12px', color: '#767676' }}>
            {t('Les lignes datées hors période sont exclues ; celles sans date sont conservées.')}
          </div>
        </FormSection>

        <FormSection title={t('Périmètre de risque')} description={t('Appliqué à la « Synthèse des partenaires ».')}>
          <Field label={t('Niveau de risque')}>
            <Dropdown
              value={
                risk === 'all'
                  ? `${t('Tous les tiers')} (${rawTiers?.length ?? 0})`
                  : risk === 'High'
                    ? t('Risque critique')
                    : risk === 'Medium'
                      ? t('Risque élevé')
                      : t('Risque standard')
              }
              selectedOptions={[risk]}
              onOptionSelect={(_, d) => setRisk((d.optionValue ?? 'all') as 'all' | 'Low' | 'Medium' | 'High')}
            >
              <Option value="all">{`${t('Tous les tiers')} (${rawTiers?.length ?? 0})`}</Option>
              <Option value="High">{t('Risque critique')}</Option>
              <Option value="Medium">{t('Risque élevé')}</Option>
              <Option value="Low">{t('Risque standard')}</Option>
            </Dropdown>
          </Field>
        </FormSection>
      </FormDialog>
    </div>
  );
}
