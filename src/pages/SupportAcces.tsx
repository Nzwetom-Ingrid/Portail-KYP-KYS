/**
 * Console support — accès des tiers au portail.
 *
 * Écran destiné au support IT lorsqu'un partenaire appelle en disant « je
 * n'arrive pas à me connecter ». Il évite d'ouvrir Dataverse, Azure et Power
 * Pages en parallèle : la cause est déduite des traces déjà enregistrées.
 *
 * La population de départ est la table `afb_tiers` — ce sont les entreprises
 * que la banque suit. Une ligne = UNE ENTREPRISE, y compris celle dont personne
 * ne peut ouvrir le portail : c'est le cas le plus grave, et il était invisible
 * tant que l'écran partait des identités de connexion.
 *
 * L'accès, lui, se lit sur la table CONTACT et ses colonnes `adx_identity_*` —
 * c'est elle que Power Pages utilise pour authentifier. `afb_tiersexterneb2c`
 * n'est qu'un miroir du flux d'invitation, et ne portait aucune trace réelle.
 */
import { useMemo, useState } from 'react';
import { Badge, Button, makeStyles } from '@fluentui/react-components';
import { PersonAdd20Regular } from '@fluentui/react-icons';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';
import { FilterBar } from '@/components/common/FilterBar';
import { DataTable, type Column } from '@/components/common/DataTable';
import { useTableFilters } from '@/lib/tables/useTableFilters';
import { AccesDetailDrawer } from '@/components/support/AccesDetailDrawer';
import { ConfirmActionDialog } from '@/components/common/ConfirmActionDialog';
import { InviterAccesDialog } from '@/components/support/InviterAccesDialog';
import { useNotifications } from '@/components/common/NotificationProvider';
import {
  contacts as contactsHooks,
  tiers as tiersHooks,
  tiersExterneB2c,
} from '@/lib/dataverse/entityHooks';
import { useT } from '@/i18n/i18n';
import {
  agregerAcces,
  type AccesPortail,
  type CompteB2c,
  type ContactPortail,
  type TiersMinimal,
} from '@/lib/support/accesPortail';
import { agregerParTiers, type AccesTiers } from '@/lib/support/accesParTiers';
import {
  compterParSeverite,
  SEVERITE_ORDRE,
  STATUT_COMPTE,
  type Severite,
} from '@/lib/support/accessDiagnostic';

const useStyles = makeStyles({
  kpiRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
    marginBottom: '16px',
  },
  kpi: {
    backgroundColor: 'var(--colorNeutralBackground1)',
    borderRadius: '12px',
    padding: '18px 20px',
    border: '1px solid var(--colorNeutralStroke2)',
    cursor: 'pointer',
    textAlign: 'left',
  },
  kpiActive: {
    borderTopColor: 'var(--colorBrandStroke1)',
    borderRightColor: 'var(--colorBrandStroke1)',
    borderBottomColor: 'var(--colorBrandStroke1)',
    borderLeftColor: 'var(--colorBrandStroke1)',
  },
  kpiLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--colorNeutralForeground3)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '6px',
  },
  kpiValue: { fontSize: '28px', fontWeight: 700, lineHeight: 1 },
  nom: { fontWeight: 600, color: 'var(--colorNeutralForeground1)' },
  sub: { fontSize: '12px', color: 'var(--colorNeutralForeground3)' },
});

const SEVERITE_BADGE: Record<Severite, 'danger' | 'warning' | 'informative' | 'success'> = {
  bloquant: 'danger',
  attention: 'warning',
  info: 'informative',
  ok: 'success',
};

const SEVERITE_LABEL: Record<Severite, string> = {
  bloquant: 'Bloquant',
  attention: 'À surveiller',
  info: 'Informatif',
  ok: 'Opérationnel',
};

/** Colonnes Contact strictement nécessaires. La table en compte plus de cent :
 *  les demander toutes ralentirait l'écran sans rien apporter. */
const CHAMPS_CONTACT = [
  'contactid',
  'emailaddress1',
  'fullname',
  'statecode',
  '_afb_tiers_value',
  'adx_identity_logonenabled',
  'adx_identity_emailaddress1confirmed',
  'adx_identity_lastsuccessfullogin',
  'adx_identity_accessfailedcount',
  'adx_identity_lockoutenddate',
];

function frDate(value?: string, avecHeure = false): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return avecHeure ? d.toLocaleString('fr-FR') : d.toLocaleDateString('fr-FR');
}

