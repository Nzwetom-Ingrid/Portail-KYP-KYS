import { useMemo, useState } from 'react';
import { Button, Tooltip } from '@fluentui/react-components';
import { ShieldTask20Regular } from '@fluentui/react-icons';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';
import { DataTable, type Column } from '@/components/common/DataTable';
import { ConfirmActionDialog } from '@/components/common/ConfirmActionDialog';
import { useNotifications } from '@/components/common/NotificationProvider';
import { dossiersKypKys, tiers as tiersHooks } from '@/lib/dataverse/entityHooks';
import { useRoleStore } from '@/store/roleStore';
import { getCurrentUser } from '@/lib/auth/currentUserRef';
import { useT } from '@/i18n/i18n';

// afb_statutdudossier : mapping code → présentation.
const STATUT: Record<number, { label: string; color: string; bg: string }> = {
  0: { label: 'Validé', color: '#15803D', bg: '#F0FDF4' },
  1: { label: 'En revue', color: 'var(--warning)', bg: '#FFFBEB' },
  2: { label: 'À compléter', color: 'var(--warning)', bg: '#FFF7ED' },
  747010001: { label: 'Appel à validation en cours', color: 'var(--accent)', bg: 'var(--danger-bg)' },
  747010002: { label: 'Rejeté', color: 'var(--danger)', bg: 'var(--danger-bg)' },
};

interface Row {
  id: string;
  reference: string;
  tiers: string;
  charge?: string;
  statut: number | undefined;
  taux: number;
  date: string;
  appelEnCours: boolean;
}

