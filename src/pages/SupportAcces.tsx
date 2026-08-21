/**
 * Console support — accès des partenaires externes.
 *
 * Écran destiné au support IT lorsqu'un partenaire appelle en disant « je
 * n'arrive pas à me connecter ». Il évite d'ouvrir Dataverse, Azure et Power
 * Pages en parallèle : la cause est déduite des traces déjà enregistrées.
 *
 * L'écran lisait auparavant la seule table `afb_tiersexterneb2c`, un miroir
 * alimenté par le flux d'invitation : cinq lignes pour une quarantaine de
 * tiers, et aucune trace d'authentification réelle. Il s'appuie désormais sur
 * la vue consolidée `accesPortail`, qui part de la table CONTACT — celle que
 * Power Pages utilise pour authentifier — et fusionne les trois voies d'accès.
 *
 * Une ligne = UNE PERSONNE. Celle qui pilote trois sociétés apparaît une fois,
 * avec ses trois entreprises : c'est aussi ce qui rend visibles les mandataires
 * multi-entreprises, invisibles jusqu'ici.
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
import { compterParSeverite, STATUT_COMPTE, type Severite } from '@/lib/support/accessDiagnostic';

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
  mail: { fontWeight: 600, color: 'var(--colorNeutralForeground1)' },
  sub: { fontSize: '12px', color: 'var(--colorNeutralForeground3)' },
  multi: { fontWeight: 700 },
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

/** Ordre de gravité pour le tri : le support veut les bloquants en tête, ce
 *  qu'un tri alphabétique des libellés ne donnerait jamais. */
