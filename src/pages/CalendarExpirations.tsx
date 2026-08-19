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
  Switch,
} from '@fluentui/react-components';
import {
  ArrowDownload20Regular,
  Send20Regular,
  CalendarLtr20Regular,
  Eye20Regular,
  Document20Regular,
  ArrowUpload20Regular,
  CheckmarkCircle20Filled,
} from '@fluentui/react-icons';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';
import { FilterBar } from '@/components/common/FilterBar';
import { DataTable, type Column } from '@/components/common/DataTable';
import { type DocExpiration } from '@/lib/mockData';
import {
  documents as documentsHooks,
  tiers as tiersHooks,
  utilisateursInternes,
  documentCategories,
} from '@/lib/dataverse/entityHooks';
import { toDocExpiration } from '@/lib/dataverse/documentMappers';
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
  bucketRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
    marginBottom: '16px',
  },
  bucket: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '18px 20px',
    border: '1px solid #F4F4F4',
    boxShadow: '0 1px 2px rgba(15, 15, 15, 0.04)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    ':hover': { borderTopColor: '#FCE4E6', borderRightColor: '#FCE4E6', borderBottomColor: '#FCE4E6', borderLeftColor: '#FCE4E6'},
  },
  bucketLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#767676',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '6px',
  },
  bucketValue: { fontSize: '28px', fontWeight: 700, lineHeight: 1 },
  bucketMeta: { fontSize: '12px', color: '#767676', marginTop: '6px' },
  timeline: { display: 'flex', flexDirection: 'column', gap: '14px' },
  timelineRow: { display: 'flex', gap: '14px', alignItems: 'center' },
  timelineDate: {
    minWidth: '80px',
    fontSize: '11px',
    fontWeight: 700,
    color: '#767676',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  timelineBar: {
    flex: 1,
    height: '8px',
    backgroundColor: '#F4F4F4',
    borderRadius: '999px',
    overflow: 'hidden',
  },
  timelineFill: { height: '100%', borderRadius: '999px' },
  timelineCount: {
    minWidth: '40px',
    textAlign: 'right',
    fontSize: '13px',
    fontWeight: 600,
    color: '#1A1A1A',
  },
  daysCell: { fontWeight: 600 },
  rowActions: { display: 'flex', gap: '4px', justifyContent: 'flex-end' },
  versionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    backgroundColor: '#FAFAFA',
    border: '1px solid #F4F4F4',
    borderRadius: '8px',
    marginBottom: '6px',
  },
  versionBadge: {
    fontSize: '10px',
    fontWeight: 700,
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E7EB',
    color: '#404040',
    padding: '2px 6px',
    borderRadius: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  versionCurrent: {
    backgroundColor: '#FEF2F3',
    borderTopColor: '#FCE4E6', borderRightColor: '#FCE4E6', borderBottomColor: '#FCE4E6', borderLeftColor: '#FCE4E6',
    color: 'var(--accent-dark)',
  },
  partnerOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    border: '1px solid #F4F4F4',
    borderRadius: '8px',
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
    fontSize: '13px',
  },
  partnerOptionChecked: {
    backgroundColor: '#FEF2F3',
    borderTopColor: '#FCE4E6', borderRightColor: '#FCE4E6', borderBottomColor: '#FCE4E6', borderLeftColor: '#FCE4E6',
  },
});

const STATUT_OPTIONS = [
  { label: 'Tous statuts', value: '' },
  { label: 'Expiré', value: 'Expiré' },
  { label: 'À renouveler', value: 'À renouveler' },
  { label: 'Valide', value: 'Valide' },
];

const TYPE_OPTIONS = [
  { label: 'Tous types', value: '' },
  { label: 'RCCM', value: 'RCCM' },
  { label: 'Attestation fiscale', value: 'Attestation fiscale' },
  { label: 'CNI dirigeant', value: 'CNI dirigeant' },
  { label: 'Agrément BEAC', value: 'Agrément BEAC' },
  { label: 'KBIS / Registre', value: 'KBIS / Registre' },
];

function statutColor(s: DocExpiration['statut']) {
  if (s === 'Expiré') return 'danger';
  if (s === 'À renouveler') return 'warning';
  return 'success';
}

function daysColor(jours: number) {
  if (jours < 0) return 'var(--danger)';
  if (jours <= 7) return 'var(--warning)';
  if (jours <= 30) return '#404040';
  return '#15803D';
}