function fd(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

export default function MesDossiers() {
  const { t } = useT();
  const { notifySuccess, notifyError } = useNotifications();
  const identity = useRoleStore((s) => s.identity);
  const myGuid = identity.utilisateurInterneId;

  const { data: rawDossiers, isLoading, error } = dossiersKypKys.useList({
    top: 500,
    orderBy: ['createdon desc'],
  });
  const { data: rawTiers } = tiersHooks.useList({ top: 500 });
  const updateDossier = dossiersKypKys.useUpdate();

  // tiersId → { nom, chargéGuid } pour filtrer « mes » tiers + afficher le nom.
  const tiersById = useMemo(() => {
    const m = new Map<string, { nom: string; charge?: string }>();
    for (const raw of (rawTiers ?? []) as unknown as Array<Record<string, unknown>>) {
      m.set(raw.afb_tiersid as string, {
        nom: (raw.afb_nomdupartenaire as string) || '—',
        charge: raw._afb_chargederelation_value as string | undefined,
      });
    }
    return m;
  }, [rawTiers]);

  const rows: Row[] = useMemo(() => {
    return ((rawDossiers ?? []) as unknown as Array<Record<string, unknown>>)
      .map((d) => {
        const tId = (d._afb_nomdutiers_value as string) || '';
        const ti = tiersById.get(tId);
        const statut = d.afb_statutdudossier as number | undefined;
        return {
          id: d.afb_dossierkypkysid as string,
          reference: (d.afb_referencedudossier as string) || '—',
          tiers: ti?.nom ?? '—',
          charge: ti?.charge,
          statut,
          taux: (d.afb_tauxdecompletude as number) ?? 0,
          date: fd(d.afb_datedesoumission as string | undefined),
          appelEnCours: statut === 747010001,
        };
      })
      // On ne garde QUE les dossiers dont je suis chargé de relation.
      // (En l'absence d'identité résolue — ex. démo — on affiche tout, pour ne
      // pas présenter une page vide.)
      .filter((r) => !myGuid || r.charge === myGuid);
  }, [rawDossiers, tiersById, myGuid]);

  // ---- Demande de validation (appel au RCSI) ----
  const [toAsk, setToAsk] = useState<Row | null>(null);
  const confirmAsk = async (motif: string) => {
    if (!toAsk) return;
    try {
      await updateDossier.mutateAsync({
        id: toAsk.id,
        changes: {
          afb_statutdudossier: 747010001, // escaladé / appel en cours
          afb_demandeurappel: getCurrentUser()?.email ?? identity.email ?? '',
          afb_statutappel: 'demande',
          afb_motifappel: motif || 'Demande de validation',
        } as unknown as Parameters<typeof updateDossier.mutateAsync>[0]['changes'],
      });
      notifySuccess(t('Demande de validation envoyée'), {
        description: `${toAsk.reference} — ${t('le RCSI est notifié par e-mail. Vous recevrez le résultat de la même façon.')}`,
      });
      setToAsk(null);
    } catch (e) {
      notifyError(t('Envoi impossible'), { description: e instanceof Error ? e.message : String(e) });
    }
  };

  const columns: Column<Row>[] = [
    { key: 'ref', header: 'Référence', render: (r) => <span style={{ fontWeight: 600, color: '#1A1A1A' }}>{r.reference}</span> },
    { key: 'tiers', header: 'Tiers', render: (r) => r.tiers },
    {
      key: 'statut',
      header: 'Statut',
      render: (r) => {
        const s = STATUT[r.statut ?? 1] ?? STATUT[1];
        return (
          <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, color: s.color, backgroundColor: s.bg }}>
            {t(s.label)}
          </span>
        );
      },
    },
    {
      key: 'taux',
      header: 'Complétude',
      render: (r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
          <div style={{ flex: 1, height: 6, borderRadius: 999, background: '#F1EFE9', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, Math.max(0, r.taux))}%`, height: '100%', background: r.taux >= 100 ? '#15803D' : 'var(--accent)' }} />
          </div>
          <span style={{ fontSize: 12, color: '#525252', fontVariantNumeric: 'tabular-nums' }}>{Math.round(r.taux)}%</span>
        </div>
      ),
    },
    { key: 'date', header: 'Soumis le', render: (r) => r.date },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (r) => (
        <Tooltip content={r.appelEnCours ? t('Appel à validation déjà en cours') : t('Demander une validation au RCSI')} relationship="label" withArrow>
          <Button
            size="small"
            appearance={r.appelEnCours ? 'subtle' : 'primary'}
            icon={<ShieldTask20Regular />}
            disabled={r.appelEnCours}
            onClick={() => setToAsk(r)}
          >
            {r.appelEnCours ? t('En attente') : t('Demander une validation')}
          </Button>
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Suivi de relation"
        title="Mes dossiers"
        subtitle="Suivez l'avancement des dossiers dont vous êtes chargé de relation et demandez une validation (ou double validation) au responsable habilité lorsque c'est requis."
      />

      <Card title="Dossiers suivis" subtitle={`${rows.length} ${t('dossier(s)')}`}>
        {error ? (
          <div style={{ padding: 20, color: 'var(--danger)' }}>{t('Erreur de chargement depuis Dataverse :')} {error.message}</div>
        ) : isLoading ? (
          <div style={{ padding: 20, color: '#737373' }}>{t('Chargement des dossiers…')}</div>
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.id}
            emptyMessage={t('Aucun dossier ne vous est assigné pour le moment.')}
          />
        )}
      </Card>

      <ConfirmActionDialog
        open={!!toAsk}
        onOpenChange={(o) => !o && setToAsk(null)}
        onConfirm={confirmAsk}
        intent="warn"
        requireMotif
        title={t('Demander une validation au RCSI')}
        description={t('Vous n\'avez pas l\'habilitation pour valider ce dossier seul. Votre demande est transmise au responsable habilité (RCSI), qui reçoit une notification par e-mail. Une fois sa décision prise, vous êtes notifié du résultat par e-mail.')}
        confirmLabel={t('Envoyer la demande')}
        motifLabel={t('Motif de la demande')}
        motifPlaceholder={t('Précisez le niveau requis, le contexte, l\'urgence…')}
        entityRef={toAsk?.reference}
      />
    </div>
  );
}
