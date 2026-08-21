/**
 * Console support — accès des partenaires externes.
 *
 * Écran destiné au support IT lorsqu'un partenaire appelle en disant « je n'arrive
 * pas à me connecter ». Il évite d'avoir à ouvrir Dataverse, Azure et Power Pages
 * en parallèle : tout est déduit des traces déjà présentes sur afb_tiersexterneb2c.
 *
 * Aucune table ni colonne nouvelle, aucun flux : l'écran lit l'existant et
 * n'écrit que le statut du compte, sur une table déjà exposée.
 */
import { useMemo, useState } from 'react';
import { Badge, Button, makeStyles } from '@fluentui/react-components';
import { ArrowClockwise20Regular, PersonAdd20Regular } from '@fluentui/react-icons';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';
import { FilterBar } from '@/components/common/FilterBar';
import { DataTable, type Column } from '@/components/common/DataTable';
import { useTableFilters } from '@/lib/tables/useTableFilters';
import { DetailDrawer, DrawerSection, FieldGrid } from '@/components/common/DetailDrawer';
import { ConfirmActionDialog } from '@/components/common/ConfirmActionDialog';
import { InviterAccesDialog } from '@/components/support/InviterAccesDialog';
import { useNotifications } from '@/components/common/NotificationProvider';
import { tiers as tiersHooks, tiersExterneB2c } from '@/lib/dataverse/entityHooks';
import { useT } from '@/i18n/i18n';
import {
  compterParSeverite,
  diagnostiquer,
  STATUT_COMPTE,
  type CompteExterne,
  type Diagnostic,
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
  kpiActive: { borderTopColor: 'var(--colorBrandStroke1)', borderRightColor: 'var(--colorBrandStroke1)', borderBottomColor: 'var(--colorBrandStroke1)', borderLeftColor: 'var(--colorBrandStroke1)' },
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
  actionBox: {
    padding: '12px 14px',
    borderRadius: '8px',
    backgroundColor: 'var(--colorNeutralBackground3)',
    fontSize: '13.5px',
    lineHeight: 1.55,
  },
  actionLabel: { fontWeight: 700, display: 'block', marginBottom: '4px' },
});

/** Sévérité → apparence du badge Fluent. */
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

/** Ligne du tableau : l'enregistrement Dataverse enrichi de son diagnostic.
 *  Les champs `*Tri` portent la valeur BRUTE des dates : trier sur « 19/08/2026 »
 *  reviendrait à trier par jour du mois. */
interface LigneSupport {
  id: string;
  email: string;
  tiers: string;
  diagnostic: Diagnostic;
  invitation: string;
  invitationTri?: string;
  derniereConnexion: string;
  connexionTri?: string;
  tentatives: number;
  statutCompte?: number;
  compteB2cCree: boolean;
}

function frDate(value?: string, avecHeure = false): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return avecHeure ? d.toLocaleString('fr-FR') : d.toLocaleDateString('fr-FR');
}

