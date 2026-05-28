import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  makeStyles,
  Field,
  Input,
  Dropdown,
  Option,
  Switch,
  Textarea,
  Checkbox,
} from '@fluentui/react-components';
import {
  ArrowDownload20Regular,
  ChartMultiple20Regular,
  DocumentPdf20Regular,
  Document20Regular,
  PeopleTeam20Regular,
  Play20Regular,
  ShieldCheckmark20Regular,
  CheckmarkCircle20Filled,
} from '@fluentui/react-icons';
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';
import { FilterBar } from '@/components/common/FilterBar';
import { DataTable, type Column } from '@/components/common/DataTable';
import { mockReports, mockReportTemplates, type Report } from '@/lib/mockData';
import { exportToCsv } from '@/lib/exportCsv';

/** Télécharge un rapport (CSV) à partir de ses métadonnées. */
function downloadReport(r: Pick<Report, 'nom' | 'type' | 'perimetre' | 'date'>) {
  exportToCsv(`${r.nom.replace(/\s+/g, '-').toLowerCase()}.csv`, [
    { Rapport: r.nom, Type: r.type, Périmètre: r.perimetre, Date: r.date, Généré: new Date().toLocaleString('fr-FR') },
  ]);
}
import { FormDialog, FormSection, FieldRow } from '@/components/common/FormDialog';
import { useNotifications } from '@/components/common/NotificationProvider';

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
      borderTopColor: '#E30613', borderRightColor: '#E30613', borderBottomColor: '#E30613', borderLeftColor: '#E30613',
      backgroundColor: '#FEF2F3',
    },
  },
  templateIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: '#FCE4E6',
    color: '#E30613',
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
    color: '#E30613',
    marginTop: '4px',
  },
  nameCell: { display: 'flex', flexDirection: 'column' },
  nameTitle: { fontSize: '13px', fontWeight: 600, color: '#1A1A1A' },
  nameRef: { fontSize: '11px', color: '#767676', fontFamily: 'monospace' },
});

const TYPE_OPTIONS = [
  { label: 'Tous types', value: '' },
  { label: 'Dossier complet', value: 'Dossier complet' },
  { label: 'Synthèse mensuelle', value: 'Synthèse mensuelle' },
  { label: 'Audit régulateur', value: 'Audit régulateur' },
  { label: 'État UBO', value: 'État UBO' },
];

const STATUT_OPTIONS = [
  { label: 'Tous statuts', value: '' },
  { label: 'Disponible', value: 'Disponible' },
  { label: 'En cours', value: 'En cours' },
  { label: 'Échec', value: 'Échec' },
];

function statutColor(s: Report['statut']) {
  if (s === 'Disponible') return 'success';
  if (s === 'En cours') return 'warning';
  return 'danger';
}

const ICON_MAP: Record<string, ReactNode> = {
  document: <Document20Regular />,
  chart: <ChartMultiple20Regular />,
  people: <PeopleTeam20Regular />,
  shield: <ShieldCheckmark20Regular />,
};