const SEVERITE_ORDRE: Record<Severite, number> = { bloquant: 1, attention: 2, info: 3, ok: 4 };

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
function porteeLabel(n: number): string {
  if (n === 0) return 'Aucune entreprise';
  return n > 1 ? 'Plusieurs entreprises' : 'Une entreprise';
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

  const [ouvert, setOuvert] = useState<AccesPortail | null>(null);
  const [confirmOuvert, setConfirmOuvert] = useState(false);
  const [inviteOuvert, setInviteOuvert] = useState(false);

  const isLoading = chargeContacts || chargeComptes || chargeTiers;

  const lignes = useMemo(
    () =>
      agregerAcces(
        (fiches ?? []) as unknown as ContactPortail[],
        (comptes ?? []) as unknown as CompteB2c[],
        (tousLesTiers ?? []) as unknown as TiersMinimal[],
      ),
    [fiches, comptes, tousLesTiers],
  );

  const compteurs = useMemo(() => compterParSeverite(lignes.map((l) => l.diagnostic)), [lignes]);

  /** Entreprises connues, pour le dialogue d'ouverture d'accès. */
  const nomParTiersId = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of (tousLesTiers ?? []) as unknown as TiersMinimal[]) {
      if (e.afb_tiersid && e.afb_nomdupartenaire) map.set(e.afb_tiersid, e.afb_nomdupartenaire);
    }
    return map;
  }, [tousLesTiers]);

  /** Le déblocage n'a de sens que si l'application peut écrire quelque part :
   *  une fiche Contact, ou à défaut l'identité externe. */
  const peutDebloquer = Boolean(ouvert?.contactId || ouvert?.compteB2cId);

  const debloquer = async (motif: string) => {
    if (!ouvert) return;
    try {
      if (ouvert.contactId) {
        // Remet la fiche Contact dans l'état d'un compte utilisable : connexion
        // autorisée, verrouillage vidé, compteur d'échecs à zéro. `statecode`
        // couvre le cas d'une fiche désactivée.
        await majContact.mutateAsync({
          id: ouvert.contactId,
          changes: {
            statecode: 0,
            adx_identity_logonenabled: true,
            adx_identity_lockoutenddate: null,
            adx_identity_accessfailedcount: 0,
          } as unknown as Parameters<typeof majContact.mutateAsync>[0]['changes'],
        });
      }
      if (ouvert.compteB2cId) {
        await majCompte.mutateAsync({
          id: ouvert.compteB2cId,
          changes: {
            afb_statutducompte: STATUT_COMPTE.actif,
            afb_nombredetentativesechouees: 0,
          } as unknown as Parameters<typeof majCompte.mutateAsync>[0]['changes'],
        });
      }
      // L'action est journalisée automatiquement par createEntityHooks (auteur +
      // horodatage) : le motif saisi complète cette trace côté support.
      notifySuccess(t('Accès débloqué'), {
        description: `${ouvert.email}${motif ? ` · ${motif}` : ''}`,
      });
      setConfirmOuvert(false);
      setOuvert(null);
    } catch (e) {
      notifyError(t('Déblocage impossible'), {
        description: e instanceof Error ? e.message : t('Erreur Dataverse.'),
      });
    }
  };

  const colonnes: Column<AccesPortail>[] = [
    {
      key: 'email',
      header: 'Identité de connexion',
      sortValue: (l) => l.email,
      searchValue: (l) => `${l.email} ${l.nom ?? ''}`,
      render: (l) => (
        <div>
          <div className={styles.mail}>{l.email}</div>
          {l.nom && <div className={styles.sub}>{l.nom}</div>}
        </div>
      ),
    },
    {
      key: 'entreprises',
      header: 'Entreprises',
      // Tri par nombre : les mandataires multi-entreprises se regroupent.
      sortValue: (l) => l.entreprises.length,
      searchValue: (l) => l.entreprises.map((e) => e.nom).join(' '),
      filterValue: (l) => porteeLabel(l.entreprises.length),
      filterable: true,
      render: (l) =>
        l.entreprises.length === 0 ? (
          <span className={styles.sub}>{t('Aucune')}</span>
        ) : (
          <div>
            <div className={l.entreprises.length > 1 ? styles.multi : undefined}>
              {l.entreprises.length > 1
                ? `${l.entreprises.length} ${t('entreprises')}`
                : l.entreprises[0].nom}
            </div>
            {l.entreprises.length > 1 && (
              <div className={styles.sub}>{l.entreprises.map((e) => e.nom).join(' · ')}</div>
            )}
          </div>
        ),
    },
    {
      key: 'diagnostic',
      header: 'Diagnostic',
      sortValue: (l) => SEVERITE_ORDRE[l.diagnostic.severite],
      searchValue: (l) => l.diagnostic.libelle,
      // On filtre sur le LIBELLE de gravite, celui que porte la carte cliquable.
      filterValue: (l) => SEVERITE_LABEL[l.diagnostic.severite],
      filterable: true,
      render: (l) => (
        <Badge appearance="filled" color={SEVERITE_BADGE[l.diagnostic.severite]}>
          {t(l.diagnostic.libelle)}
        </Badge>
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
        subtitle="Pourquoi un partenaire n’arrive-t-il pas à se connecter ? Une ligne par personne, toutes voies d’accès confondues."
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
        searchPlaceholder="Rechercher un e-mail, une personne, une entreprise, un diagnostic…"
        filters={table.filterConfigs}
      />

      <Card flush>
        {isLoading ? (
          <p style={{ padding: 24 }}>{t('Chargement des comptes portail…')}</p>
        ) : (
          <DataTable
            columns={colonnes}
            rows={table.rows}
            rowKey={(l) => l.email}
            emptyMessage="Aucun accès ne correspond à ce filtre."
            onRowClick={(l) => setOuvert(l)}
          />
        )}
      </Card>

      <AccesDetailDrawer
        acces={ouvert}
        onClose={() => setOuvert(null)}
        frDate={frDate}
        peutDebloquer={peutDebloquer}
        debloquerEnCours={majContact.isPending || majCompte.isPending}
        onDebloquer={() => setConfirmOuvert(true)}
      />

      <InviterAccesDialog
        open={inviteOuvert}
        onOpenChange={setInviteOuvert}
        entreprises={nomParTiersId}
      />

      <ConfirmActionDialog
        open={confirmOuvert}
        onOpenChange={(o) => !o && setConfirmOuvert(false)}
        intent="validate"
        title={t('Débloquer cet accès ?')}
        description={t('Le partenaire pourra de nouveau se connecter. Vérifiez au préalable que son accès reste légitime.')}
        confirmLabel={t('Débloquer')}
        motifLabel={t('Motif du déblocage')}
        entityRef={ouvert?.email}
        onConfirm={debloquer}
      />
    </>
  );
}