export default function SupportAcces() {
  const styles = useStyles();
  const { t } = useT();
  const { notifySuccess, notifyError } = useNotifications();

  const { data: comptes, isLoading, error } = tiersExterneB2c.useList({ top: 500 });
  const majCompte = tiersExterneB2c.useUpdate();
  const { data: tousLesTiers } = tiersHooks.useList({ top: 500 });
  const [ouvert, setOuvert] = useState<LigneSupport | null>(null);
  const [confirmOuvert, setConfirmOuvert] = useState(false);
  const [inviteOuvert, setInviteOuvert] = useState(false);


  // Le nom du tiers est résolu par jointure sur la liste des tiers plutôt que
  // lu depuis le lookup : la requête sur afb_tiersexterneb2c ne renvoie pas le
  // libellé formaté, et la colonne affichait « — » pour tout le monde.
  const nomParTiersId = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tousLesTiers ?? []) {
      const raw = t as unknown as { afb_tiersid?: string; afb_nomdupartenaire?: string };
      if (raw.afb_tiersid && raw.afb_nomdupartenaire) map.set(raw.afb_tiersid, raw.afb_nomdupartenaire);
    }
    return map;
  }, [tousLesTiers]);

  const lignes = useMemo<LigneSupport[]>(() => {
    return (comptes ?? []).map((c) => {
      const compte = c as unknown as CompteExterne & {
        afb_tiersexterneb2cid: string;
        afb_nomdutiersname?: string;
      };
      const tiersId = compte._afb_nomdutiers_value;
      return {
        id: compte.afb_tiersexterneb2cid,
        email: compte.afb_emaildauthentification ?? '—',
        tiers:
          compte.afb_nomdutiersname ??
          (tiersId ? nomParTiersId.get(tiersId) : undefined) ??
          '—',
        diagnostic: diagnostiquer(compte),
        invitation: frDate(compte.afb_datedinvitation),
        invitationTri: compte.afb_datedinvitation,
        derniereConnexion: frDate(compte.afb_derniereconnexion, true),
        connexionTri: compte.afb_derniereconnexion,
        tentatives: compte.afb_nombredetentativesechouees ?? 0,
        statutCompte: compte.afb_statutducompte,
        compteB2cCree: Boolean(compte.afb_identifiantb2c),
      };
    });
  }, [comptes, nomParTiersId]);

  const compteurs = useMemo(
    () => compterParSeverite(lignes.map((l) => l.diagnostic)),
    [lignes],
  );


  const reactiver = async (motif: string) => {
    if (!ouvert) return;
    try {
      await majCompte.mutateAsync({
        id: ouvert.id,
        changes: { afb_statutducompte: STATUT_COMPTE.actif } as unknown as Parameters<
          typeof majCompte.mutateAsync
        >[0]['changes'],
      });
      // La réactivation est journalisée automatiquement par createEntityHooks
      // (auteur + horodatage) : le motif saisi complète cette trace côté support.
      notifySuccess(t('Compte réactivé'), {
        description: `${ouvert.email}${motif ? ` · ${motif}` : ''}`,
      });
      setConfirmOuvert(false);
      setOuvert(null);
    } catch (e) {
      notifyError(t('Réactivation impossible'), {
        description: e instanceof Error ? e.message : t('Erreur Dataverse.'),
      });
    }
  };

  const colonnes: Column<LigneSupport>[] = [
    {
      key: 'email',
      header: 'Identité de connexion',
      sortValue: (l) => l.email,
      render: (l) => (
        <div>
          <div className={styles.mail}>{l.email}</div>
          <div className={styles.sub}>{l.tiers}</div>
        </div>
      ),
    },
    {
      key: 'diagnostic',
      header: 'Diagnostic',
      // Tri par gravite : le support veut voir les bloquants en tete.
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
    { key: 'invitation', header: 'Invitation', sortValue: (l) => l.invitationTri, render: (l) => l.invitation },
    { key: 'connexion', header: 'Dernière connexion', sortValue: (l) => l.connexionTri, render: (l) => l.derniereConnexion },
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
  const visibles = table.rows;


  if (error) {
    return (
      <>
        <PageHeader title="Support · accès partenaires" />
        <Card>
          <p>{t('Lecture des identités externes impossible.')} {error.message}</p>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Support"
        title="Support · accès partenaires"
        subtitle="Pourquoi un partenaire n’arrive-t-il pas à se connecter ? Le diagnostic est déduit des traces de son identité externe."
        actions={
          <Button appearance="primary" icon={<PersonAdd20Regular />} onClick={() => setInviteOuvert(true)}>
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
        searchPlaceholder="Rechercher un e-mail, un tiers, un diagnostic…"
        filters={table.filterConfigs}
      />

      <Card flush>
        {isLoading ? (
          <p style={{ padding: 24 }}>{t('Chargement des identités externes…')}</p>
        ) : (
          <DataTable
            columns={colonnes}
            rows={visibles}
            rowKey={(l) => l.id}
            emptyMessage="Aucune identité externe ne correspond à ce filtre."
            onRowClick={(l) => setOuvert(l)}
          />
        )}
      </Card>

      <DetailDrawer
        open={Boolean(ouvert)}
        onOpenChange={(o) => !o && setOuvert(null)}
        title={ouvert?.email ?? ''}
        subtitle={ouvert?.tiers}
      >
        {ouvert && (
          <>
            <DrawerSection title={t('Diagnostic')}>
              <div style={{ marginBottom: 12 }}>
                <Badge appearance="filled" color={SEVERITE_BADGE[ouvert.diagnostic.severite]}>
                  {t(ouvert.diagnostic.libelle)}
                </Badge>
              </div>
              <p style={{ marginTop: 0 }}>{t(ouvert.diagnostic.symptome)}</p>
              <div className={styles.actionBox}>
                <span className={styles.actionLabel}>{t('Ce qu’il faut faire')}</span>
                {t(ouvert.diagnostic.action)}
              </div>
            </DrawerSection>

            <DrawerSection title={t('Traces du compte')}>
              <FieldGrid
                fields={[
                  { label: t('Identité de connexion'), value: ouvert.email },
                  { label: t('Tiers rattaché'), value: ouvert.tiers },
                  {
                    label: t('Compte Azure AD B2C'),
                    value: ouvert.compteB2cCree ? t('Créé') : t('Jamais créé'),
                  },
                  { label: t('Invitation envoyée le'), value: ouvert.invitation },
                  { label: t('Dernière connexion'), value: ouvert.derniereConnexion },
                  { label: t('Tentatives échouées'), value: String(ouvert.tentatives) },
                ]}
              />
            </DrawerSection>

            {(ouvert.statutCompte === STATUT_COMPTE.desactive ||
              ouvert.statutCompte === STATUT_COMPTE.bloque) && (
              <DrawerSection
                title={t('Action')}
                description={t('Le déblocage côté Azure AD B2C reste à effectuer séparément lorsque le compte y est verrouillé.')}
              >
                <Button
                  appearance="primary"
                  icon={<ArrowClockwise20Regular />}
                  disabled={majCompte.isPending}
                  onClick={() => setConfirmOuvert(true)}
                >
                  {t('Réactiver le compte')}
                </Button>
              </DrawerSection>
            )}
          </>
        )}
      </DetailDrawer>

      <InviterAccesDialog open={inviteOuvert} onOpenChange={setInviteOuvert} entreprises={nomParTiersId} />

      <ConfirmActionDialog
        open={confirmOuvert}
        onOpenChange={(o) => !o && setConfirmOuvert(false)}
        intent="validate"
        title={t('Réactiver ce compte ?')}
        description={t('Le partenaire pourra de nouveau se connecter. Vérifiez au préalable que son accès reste légitime.')}
        confirmLabel={t('Réactiver')}
        motifLabel={t('Motif de la réactivation')}
        entityRef={ouvert?.email}
        onConfirm={reactiver}
      />
    </>
  );
}