export default function Reports() {
  const styles = useStyles();
  const { notifySuccess, notifyInfo } = useNotifications();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [newOpen, setNewOpen] = useState(false);

  // form state
  const [template, setTemplate] = useState<string>(mockReportTemplates[0]?.id ?? '');
  const [periodeStart, setPeriodeStart] = useState('2026-04-01');
  const [periodeEnd, setPeriodeEnd] = useState('2026-04-30');
  const [perimetre, setPerimetre] = useState<'all' | 'crit' | 'corr' | 'agent'>('all');
  const [includeUbo, setIncludeUbo] = useState(true);
  const [includeScreening, setIncludeScreening] = useState(true);
  const [includeAudit, setIncludeAudit] = useState(false);
  const [includeDocs, setIncludeDocs] = useState(true);
  const [chiffreSensibles, setChiffreSensibles] = useState(false);
  const [destEmail, setDestEmail] = useState('');
  const [notes, setNotes] = useState('');

  const filtered = useMemo(() => {
    return mockReports.filter((r) => {
      if (typeFilter && r.type !== typeFilter) return false;
      if (statutFilter && r.statut !== statutFilter) return false;
      if (search && !r.nom.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [search, typeFilter, statutFilter]);

  const openWithTemplate = (id: string) => {
    setTemplate(id);
    setNewOpen(true);
  };

  const resetForm = () => {
    setTemplate(mockReportTemplates[0]?.id ?? '');
    setPerimetre('all');
    setIncludeUbo(true);
    setIncludeScreening(true);
    setIncludeAudit(false);
    setIncludeDocs(true);
    setChiffreSensibles(false);
    setDestEmail('');
    setNotes('');
  };

  const submitNew = async () => {
    await new Promise((r) => setTimeout(r, 900));
    const tpl = mockReportTemplates.find((t) => t.id === template);
    notifyInfo('Génération en cours', {
      description: `Le rapport "${tpl?.nom ?? ''}" est en cours de génération. Vous serez notifié dès qu’il sera disponible.`,
    });
    // Simulate completion after a moment
    setTimeout(() => {
      notifySuccess('Rapport disponible', {
        description: `${tpl?.nom ?? 'Rapport'} — généré. Téléchargement prêt.`,
        action: {
          label: 'Télécharger',
          onClick: () =>
            downloadReport({ nom: tpl?.nom ?? 'Rapport', type: 'Synthèse mensuelle', perimetre: tpl?.nom ?? '—', date: new Date().toISOString().slice(0, 10) }),
        },
        timeout: 8000,
      });
    }, 2000);
    setNewOpen(false);
    resetForm();
  };

  const columns: Column<Report>[] = [
    {
      key: 'nom',
      header: 'Rapport',
      render: (r) => (
        <div className={styles.nameCell}>
          <span className={styles.nameTitle}>{r.nom}</span>
          <span className={styles.nameRef}>{r.id}</span>
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
    { key: 'genere', header: 'Généré par', render: (r) => r.generePar },
    { key: 'date', header: 'Date', render: (r) => r.date },
    {
      key: 'taille',
      header: 'Taille',
      render: (r) => <span style={{ color: r.taille === '—' ? '#C8C8C8' : '#404040' }}>{r.taille}</span>,
    },
    {
      key: 'statut',
      header: 'Statut',
      render: (r) => (
        <Badge appearance="tint" color={statutColor(r.statut)} size="small">
          {r.statut}
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
          disabled={r.statut !== 'Disponible'}
          onClick={() => {
            downloadReport(r);
            notifySuccess('Téléchargement', { description: `${r.nom} — fichier CSV généré.` });
          }}
        >
          Télécharger
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Reporting"
        title="Rapports PDF"
        subtitle="Génération d’états documentaires complets pour le régulateur — export en moins de 5 minutes (C4)."
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
        Modèles disponibles
      </div>
      <div className={styles.templateGrid}>
        {mockReportTemplates.map((t) => (
          <div key={t.id} className={styles.template} onClick={() => openWithTemplate(t.id)}>
            <div className={styles.templateIcon}>{ICON_MAP[t.icon] ?? <Document20Regular />}</div>
            <div className={styles.templateTitle}>{t.nom}</div>
            <div className={styles.templateDesc}>{t.description}</div>
            <div className={styles.templateAction}>
              <Play20Regular /> Générer
            </div>
          </div>
        ))}
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher un rapport…"
        filters={[
          { key: 'type', label: 'Type', value: typeFilter, options: TYPE_OPTIONS, onChange: setTypeFilter },
          { key: 'statut', label: 'Statut', value: statutFilter, options: STATUT_OPTIONS, onChange: setStatutFilter },
        ]}
      />

      <Card
        flush
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <DocumentPdf20Regular /> Historique des exports
          </span>
        }
        subtitle={`${filtered.length} sur ${mockReports.length} rapports`}
      >
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(r) => r.id}
          emptyMessage="Aucun rapport ne correspond aux filtres."
        />
      </Card>

      {/* Modal Nouveau rapport */}
      <FormDialog
        open={newOpen}
        onOpenChange={(o) => { if (!o) resetForm(); setNewOpen(o); }}
        eyebrow="Reporting"
        title="Générer un nouveau rapport"
        subtitle="Sélectionnez le modèle, le périmètre et les composantes à inclure. La génération prend moins de 5 minutes (C4)."
        size="large"
        submitLabel="Lancer la génération"
        onSubmit={submitNew}
      >
        <FormSection title="Modèle de rapport">
          <Field label="Type de rapport" required>
            <Dropdown
              value={mockReportTemplates.find((t) => t.id === template)?.nom ?? ''}
              selectedOptions={[template]}
              onOptionSelect={(_, d) => setTemplate(d.optionValue ?? mockReportTemplates[0]?.id ?? '')}
            >
              {mockReportTemplates.map((t) => (
                <Option key={t.id} value={t.id}>
                  {t.nom}
                </Option>
              ))}
            </Dropdown>
          </Field>
          <div style={{ fontSize: '12.5px', color: '#767676', lineHeight: 1.5 }}>
            {mockReportTemplates.find((t) => t.id === template)?.description}
          </div>
        </FormSection>

        <FormSection title="Périmètre temporel">
          <FieldRow cols={2}>
            <Field label="Date de début" required>
              <Input type="date" value={periodeStart} onChange={(_, d) => setPeriodeStart(d.value)} />
            </Field>
            <Field label="Date de fin" required>
              <Input type="date" value={periodeEnd} onChange={(_, d) => setPeriodeEnd(d.value)} />
            </Field>
          </FieldRow>
          <Field label="Périmètre du portefeuille" required>
            <Dropdown
              value={
                perimetre === 'all'
                  ? 'Tous les partenaires (1 247 tiers)'
                  : perimetre === 'crit'
                    ? 'Niveau Critique uniquement'
                    : perimetre === 'corr'
                      ? 'Correspondants bancaires'
                      : 'Agents bancaires (Agent Banking)'
              }
              selectedOptions={[perimetre]}
              onOptionSelect={(_, d) => setPerimetre((d.optionValue ?? 'all') as 'all' | 'crit' | 'corr' | 'agent')}
            >
              <Option value="all">Tous les partenaires (1 247 tiers)</Option>
              <Option value="crit">Niveau Critique uniquement</Option>
              <Option value="corr">Correspondants bancaires</Option>
              <Option value="agent">Agents bancaires (Agent Banking)</Option>
            </Dropdown>
          </Field>
        </FormSection>

        <FormSection title="Composantes à inclure">
          <FieldRow cols={2}>
            <Checkbox checked={includeUbo} onChange={(_, d) => setIncludeUbo(!!d.checked)} label="Chaîne des bénéficiaires effectifs (UBO)" />
            <Checkbox checked={includeScreening} onChange={(_, d) => setIncludeScreening(!!d.checked)} label="Résultats de screening" />
            <Checkbox checked={includeDocs} onChange={(_, d) => setIncludeDocs(!!d.checked)} label="Pièces et documents joints" />
            <Checkbox checked={includeAudit} onChange={(_, d) => setIncludeAudit(!!d.checked)} label="Journaux d'audit complets (Art. 38)" />
          </FieldRow>
          <Field>
            <Switch
              checked={chiffreSensibles}
              onChange={(_, d) => setChiffreSensibles(d.checked)}
              label="Anonymiser les données nominatives sensibles (PII)"
            />
          </Field>
        </FormSection>

        <FormSection title="Notification et notes">
          <FieldRow cols={2}>
            <Field
              label="Notifier par e-mail (optionnel)"
              hint="Plusieurs adresses séparées par des virgules"
            >
              <Input
                value={destEmail}
                onChange={(_, d) => setDestEmail(d.value)}
                placeholder="rcsi@afribank.com, comite@afribank.com"
              />
            </Field>
            <Field label="Note interne">
              <Textarea
                value={notes}
                onChange={(_, d) => setNotes(d.value)}
                rows={2}
                placeholder="Contexte de la génération (audit COBAC, rapport trimestriel…)"
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
            <CheckmarkCircle20Filled style={{ color: '#C20012', flexShrink: 0, marginTop: '1px' }} />
            <div style={{ fontSize: '12.5px', color: '#525252', lineHeight: 1.5 }}>
              Une fois lancé, le rapport est généré en arrière-plan. Vous recevez une notification dès qu'il est
              disponible et l'export reste accessible 90 jours dans l'historique.
            </div>
          </div>
        </FormSection>
      </FormDialog>
    </div>
  );
}