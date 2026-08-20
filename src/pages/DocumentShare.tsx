import { useMemo, useRef, useState } from 'react';
import {
  Button,
  Field,
  Input,
  Dropdown,
  Option,
  Checkbox,
  Tooltip,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@fluentui/react-components';
import {
  Add20Regular,
  ArrowDownload20Regular,
  Eye20Regular,
  Delete20Regular,
  DocumentArrowUp20Regular,
  MailInbox20Regular,
} from '@fluentui/react-icons';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';
import { DataTable, type Column } from '@/components/common/DataTable';
import { FormDialog, FormSection, FieldRow } from '@/components/common/FormDialog';
import { ConfirmActionDialog } from '@/components/common/ConfirmActionDialog';
import { useNotifications } from '@/components/common/NotificationProvider';
import { documents, documentCategories, tiers as tiersHooks } from '@/lib/dataverse/entityHooks';
import { getDocumentBinary, base64ToBlob, attachFileToDocument } from '@/lib/dataverse/documentFile';
import { useRoleStore } from '@/store/roleStore';
import { useT } from '@/i18n/i18n';

// afb_document.afb_sourcedudepot : 747010001 = « Ajouté par DCONF » (= partagé par
// la banque). C'est ce qui distingue un document partagé d'un dépôt du partenaire.
const SOURCE_BANQUE = 747010001;

type TiersType = 'Partenaire' | 'Fournisseur' | 'Cible';

interface ShareRow {
  id: string;
  nom: string;
  destinataireId: string;
  destinataire: string;
  date: string;
  expiration: string;
  url: string;
}

function fd(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

export default function DocumentShare() {
  const { t } = useT();
  const { notifySuccess, notifyError, notifyInfo } = useNotifications();

  // RBAC : partage réservé à DCONF et DMG.
  const identity = useRoleStore((s) => s.identity);
  const currentRole = useRoleStore((s) => s.currentRole);
  const dir = identity.direction ?? currentRole.direction;
  const canShare = dir === 'DCONF' || dir === 'DMG';

  // Données Dataverse
  const { data: rawDocs, isLoading, error } = documents.useList({
    filter: `afb_sourcedudepot eq ${SOURCE_BANQUE} and statecode eq 0`,
    orderBy: ['createdon desc'],
    top: 300,
  });
  const { data: rawTiers } = tiersHooks.useList({ top: 500 });
  const { data: rawCategories } = documentCategories.useList({ top: 50 });
  // Réponses des tiers (factures / compléments) : afb_typededocument = 'reponse:<parentId>'.
  const { data: rawResponses } = documents.useList({
    filter: `startswith(afb_typededocument,'reponse:') and statecode eq 0`,
    orderBy: ['createdon desc'],
    top: 500,
  });
  const createDoc = documents.useCreate();
  const deleteDoc = documents.useDelete();

  // Regroupe les réponses par document parent (id extrait du marqueur).
  const responsesByParent = useMemo(() => {
    const m = new Map<string, Array<{ id: string; nom: string; date: string; url: string }>>();
    for (const raw of (rawResponses ?? []) as unknown as Array<Record<string, unknown>>) {
      const marker = (raw.afb_typededocument as string) || '';
      const parentId = marker.startsWith('reponse:') ? marker.slice('reponse:'.length) : '';
      if (!parentId) continue;
      const entry = {
        id: raw.afb_documentid as string,
        nom: (raw.afb_nomdufichier as string) || t('Document'),
        date: fd(raw.createdon as string | undefined),
        url: (raw.afb_urlsharepoint as string) || '',
      };
      const arr = m.get(parentId);
      if (arr) arr.push(entry);
      else m.set(parentId, [entry]);
    }
    return m;
  }, [rawResponses, t]);

  // Résolution nom du tiers (les *name formatés ne reviennent pas en liste).
  const tiersById = useMemo(() => {
    const m = new Map<string, { label: string; type: TiersType }>();
    for (const raw of (rawTiers ?? []) as unknown as Array<Record<string, unknown>>) {
      const id = raw.afb_tiersid as string;
      const type: TiersType =
        raw.afb_statutdutiers === 1 ? 'Cible' : raw.afb_directionporteuse === 2 ? 'Fournisseur' : 'Partenaire';
      m.set(id, { label: (raw.afb_nomdupartenaire as string) || '—', type });
    }
    return m;
  }, [rawTiers]);

  const rows: ShareRow[] = useMemo(
    () =>
      ((rawDocs ?? []) as unknown as Array<Record<string, unknown>>).map((d) => {
        const tId = (d._afb_tiers_value as string) || '';
        return {
          id: d.afb_documentid as string,
          nom: (d.afb_nomdufichier as string) || t('Document'),
          destinataireId: tId,
          destinataire: tiersById.get(tId)?.label ?? '—',
          date: fd(d.createdon as string | undefined),
          expiration: d.afb_datedexpiration ? fd(d.afb_datedexpiration as string) : t('Sans expiration'),
          url: (d.afb_urlsharepoint as string) || '',
        };
      }),
    [rawDocs, tiersById, t],
  );

  // ---- Dialog de partage --------------------------------------------
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [validity, setValidity] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const partnersList = useMemo(
    () =>
      Array.from(tiersById.entries())
        .map(([id, v]) => ({ id, label: v.label, type: v.type }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [tiersById],
  );
  const filteredPartners = useMemo(
    () =>
      partnersList.filter(
        (p) =>
          (!typeFilter || p.type === typeFilter) &&
          (!search || p.label.toLowerCase().includes(search.toLowerCase())),
      ),
    [partnersList, typeFilter, search],
  );
  const toggleRecipient = (id: string) =>
    setRecipients((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const resetForm = () => {
    setName('');
    setValidity('');
    setFile(null);
    setRecipients([]);
    setSearch('');
    setTypeFilter('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const submitShare = async () => {
    if (!file) throw new Error(t('Sélectionnez un fichier à partager.'));
    if (!name.trim()) throw new Error(t('Renseignez le nom du document.'));
    if (recipients.length === 0) throw new Error(t('Sélectionnez au moins un destinataire.'));
    const categoryId = (rawCategories?.[0] as Record<string, unknown> | undefined)?.afb_documentcategoryid as
      | string
      | undefined;
    if (!categoryId) throw new Error(t('Aucune catégorie de document disponible dans Dataverse.'));

    const sizeKo = Math.round((file.size || 0) / 1024);
    let ok = 0;
    try {
      for (const rid of recipients) {
        // 1) Créer la ligne document rattachée au tiers destinataire (source = banque).
        const created = await createDoc.mutateAsync({
          afb_nomdufichier: name.trim(),
          afb_typededocument: 'document-banque',
          afb_sourcedudepot: SOURCE_BANQUE,
          afb_statutdevalidite: 0, // Valide (émis par la banque)
          afb_authentifie: 1, // Non
          afb_datedeteleversement: new Date().toISOString(),
          afb_anneededepot: new Date().getFullYear(),
          afb_urlsharepoint: `shared://${name.trim()}`,
          afb_tailledufichierko: sizeKo,
          'afb_tiers@odata.bind': `/afb_tierses(${rid})`,
          'afb_categorie@odata.bind': `/afb_documentcategories(${categoryId})`,
          ...(validity ? { afb_datedexpiration: validity } : {}),
        } as unknown as Parameters<typeof createDoc.mutateAsync>[0]);
        // 2) Attacher le fichier binaire en pièce jointe (annotation).
        const docId = (created as unknown as Record<string, unknown>)?.afb_documentid as string;
        if (docId) await attachFileToDocument(docId, file);
        ok += 1;
      }
    } catch (e) {
      notifyError(
        t('Partage partiel'),
        `${ok}/${recipients.length} ${t('OK.')} ${e instanceof Error ? e.message : String(e)}`,
      );
      throw e; // garde le dialog ouvert
    }
    notifySuccess(
      t('Document partagé'),
      `${name.trim()} — ${ok} ${t('destinataire(s)')}.`,
    );
    resetForm();
  };

  // ---- Voir / Télécharger -------------------------------------------
  const openDoc = async (row: { id: string; nom: string; url: string }, download: boolean) => {
    try {
      const f = await getDocumentBinary(row.id, row.url, row.nom);
      const a = document.createElement('a');
      if (f.url) {
        a.href = f.url;
        a.target = '_blank';
        a.rel = 'noopener';
        if (download) a.download = row.nom;
      } else {
        const blobUrl = URL.createObjectURL(base64ToBlob(f.base64 as string, f.mimetype as string));
        a.href = blobUrl;
        if (download) a.download = f.filename || row.nom;
        else {
          a.target = '_blank';
          a.rel = 'noopener';
        }
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      }
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      notifyInfo(t('Fichier introuvable'), e instanceof Error ? e.message : String(e));
    }
  };

  // ---- Réponses (factures / compléments) reçues des tiers -----------
  const [openResp, setOpenResp] = useState<ShareRow | null>(null);
  const respList = openResp ? responsesByParent.get(openResp.id) ?? [] : [];

  // ---- Suppression --------------------------------------------------
  const [toDelete, setToDelete] = useState<ShareRow | null>(null);
  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteDoc.mutateAsync(toDelete.id);
      notifySuccess(t('Document retiré'), `${toDelete.nom} — ${t('n’est plus visible par le tiers.')}`);
      setToDelete(null);
    } catch (e) {
      notifyError(t('Suppression impossible'), e instanceof Error ? e.message : String(e));
    }
  };

  const columns: Column<ShareRow>[] = [
    { key: 'nom', header: 'Document', sortValue: (r) => r.nom, searchValue: (r) => r.nom, render: (r) => <span style={{ fontWeight: 600, color: '#1A1A1A' }}>{r.nom}</span> },
    { key: 'dest', header: 'Destinataire', sortValue: (r) => r.destinataire, searchValue: (r) => r.destinataire, filterable: true, render: (r) => r.destinataire },
    { key: 'date', header: 'Partagé le', sortValue: (r) => r.date, searchValue: (r) => r.date, render: (r) => r.date },
    { key: 'exp', header: 'Validité', sortValue: (r) => r.expiration, searchValue: (r) => r.expiration, filterable: true, render: (r) => r.expiration },
    {
      key: 'reponses',
      header: 'Réponses',
      render: (r) => {
        const n = responsesByParent.get(r.id)?.length ?? 0;
        return n === 0 ? (
          <span style={{ color: '#A3A3A3' }}>—</span>
        ) : (
          <Button size="small" appearance="subtle" icon={<MailInbox20Regular />} onClick={() => setOpenResp(r)}>
            {n}
          </Button>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (r) => (
        <div style={{ display: 'inline-flex', gap: 4 }}>
          <Tooltip content={t('Voir')} relationship="label" withArrow>
            <Button appearance="subtle" icon={<Eye20Regular />} onClick={() => openDoc(r, false)} aria-label={t('Voir')} />
          </Tooltip>
          <Tooltip content={t('Télécharger')} relationship="label" withArrow>
            <Button appearance="subtle" icon={<ArrowDownload20Regular />} onClick={() => openDoc(r, true)} aria-label={t('Télécharger')} />
          </Tooltip>
          {canShare && (
            <Tooltip content={t('Supprimer')} relationship="label" withArrow>
              <Button appearance="subtle" icon={<Delete20Regular />} onClick={() => setToDelete(r)} aria-label={t('Supprimer')} />
            </Tooltip>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Partage documentaire"
        title="Documents partagés"
        subtitle="Partagez un document (bon de commande, note, attestation…) avec un ou plusieurs tiers. Ils le retrouvent dans leur espace « Documents reçus »."
        actions={
          canShare ? (
            <Button appearance="primary" icon={<Add20Regular />} onClick={() => setOpen(true)}>
              {t('Partager un document')}
            </Button>
          ) : undefined
        }
      />

      <Card title="Documents partagés" subtitle={`${rows.length} ${t('document(s) partagé(s)')}`}>
        {error ? (
          <div style={{ padding: 20, color: 'var(--danger)' }}>{t('Erreur de chargement depuis Dataverse :')} {error.message}</div>
        ) : isLoading ? (
          <div style={{ padding: 20, color: '#737373' }}>{t('Chargement des documents…')}</div>
        ) : (
          <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} emptyMessage={t('Aucun document partagé pour le moment.')} />
        )}
      </Card>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        onSubmit={submitShare}
        eyebrow={t('Partage documentaire')}
        title={t('Partager un document')}
        subtitle={t('Le document sera visible par les destinataires sélectionnés dans leur espace du portail.')}
        size="large"
        submitLabel={t('Partager')}
        submitDisabled={!file || !name.trim() || recipients.length === 0}
      >
        <FormSection title={t('Document')}>
          <FieldRow cols={2}>
            <Field label={t('Nom du document')} required>
              <Input value={name} onChange={(_, d) => setName(d.value)} placeholder={t('Ex. Bon de commande n°2026-014')} />
            </Field>
            <Field label={t('Date de validité (optionnelle)')} hint={t('Laissez vide si le document n’expire pas.')}>
              <Input type="date" value={validity} onChange={(_, d) => setValidity(d.value)} />
            </Field>
          </FieldRow>
          <FieldRow cols={1}>
            <Field label={t('Fichier')} required>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: 'none' }}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <Button icon={<DocumentArrowUp20Regular />} onClick={() => fileInputRef.current?.click()}>
                  {t('Choisir un fichier')}
                </Button>
                <span style={{ fontSize: 13, color: file ? '#1A1A1A' : '#737373' }}>
                  {file ? file.name : t('Aucun fichier sélectionné')}
                </span>
              </div>
            </Field>
          </FieldRow>
        </FormSection>

        <FormSection
          title={t('Destinataires')}
          description={`${recipients.length} ${t('sélectionné(s)')} · ${filteredPartners.length} ${t('affiché(s)')} ${t('sur')} ${partnersList.length}`}
        >
          <FieldRow cols={2}>
            <Field label={t('Rechercher')}>
              <Input value={search} onChange={(_, d) => setSearch(d.value)} placeholder={t('Nom du tiers…')} />
            </Field>
            <Field label={t('Type')}>
              <Dropdown
                placeholder={t('Tous les types')}
                value={typeFilter || t('Tous les types')}
                selectedOptions={[typeFilter]}
                onOptionSelect={(_, d) => setTypeFilter(d.optionValue ?? '')}
              >
                <Option value="">{t('Tous les types')}</Option>
                <Option value="Partenaire">{t('Partenaire')}</Option>
                <Option value="Fournisseur">{t('Fournisseur')}</Option>
                <Option value="Cible">{t('Cible')}</Option>
              </Dropdown>
            </Field>
          </FieldRow>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <Button size="small" appearance="subtle" onClick={() => setRecipients((p) => Array.from(new Set([...p, ...filteredPartners.map((x) => x.id)])))}>
              {t('Tout sélectionner')}
            </Button>
            <Button size="small" appearance="subtle" onClick={() => setRecipients([])}>
              {t('Effacer')}
            </Button>
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid #F1EFE9', borderRadius: 10 }}>
            {filteredPartners.length === 0 ? (
              <div style={{ padding: 16, fontSize: 13, color: '#737373' }}>{t('Aucun tiers ne correspond au filtre.')}</div>
            ) : (
              filteredPartners.map((p) => (
                <label
                  key={p.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: '1px solid #F7F5F0', cursor: 'pointer' }}
                >
                  <Checkbox checked={recipients.includes(p.id)} onChange={() => toggleRecipient(p.id)} />
                  <span style={{ flex: 1, fontSize: 13.5 }}>{p.label}</span>
                  <span style={{ fontSize: 11, color: '#8A8A8A' }}>{t(p.type)}</span>
                </label>
              ))
            )}
          </div>
        </FormSection>
      </FormDialog>

      <ConfirmActionDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        onConfirm={confirmDelete}
        intent="reject"
        requireMotif={false}
        title={t('Retirer ce document ?')}
        description={t('Le document ne sera plus visible par le tiers. Cette action est définitive.')}
        confirmLabel={t('Retirer')}
      />

      <Dialog open={!!openResp} onOpenChange={(_, d) => !d.open && setOpenResp(null)}>
        <DialogSurface style={{ maxWidth: 560 }}>
          <DialogBody>
            <DialogTitle>
              {t('Réponses du tiers')} — {openResp?.nom}
            </DialogTitle>
            <DialogContent>
              <p style={{ fontSize: 12.5, color: '#737373', marginTop: 0 }}>
                {t('Documents envoyés par le tiers en réponse à ce document (facture, complément…).')}
              </p>
              {respList.length === 0 ? (
                <div style={{ padding: '12px 0', color: '#737373', fontSize: 13 }}>{t('Aucune réponse.')}</div>
              ) : (
                respList.map((r) => (
                  <div
                    key={r.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #F1EFE9' }}
                  >
                    <span style={{ flex: 1, fontSize: 13.5, color: '#1A1A1A' }}>{r.nom}</span>
                    <span style={{ fontSize: 12, color: '#8A8A8A' }}>{r.date}</span>
                    <Tooltip content={t('Voir')} relationship="label" withArrow>
                      <Button appearance="subtle" icon={<Eye20Regular />} onClick={() => openDoc(r, false)} aria-label={t('Voir')} />
                    </Tooltip>
                    <Tooltip content={t('Télécharger')} relationship="label" withArrow>
                      <Button appearance="subtle" icon={<ArrowDownload20Regular />} onClick={() => openDoc(r, true)} aria-label={t('Télécharger')} />
                    </Tooltip>
                  </div>
                ))
              )}
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setOpenResp(null)}>
                {t('Fermer')}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