/** Libellé de portée, aussi utilisé comme valeur de filtre. */
function porteeLabel(l: AccesTiers): string {
  if (!l.personnes.length) return 'Aucun accès';
  return l.accesPartage ? 'Accès partagé' : 'Accès dédié';
}

export default function SupportAcces() {
  const styles = useStyles();
  const { t } = useT();
  const { notifySuccess, notifyError } = useNotifications();

  const {
    data: fiches,
    isLoading: chargeContacts,
    error,
  } = contactsHooks.useList({ top: 1000, select: CHAMPS_CONTACT });
  const { data: comptes, isLoading: chargeComptes } = tiersExterneB2c.useList({ top: 500 });
  const { data: tousLesTiers, isLoading: chargeTiers } = tiersHooks.useList({ top: 1000 });
  const majContact = contactsHooks.useUpdate();
  const majCompte = tiersExterneB2c.useUpdate();

  const [ouvert, setOuvert] = useState<AccesTiers | null>(null);
  const [aDebloquer, setADebloquer] = useState<AccesPortail | null>(null);
  const [inviteOuvert, setInviteOuvert] = useState(false);

  const isLoading = chargeContacts || chargeComptes || chargeTiers;

  const lignes = useMemo(() => {
    const liste = (tousLesTiers ?? []) as unknown as TiersMinimal[];
    const parPersonne = agregerAcces(
      (fiches ?? []) as unknown as ContactPortail[],
      (comptes ?? []) as unknown as CompteB2c[],
      liste,
    );
    return agregerParTiers(parPersonne, liste);
  }, [fiches, comptes, tousLesTiers]);

  const compteurs = useMemo(() => compterParSeverite(lignes.map((l) => l.diagnostic)), [lignes]);

  /** Entreprises connues, pour le dialogue d'ouverture d'accès. */
  const nomParTiersId = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of (tousLesTiers ?? []) as unknown as TiersMinimal[]) {
      if (e.afb_tiersid && e.afb_nomdupartenaire) map.set(e.afb_tiersid, e.afb_nomdupartenaire);
    }
    return map;
  }, [tousLesTiers]);

  const debloquer = async (motif: string) => {
    const cible = aDebloquer;
    if (!cible) return;
    try {
      if (cible.contactId) {
        // Remet la fiche Contact dans l'état d'un compte utilisable : connexion
        // autorisée, verrouillage vidé, compteur d'échecs à zéro. `statecode`
        // couvre le cas d'une fiche désactivée.
        await majContact.mutateAsync({
          id: cible.contactId,
          changes: {
            statecode: 0,
            adx_identity_logonenabled: true,
            adx_identity_lockoutenddate: null,
            adx_identity_accessfailedcount: 0,
          } as unknown as Parameters<typeof majContact.mutateAsync>[0]['changes'],
        });
      }
      if (cible.compteB2cId) {
        await majCompte.mutateAsync({
          id: cible.compteB2cId,
          changes: {
            afb_statutducompte: STATUT_COMPTE.actif,
            afb_nombredetentativesechouees: 0,
          } as unknown as Parameters<typeof majCompte.mutateAsync>[0]['changes'],
        });
      }
      // L'action est journalisée automatiquement par createEntityHooks (auteur +
      // horodatage) : le motif saisi complète cette trace côté support.
      notifySuccess(t('Accès débloqué'), {
        description: `${cible.email}${motif ? ` · ${motif}` : ''}`,
      });
      setADebloquer(null);
      setOuvert(null);
    } catch (e) {
      notifyError(t('Déblocage impossible'), {
        description: e instanceof Error ? e.message : t('Erreur Dataverse.'),
      });
    }
  };

  const colonnes: Column<AccesTiers>[] = [
    {
      key: 'tiers',
      header: 'Tiers',
      sortValue: (l) => l.nom,
      searchValue: (l) => `${l.nom} ${l.pays ?? ''}`,
      render: (l) => (
        <div>
          <div className={styles.nom}>{l.nom}</div>
          {l.pays && <div className={styles.sub}>{l.pays}</div>}
        </div>
      ),
    },
    {
      key: 'acces',
      header: 'Accès',
      sortValue: (l) => l.personnes.length,
      searchValue: (l) => l.personnes.map((p) => `${p.email} ${p.nom ?? ''}`).join(' '),
      filterValue: porteeLabel,
      filterable: true,
      render: (l) =>
        l.personnes.length === 0 ? (
          <span className={styles.sub}>{t('Personne')}</span>
        ) : (
          <div>
            <div>
              {l.personnes.length > 1
                ? `${l.personnes.length} ${t('interlocuteurs')}`
                : l.personnes[0].email}
              {l.accesPartage && (
                <Badge appearance="outline" color="informative" style={{ marginLeft: 8 }}>
                  {t('partagé')}
                </Badge>
              )}
            </div>
            {l.personnes.length > 1 && (
              <div className={styles.sub}>{l.personnes.map((p) => p.email).join(' · ')}</div>
            )}
          </div>
        ),
    },
    {
      key: 'diagnostic',
      header: 'Diagnostic',
      // Tri par gravite : le support veut les bloquants en tete.
      sortValue: (l) => SEVERITE_ORDRE[l.diagnostic.severite],
      searchValue: (l) => l.diagnostic.libelle,
      // On filtre sur le LIBELLE de gravite, celui que porte la carte cliquable.
      filterValue: (l) => SEVERITE_LABEL[l.diagnostic.severite],
      filterable: true,
      render: (l) => (
        <div>
          <Badge appearance="filled" color={SEVERITE_BADGE[l.diagnostic.severite]}>
            {t(l.diagnostic.libelle)}
          </Badge>
          {l.bloquees > 0 && l.diagnostic.severite !== 'bloquant' && (
            <div className={styles.sub}>
              {l.bloquees} {l.bloquees > 1 ? t('bloqués') : t('bloqué')}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'connexion',
      header: 'Dernière connexion',
      sortValue: (l) => l.derniereConnexion,
      render: (l) => frDate(l.derniereConnexion, true),
    },
    {
      key: 'tentatives',
      header: 'Échecs',
      align: 'right',
      sortValue: (l) => l.tentatives,
      render: (l) => (l.tentatives > 0 ? String(l.tentatives) : '—'),
    },
  ];

  // Filtres et recherche derives des colonnes (cf. useTableFilters).
  const table = useTableFilters(lignes, colonnes);
  const { search, setSearch } = table;

  if (error) {
    return (
      <>
        <PageHeader title="Support · accès partenaires" />
        <Card>
          <p>
            {t('Lecture des comptes portail impossible.')} {error.message}
          </p>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Support"
        title="Support · accès partenaires"
        subtitle="Une ligne par tiers. Qui peut ouvrir son portail, et pourquoi certains n’y arrivent pas."
        actions={
          <Button
            appearance="primary"
            icon={<PersonAdd20Regular />}
            onClick={() => setInviteOuvert(true)}
          >
            {t('Ouvrir un accès')}
          </Button>
        }
      />

      {/* Compteurs cliquables : ils servent aussi de filtre rapide. */}
      <div className={styles.kpiRow}>
        {(['bloquant', 'attention', 'info', 'ok'] as Severite[]).map((s) => (
          <button
            key={s}
            type="button"
            className={`${styles.kpi} ${table.hasFilter('diagnostic', SEVERITE_LABEL[s]) ? styles.kpiActive : ''}`}
            onClick={() => table.toggleFilter('diagnostic', SEVERITE_LABEL[s])}
          >
            <div className={styles.kpiLabel}>{t(SEVERITE_LABEL[s])}</div>
            <div className={styles.kpiValue}>{compteurs[s]}</div>
          </button>
        ))}
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher un tiers, un pays, un e-mail, un diagnostic…"
        filters={table.filterConfigs}
      />

      <Card flush>
        {isLoading ? (
          <p style={{ padding: 24 }}>{t('Chargement des tiers et de leurs accès…')}</p>
        ) : (
          <DataTable
            columns={colonnes}
            rows={table.rows}
            rowKey={(l) => l.tiersId || 'sans-entreprise'}
            emptyMessage="Aucun tiers ne correspond à ce filtre."
            onRowClick={(l) => setOuvert(l)}
          />
        )}
      </Card>

      <AccesDetailDrawer
        tiers={ouvert}
        onClose={() => setOuvert(null)}
        frDate={frDate}
        onDebloquer={setADebloquer}
        debloquerEnCours={majContact.isPending || majCompte.isPending}
      />

      <InviterAccesDialog
        open={inviteOuvert}
        onOpenChange={setInviteOuvert}
        entreprises={nomParTiersId}
      />

      <ConfirmActionDialog
        open={Boolean(aDebloquer)}
        onOpenChange={(o) => !o && setADebloquer(null)}
        intent="validate"
        title={t('Débloquer cet accès ?')}
        description={t('Le partenaire pourra de nouveau se connecter. Vérifiez au préalable que son accès reste légitime.')}
        confirmLabel={t('Débloquer')}
        motifLabel={t('Motif du déblocage')}
        entityRef={aDebloquer?.email}
        onConfirm={debloquer}
      />
    </>
  );
}