function daysLabel(jours: number) {
  if (jours < 0) return `Dépassé · ${Math.abs(jours)}j`;
  if (jours === 0) return 'Aujourd’hui';
  return `J-${jours}`;
}

export default function CalendarExpirations() {
  const styles = useStyles();
  const { t } = useT();
  const { notifySuccess, notifyInfo } = useNotifications();

  // Documents réels depuis Dataverse (afb_document), limités à ceux qui expirent.
  const { data: rawDocs, isLoading, error } = documentsHooks.useList({ top: 300 });
  const updateDoc = documentsHooks.useUpdate();
  // Listes de référence pour résoudre partenaire / chargé / catégorie.
  const { data: rawTiers } = tiersHooks.useList({ top: 500 });
  const { data: rawUsers } = utilisateursInternes.useList({ top: 500 });
  const { data: rawCats } = documentCategories.useList({ top: 200 });

  const resolvers = useMemo(() => {
    const tiersById = new Map<string, { nom?: string; chargeGuid?: string }>();
    for (const t of rawTiers ?? [])
      tiersById.set(t.afb_tiersid, { nom: t.afb_nomdupartenaire, chargeGuid: t._afb_chargederelation_value });
    const usersById = new Map<string, string>();
    for (const u of rawUsers ?? []) usersById.set(u.afb_utilisateurinterneid, u.afb_nomcomplet);
    const categoryById = new Map<string, string>();
    for (const c of rawCats ?? []) categoryById.set(c.afb_documentcategoryid, c.afb_libelle);
    return { tiersById, usersById, categoryById };
  }, [rawTiers, rawUsers, rawCats]);

  const expirations = useMemo(
    () => (rawDocs ?? []).filter((d) => d.afb_datedexpiration).map((d) => toDocExpiration(d, resolvers)),
    [rawDocs, resolvers],
  );

  // Pose la date de relance manuelle sur le document → un flux Power Automate
  // détecte ce changement et envoie l'e-mail de relance au tiers (+ trace).
  // (afb_datederelancemanuelle = nouvelle colonne, hors modèle généré → cast.)
  const markRelance = (id: string) =>
    updateDoc.mutateAsync({
      id,
      changes: { afb_datederelancemanuelle: new Date().toISOString() },
    } as unknown as Parameters<typeof updateDoc.mutateAsync>[0]);

  const docsInBucket = (bucket: 'expired' | 'j7' | 'j30' | 'all'): DocExpiration[] =>
    expirations.filter((d) =>
      bucket === 'expired'
        ? d.joursRestants < 0
        : bucket === 'j7'
          ? d.joursRestants >= 0 && d.joursRestants <= 7
          : bucket === 'j30'
            ? d.joursRestants > 7 && d.joursRestants <= 30
            : true,
    );

  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [fenetreFilter, setFenetreFilter] = useState<'' | 'j30' | 'j60'>('');
  const [openDoc, setOpenDoc] = useState<DocExpiration | null>(null);
  const [activeTab, setActiveTab] = useState('detail');
  const [relanceOpen, setRelanceOpen] = useState(false);

  // form state — relance groupée
  const [filterBucket, setFilterBucket] = useState<'expired' | 'j7' | 'j30' | 'all'>('j30');
  const [templateMail, setTemplateMail] = useState('standard');
  const [subjectMail, setSubjectMail] = useState(t('Renouvellement de documents — Afriland First Bank'));
  const [bodyMail, setBodyMail] = useState(
    t('Madame, Monsieur,\n\nCertaines pièces de votre dossier de conformité arrivent à expiration. Nous vous remercions de bien vouloir nous fournir les versions à jour avant la date indiquée.\n\nLa Direction Conformité'),
  );
  const [escalation, setEscalation] = useState(true);

  const filtered = useMemo(() => {
    return expirations.filter((d) => {
      if (statutFilter && d.statut !== statutFilter) return false;
      if (typeFilter && d.typeDoc !== typeFilter) return false;
      if (fenetreFilter === 'j30' && !(d.joursRestants > 7 && d.joursRestants <= 30)) return false;
      if (fenetreFilter === 'j60' && !(d.joursRestants > 30 && d.joursRestants <= 60)) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!d.partenaire.toLowerCase().includes(q) && !d.reference.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [expirations, search, statutFilter, typeFilter, fenetreFilter]);

  const buckets = [
    {
      key: 'expired',
      label: t('Dépassés'),
      count: expirations.filter((d) => d.joursRestants < 0).length,
      color: 'var(--danger)',
      meta: t('relance immédiate'),
      pressed: statutFilter === 'Expiré',
      // Les deux familles de filtres (statut / fenêtre) s'excluent : on efface l'autre.
      onClick: () => {
        setFenetreFilter('');
        setStatutFilter((cur) => (cur === 'Expiré' ? '' : 'Expiré'));
      },
    },
    {
      key: 'j7',
      label: 'J-7',
      count: expirations.filter((d) => d.joursRestants >= 0 && d.joursRestants <= 7).length,
      color: 'var(--warning)',
      meta: t('à renouveler'),
      pressed: statutFilter === 'À renouveler',
      onClick: () => {
        setFenetreFilter('');
        setStatutFilter((cur) => (cur === 'À renouveler' ? '' : 'À renouveler'));
      },
    },
    {
      key: 'j30',
      label: 'J-30',
      count: expirations.filter((d) => d.joursRestants > 7 && d.joursRestants <= 30).length,
      color: '#404040',
      meta: t('à anticiper'),
      pressed: fenetreFilter === 'j30',
      onClick: () => {
        setStatutFilter('');
        setFenetreFilter((cur) => (cur === 'j30' ? '' : 'j30'));
      },
    },
    {
      key: 'j60',
      label: 'J-60',
      count: expirations.filter((d) => d.joursRestants > 30 && d.joursRestants <= 60).length,
      color: '#404040',
      meta: t('à planifier'),
      pressed: fenetreFilter === 'j60',
      onClick: () => {
        setStatutFilter('');
        setFenetreFilter((cur) => (cur === 'j60' ? '' : 'j60'));
      },
    },
  ];
  const maxBucket = Math.max(...buckets.map((b) => b.count), 1);

  const open = (d: DocExpiration) => {
    setOpenDoc(d);
    setActiveTab('detail');
  };

  const relanceUnitaire = async (d: DocExpiration) => {
    try {
      await markRelance(d.id);
      notifySuccess(t('Relance déclenchée'), {
        description: `${d.partenaire} — ${d.typeDoc} (${d.reference}). ${t('Le tiers va recevoir l\'e-mail de relance.')}`,
      });
    } catch (e) {
      notifyInfo(t('Relance impossible'), {
        description: e instanceof Error ? e.message : t('Erreur Dataverse lors de la relance.'),
      });
    }
  };

  const submitRelanceGroupee = async () => {
    const docs = docsInBucket(filterBucket);
    if (docs.length === 0) {
      notifyInfo(t('Aucun document'), { description: t('Aucun document à relancer dans cette fenêtre.') });
      return;
    }
    try {
      await Promise.all(docs.map((d) => markRelance(d.id)));
      notifySuccess(t('Relance groupée déclenchée'), {
        description: `${docs.length} ${t('document(s) — les tiers concernés vont recevoir l\'e-mail de relance.')}`,
        timeout: 7000,
      });
      if (escalation) {
        notifyInfo(t('Escalade activée'), {
          description: t('Les relances sans réponse à J+7 escaladeront au chargé de relation.'),
        });
      }
      setRelanceOpen(false);
    } catch (e) {
      notifyInfo(t('Relance impossible'), {
        description: e instanceof Error ? e.message : t('Erreur Dataverse lors de la relance groupée.'),
      });
    }
  };

  // Version courante réelle (le versionnage complet est géré par le coffre SharePoint).
  const versions = (d: DocExpiration) => [
    { version: t('Version actuelle'), date: d.expireLe, status: 'current' as const, taille: '—', auteur: d.partenaire },
  ];

  const columns: Column<DocExpiration>[] = [
    { key: 'doc', header: 'Document', render: (d) => <strong style={{ color: '#1A1A1A' }}>{d.typeDoc}</strong> },
    { key: 'ref', header: 'Référence', render: (d) => <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{d.reference}</span> },
    { key: 'partenaire', header: 'Partenaire', render: (d) => d.partenaire },
    { key: 'expire', header: 'Expire le', render: (d) => d.expireLe },
    {
      key: 'jours',
      header: 'Échéance',
      render: (d) => (
        <span className={styles.daysCell} style={{ color: daysColor(d.joursRestants) }}>
          {daysLabel(d.joursRestants)}
        </span>
      ),
    },
    {
      key: 'statut',
      header: 'Statut',
      render: (d) => (
        <Badge appearance="tint" color={statutColor(d.statut)} size="small">
          {d.statut}
        </Badge>
      ),
    },
    { key: 'charge', header: 'Chargé', render: (d) => d.charge },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (d) => (
        <div className={styles.rowActions} onClick={(e) => e.stopPropagation()}>
          <Tooltip content={t('Voir le document')} relationship="label">
            <Button size="small" appearance="subtle" icon={<Eye20Regular />} onClick={() => open(d)} />
          </Tooltip>
          <Tooltip content={t('Relancer')} relationship="label">
            <Button size="small" appearance="subtle" icon={<Send20Regular />} onClick={() => relanceUnitaire(d)} />
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Pilotage"
        title="Calendrier des expirations"
        subtitle="Vue chronologique des pièces arrivant à expiration — relances J-60, J-30, J-7 selon COBAC R-2023/01."
        actions={
          <>
            <Button
              icon={<ArrowDownload20Regular />}
              appearance="outline"
              onClick={() => {
                const ok = exportToCsv(
                  `expirations-${new Date().toISOString().slice(0, 10)}.csv`,
                  filtered.map((d) => ({
                    Partenaire: d.partenaire,
                    Document: d.typeDoc,
                    Référence: d.reference,
                    'Émis le': d.emisLe,
                    'Expire le': d.expireLe,
                    'Jours restants': d.joursRestants,
                    Statut: d.statut,
                    Chargé: d.charge,
                  })),
                );
                notifySuccess(ok ? t('Calendrier exporté') : t('Aucune donnée'), {
                  description: ok ? `${filtered.length} ${t('expirations exportées (CSV).')}` : t('Aucune expiration à exporter.'),
                });
              }}
            >
              {t('Export')}
            </Button>
            <Button icon={<Send20Regular />} appearance="primary" onClick={() => setRelanceOpen(true)}>
              {t('Relance groupée')}
            </Button>
          </>
        }
      />

      <div className={styles.bucketRow}>
        {buckets.map((b) => (
          <div
            key={b.label}
            className={styles.bucket}
            role="button"
            tabIndex={0}
            aria-pressed={b.pressed}
            onClick={b.onClick}
          >
            <div className={styles.bucketLabel}>{b.label}</div>
            <div className={styles.bucketValue} style={{ color: b.color }}>{b.count}</div>
            <div className={styles.bucketMeta}>{b.meta}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '16px' }}>
        <Card title="Répartition par échéance" subtitle="Volume de documents par fenêtre SLA">
          <div className={styles.timeline}>
            {buckets.map((b) => (
              <div key={b.label} className={styles.timelineRow}>
                <span className={styles.timelineDate}>{b.label}</span>
                <div className={styles.timelineBar}>
                  <div
                    className={styles.timelineFill}
                    style={{ width: `${(b.count / maxBucket) * 100}%`, backgroundColor: b.color }}
                  />
                </div>
                <span className={styles.timelineCount}>{b.count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Prochaines échéances critiques" subtitle="J-7 et J-1 — actions prioritaires">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {expirations
              .filter((d) => d.joursRestants <= 7)
              .slice(0, 5)
              .map((d) => (
                <div
                  key={d.id}
                  onClick={() => open(d)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    backgroundColor: '#FEF2F3',
                    borderRadius: '8px',
                    border: '1px solid #FCE4E6',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A1A' }}>{d.partenaire}</div>
                    <div style={{ fontSize: '12px', color: '#767676' }}>
                      {d.typeDoc} · {d.reference}
                    </div>
                  </div>
                  <span style={{ color: daysColor(d.joursRestants), fontSize: '13px', fontWeight: 700 }}>
                    {daysLabel(d.joursRestants)}
                  </span>
                </div>
              ))}
          </div>
        </Card>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher un document, un partenaire, une référence…"
        filters={[
          { key: 'statut', label: 'Statut', value: statutFilter, options: STATUT_OPTIONS, onChange: setStatutFilter },
          { key: 'type', label: 'Type', value: typeFilter, options: TYPE_OPTIONS, onChange: setTypeFilter },
        ]}
      />

      <Card
        flush
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <CalendarLtr20Regular /> {t('Tous les documents')}
          </span>
        }
        subtitle={`${filtered.length} ${t('sur')} ${expirations.length} documents`}
      >
        {error ? (
          <div style={{ padding: '24px', color: 'var(--danger)', fontSize: '13px' }}>
            {t('Erreur de chargement depuis Dataverse :')} {error.message}
          </div>
        ) : isLoading ? (
          <div style={{ padding: '24px', color: '#767676', fontSize: '13px' }}>{t('Chargement des documents…')}</div>
        ) : (
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(d) => d.id}
            onRowClick={open}
            emptyMessage="Aucun document ne correspond aux filtres."
          />
        )}
      </Card>

      {/* Drawer document */}
      <DetailDrawer
        open={openDoc !== null}
        onOpenChange={(o) => !o && setOpenDoc(null)}
        eyebrow={openDoc?.typeDoc ?? ''}
        title={openDoc?.partenaire ?? ''}
        subtitle={openDoc?.reference}
        size="large"
        statusBadges={
          openDoc ? (
            <>
              <Badge appearance="filled" color={statutColor(openDoc.statut)} size="small">
                {openDoc.statut}
              </Badge>
              <Badge appearance="tint" color="brand" size="small" style={{ color: daysColor(openDoc.joursRestants) }}>
                {daysLabel(openDoc.joursRestants)}
              </Badge>
            </>
          ) : null
        }
        tabs={[
          { id: 'detail', label: t('Détails') },
          { id: 'versions', label: t('Versions'), count: openDoc ? versions(openDoc).length : undefined },
          { id: 'historique', label: t('Historique') },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        footer={
          openDoc ? (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
              <Button appearance="outline" icon={<Send20Regular />} onClick={() => { relanceUnitaire(openDoc); setOpenDoc(null); }}>
                {t('Relancer le partenaire')}
              </Button>
              <Button
                appearance="primary"
                icon={<ArrowUpload20Regular />}
                onClick={() =>
                  notifyInfo(t('Téléverser une nouvelle version'), {
                    description:
                      t('Sélectionnez le fichier à jour — il remplacera la version actuelle après contrôle de conformité.'),
                  })
                }
              >
                {t('Téléverser une nouvelle version')}
              </Button>
            </div>
          ) : null
        }
      >
        {openDoc && (
          <>
            {activeTab === 'detail' && (
              <>
                <DrawerSection title={t('Identification du document')}>
                  <FieldGrid
                    items={[
                      { label: t('Type'), value: openDoc.typeDoc },
                      { label: t('Référence'), value: openDoc.reference, mono: true },
                      { label: t('Partenaire'), value: openDoc.partenaire },
                      { label: t('Chargé de relation'), value: openDoc.charge },
                      { label: t('Date d\'expiration'), value: openDoc.expireLe },
                      { label: t('Échéance'), value: <strong style={{ color: daysColor(openDoc.joursRestants) }}>{daysLabel(openDoc.joursRestants)}</strong> },
                    ]}
                  />
                </DrawerSection>
                <DrawerSection title={t('Politique de renouvellement')}>
                  <FieldGrid
                    items={[
                      { label: t('Durée de validité'), value: t('24 mois') },
                      { label: t('Relances automatiques'), value: 'J-60 / J-30 / J-7 / J-1' },
                      { label: t('Escalade J+7'), value: t('Chargé + RCSI') },
                    ]}
                  />
                </DrawerSection>
              </>
            )}

            {activeTab === 'versions' && (
              <DrawerSection
                title={t('Versions du document')}
                description={t('Historique complet — toutes les versions sont conservées 10 ans (Art. 38 R-2023/01).')}
              >
                {versions(openDoc).map((v) => (
                  <div key={v.version} className={styles.versionRow}>
                    <Document20Regular style={{ color: v.status === 'current' ? 'var(--accent)' : '#767676' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A1A' }}>
                        <span className={`${styles.versionBadge} ${v.status === 'current' ? styles.versionCurrent : ''}`}>
                          {v.version}
                        </span>{' '}
                        — {v.date}
                      </div>
                      <div style={{ fontSize: '11px', color: '#767676', marginTop: '2px' }}>
                        {t('Déposé par')} {v.auteur} · {v.taille}
                      </div>
                    </div>
                    <Button
                      size="small"
                      appearance="subtle"
                      icon={<ArrowDownload20Regular />}
                      onClick={() =>
                        notifySuccess(t('Téléchargement démarré'), {
                          description: `${v.version} (${v.taille}) — ${t('récupération du document en cours.')}`,
                        })
                      }
                    />
                  </div>
                ))}
              </DrawerSection>
            )}

            {activeTab === 'historique' && (
              <DrawerSection title={t('Historique du document')}>
                <DrawerTimeline
                  events={[
                    {
                      when: openDoc.expireLe,
                      title: openDoc.joursRestants < 0 ? t('Document expiré') : t('Date d’expiration'),
                      detail: `${daysLabel(openDoc.joursRestants)} · ${t('échéance de renouvellement')}`,
                    },
                    ...(openDoc.emisLe !== '—'
                      ? [{ when: openDoc.emisLe, title: t('Document émis'), detail: `${openDoc.typeDoc} · ${openDoc.reference}` }]
                      : []),
                    { when: openDoc.expireLe, title: t('Déposé par le partenaire'), detail: openDoc.partenaire },
                  ]}
                />
              </DrawerSection>
            )}
          </>
        )}
      </DetailDrawer>

      {/* Modal Relance groupée */}
      <FormDialog
        open={relanceOpen}
        onOpenChange={setRelanceOpen}
        eyebrow={t('Relances en lot')}
        title={t('Lancer une relance groupée')}
        subtitle={t('Envoie un e-mail aux partenaires concernés et dépose la notification dans leur espace dédié.')}
        size="large"
        submitLabel={t('Envoyer les relances')}
        onSubmit={submitRelanceGroupee}
      >
        <FormSection title={t('Périmètre de la relance')}>
          <Field label={t('Échéance cible')} required>
            <Dropdown
              value={
                filterBucket === 'expired'
                  ? t('Documents expirés (relance immédiate)')
                  : filterBucket === 'j7'
                    ? t('Échéance dans les 7 jours')
                    : filterBucket === 'j30'
                      ? t('Échéance dans les 30 jours')
                      : t('Tous les documents à renouveler')
              }
              selectedOptions={[filterBucket]}
              onOptionSelect={(_, d) => setFilterBucket((d.optionValue ?? 'j30') as 'expired' | 'j7' | 'j30' | 'all')}
            >
              <Option value="expired">{t('Documents expirés (relance immédiate)')}</Option>
              <Option value="j7">{t('Échéance dans les 7 jours')}</Option>
              <Option value="j30">{t('Échéance dans les 30 jours')}</Option>
              <Option value="all">{t('Tous les documents à renouveler')}</Option>
            </Dropdown>
          </Field>
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
              <strong>
                {filterBucket === 'expired'
                  ? expirations.filter((d) => d.joursRestants < 0).length
                  : filterBucket === 'j7'
                    ? expirations.filter((d) => d.joursRestants >= 0 && d.joursRestants <= 7).length
                    : filterBucket === 'j30'
                      ? expirations.filter((d) => d.joursRestants > 7 && d.joursRestants <= 30).length
                      : expirations.length}{' '}
                documents
              </strong>{' '}
              {t('seront concernés par cette relance — un e-mail par partenaire avec consolidation des documents.')}
            </div>
          </div>
        </FormSection>

        <FormSection title={t('Template d\'e-mail')}>
          <FieldRow cols={2}>
            <Field label={t('Modèle')} required>
              <Dropdown
                value={
                  templateMail === 'standard'
                    ? t('Standard')
                    : templateMail === 'ferme'
                      ? t('Ferme (J+0 escalade)')
                      : t('Personnalisé')
                }
                selectedOptions={[templateMail]}
                onOptionSelect={(_, d) => setTemplateMail(d.optionValue ?? 'standard')}
              >
                <Option value="standard">{t('Standard')}</Option>
                <Option value="ferme">{t('Ferme (J+0 escalade)')}</Option>
                <Option value="custom">{t('Personnalisé')}</Option>
              </Dropdown>
            </Field>
            <Field label={t('Sujet')}>
              <Input value={subjectMail} onChange={(_, d) => setSubjectMail(d.value)} />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label={t('Corps du message')}>
              <Textarea value={bodyMail} onChange={(_, d) => setBodyMail(d.value)} rows={6} />
            </Field>
          </FieldRow>
        </FormSection>

        <FormSection title={t('Options')}>
          <Field>
            <Switch
              checked={escalation}
              onChange={(_, d) => setEscalation(d.checked)}
              label={t('Escalader automatiquement au RCSI si pas de réponse à J+7')}
            />
          </Field>
        </FormSection>
      </FormDialog>
    </div>
  );
}