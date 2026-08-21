/**
 * Panneau de détail d'un TIERS, ouvert depuis la console support.
 *
 * L'écran liste les entreprises ; ce panneau descend d'un cran et montre qui
 * peut ouvrir le portail pour celle-ci. Chaque interlocuteur porte son propre
 * diagnostic et sa propre action : une entreprise « servie » peut très bien
 * avoir un dirigeant bloqué à côté d'un juriste opérationnel.
 *
 * Extrait de SupportAcces pour tenir le seuil de 400 lignes (charte § 7.2).
 */
import { Badge, Button, makeStyles } from '@fluentui/react-components';
import { ArrowClockwise20Regular } from '@fluentui/react-icons';
import { DetailDrawer, DrawerSection } from '@/components/common/DetailDrawer';
import { useT } from '@/i18n/i18n';
import { CANAL_LABEL, type AccesPortail } from '@/lib/support/accesPortail';
import type { AccesTiers } from '@/lib/support/accesParTiers';
import type { Severite } from '@/lib/support/accessDiagnostic';

const useStyles = makeStyles({
  actionBox: {
    padding: '12px 14px',
    borderRadius: '8px',
    backgroundColor: 'var(--colorNeutralBackground3)',
    fontSize: '13.5px',
    lineHeight: 1.55,
  },
  actionLabel: { fontWeight: 700, display: 'block', marginBottom: '4px' },
  personne: {
    padding: '14px 16px',
    borderRadius: '10px',
    border: '1px solid var(--colorNeutralStroke2)',
    marginBottom: '10px',
  },
  personneTete: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    marginBottom: '8px',
  },
  mail: { fontWeight: 600, color: 'var(--colorNeutralForeground1)' },
  sub: { fontSize: '12px', color: 'var(--colorNeutralForeground3)' },
  ligne: { fontSize: '13px', margin: '4px 0 0' },
  canaux: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' },
  vide: { margin: 0, color: 'var(--colorNeutralForeground3)' },
});

const SEVERITE_BADGE: Record<Severite, 'danger' | 'warning' | 'informative' | 'success'> = {
  bloquant: 'danger',
  attention: 'warning',
  info: 'informative',
  ok: 'success',
};

interface AccesDetailDrawerProps {
  tiers: AccesTiers | null;
  onClose: () => void;
  frDate: (value?: string, avecHeure?: boolean) => string;
  /** Déblocage d'un interlocuteur précis, pas de l'entreprise entière. */
  onDebloquer: (personne: AccesPortail) => void;
  debloquerEnCours: boolean;
}

export function AccesDetailDrawer({
  tiers,
  onClose,
  frDate,
  onDebloquer,
  debloquerEnCours,
}: AccesDetailDrawerProps) {
  const styles = useStyles();
  const { t } = useT();

  return (
    <DetailDrawer
      open={Boolean(tiers)}
      onOpenChange={(o) => !o && onClose()}
      title={tiers?.nom ?? ''}
      subtitle={tiers?.pays}
    >
      {tiers && (
        <>
          <DrawerSection title={t('État de l’entreprise')}>
            <div style={{ marginBottom: 12 }}>
              <Badge appearance="filled" color={SEVERITE_BADGE[tiers.diagnostic.severite]}>
                {t(tiers.diagnostic.libelle)}
              </Badge>
            </div>
            <p style={{ marginTop: 0 }}>{t(tiers.diagnostic.symptome)}</p>
            <div className={styles.actionBox}>
              <span className={styles.actionLabel}>{t('Ce qu’il faut faire')}</span>
              {t(tiers.diagnostic.action)}
            </div>
            {tiers.bloquees > 0 && tiers.diagnostic.severite !== 'bloquant' && (
              <p className={styles.ligne}>
                {tiers.bloquees}{' '}
                {tiers.bloquees > 1
                  ? t('interlocuteurs sont bloqués malgré tout — voir ci-dessous.')
                  : t('interlocuteur est bloqué malgré tout — voir ci-dessous.')}
              </p>
            )}
          </DrawerSection>

          <DrawerSection
            title={`${t('Interlocuteurs')} (${tiers.personnes.length})`}
            description={t('Les personnes qui peuvent ouvrir le portail pour cette entreprise, les plus en difficulté d’abord.')}
          >
            {tiers.personnes.length === 0 ? (
              <p className={styles.vide}>
                {t('Aucun interlocuteur. Ouvrez un accès, ou renseignez l’e-mail du contact principal sur la fiche du tiers.')}
              </p>
            ) : (
              tiers.personnes.map((p) => {
                const autres = p.entreprises.filter((e) => e.id !== tiers.tiersId);
                return (
                  <div key={p.email} className={styles.personne}>
                    <div className={styles.personneTete}>
                      <div style={{ minWidth: 0 }}>
                        <div className={styles.mail}>{p.email}</div>
                        {p.nom && <div className={styles.sub}>{p.nom}</div>}
                      </div>
                      <Badge appearance="filled" color={SEVERITE_BADGE[p.diagnostic.severite]}>
                        {t(p.diagnostic.libelle)}
                      </Badge>
                    </div>

                    <p className={styles.ligne}>{t(p.diagnostic.symptome)}</p>
                    <p className={`${styles.ligne} ${styles.sub}`}>
                      {t('Dernière connexion')} : {frDate(p.derniereConnexion, true)}
                      {p.tentatives > 0 ? ` · ${p.tentatives} ${t('échecs')}` : ''}
                    </p>

                    {autres.length > 0 && (
                      <p className={`${styles.ligne} ${styles.sub}`}>
                        {t('Pilote aussi')} : {autres.map((e) => e.nom).join(' · ')}
                      </p>
                    )}

                    <div className={styles.canaux}>
                      {p.canaux.map((c) => (
                        <Badge key={c} appearance="outline" color="informative">
                          {t(CANAL_LABEL[c])}
                        </Badge>
                      ))}
                    </div>

                    {(p.contactId || p.compteB2cId) && p.diagnostic.severite !== 'ok' && (
                      <div style={{ marginTop: 12 }}>
                        <Button
                          size="small"
                          appearance="primary"
                          icon={<ArrowClockwise20Regular />}
                          disabled={debloquerEnCours}
                          onClick={() => onDebloquer(p)}
                        >
                          {t('Débloquer l’accès')}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </DrawerSection>
        </>
      )}
    </DetailDrawer>
  );
}
