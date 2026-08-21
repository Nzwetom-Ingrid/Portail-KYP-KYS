/**
 * Panneau de détail d'un accès partenaire, ouvert depuis la console support.
 *
 * Extrait de SupportAcces pour tenir le seuil de 400 lignes (charte § 7.2), et
 * parce que ce panneau porte sa propre logique d'affichage : il doit rendre
 * lisible d'un coup d'œil le fait qu'une même personne pilote plusieurs
 * entreprises, et par quelle voie elle atteint le portail.
 */
import { Badge, Button, makeStyles } from '@fluentui/react-components';
import { ArrowClockwise20Regular } from '@fluentui/react-icons';
import { DetailDrawer, DrawerSection, FieldGrid } from '@/components/common/DetailDrawer';
import { useT } from '@/i18n/i18n';
import { CANAL_LABEL, type AccesPortail } from '@/lib/support/accesPortail';
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
  liste: { margin: 0, paddingLeft: '18px', lineHeight: 1.7 },
  canaux: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
});

const SEVERITE_BADGE: Record<Severite, 'danger' | 'warning' | 'informative' | 'success'> = {
  bloquant: 'danger',
  attention: 'warning',
  info: 'informative',
  ok: 'success',
};

interface AccesDetailDrawerProps {
  acces: AccesPortail | null;
  onClose: () => void;
  /** Formatage des dates, partagé avec le tableau. */
  frDate: (value?: string, avecHeure?: boolean) => string;
  /** Affiché seulement si un déblocage est possible depuis l'application. */
  peutDebloquer: boolean;
  debloquerEnCours: boolean;
  onDebloquer: () => void;
}

export function AccesDetailDrawer({
  acces,
  onClose,
  frDate,
  peutDebloquer,
  debloquerEnCours,
  onDebloquer,
}: AccesDetailDrawerProps) {
  const styles = useStyles();
  const { t } = useT();

  return (
    <DetailDrawer
      open={Boolean(acces)}
      onOpenChange={(o) => !o && onClose()}
      title={acces?.email ?? ''}
      subtitle={acces?.nom}
    >
      {acces && (
        <>
          <DrawerSection title={t('Diagnostic')}>
            <div style={{ marginBottom: 12 }}>
              <Badge appearance="filled" color={SEVERITE_BADGE[acces.diagnostic.severite]}>
                {t(acces.diagnostic.libelle)}
              </Badge>
            </div>
            <p style={{ marginTop: 0 }}>{t(acces.diagnostic.symptome)}</p>
            <div className={styles.actionBox}>
              <span className={styles.actionLabel}>{t('Ce qu’il faut faire')}</span>
              {t(acces.diagnostic.action)}
            </div>
          </DrawerSection>

          <DrawerSection
            title={
              acces.entreprises.length > 1
                ? `${t('Entreprises accessibles')} (${acces.entreprises.length})`
                : t('Entreprise accessible')
            }
            description={
              acces.entreprises.length > 1
                ? t('Cette personne bascule d’une entreprise à l’autre depuis le sélecteur du portail. Un blocage de son accès les concerne toutes.')
                : undefined
            }
          >
            {acces.entreprises.length ? (
              <ul className={styles.liste}>
                {acces.entreprises.map((e) => (
                  <li key={e.id}>{e.nom}</li>
                ))}
              </ul>
            ) : (
              <p style={{ margin: 0 }}>{t('Aucune — le portail s’ouvrira vide.')}</p>
            )}
          </DrawerSection>

          <DrawerSection
            title={t('Voies d’accès')}
            description={t('Le portail explore les trois voies et fusionne ce qu’il trouve. Une seule suffit à se connecter.')}
          >
            <div className={styles.canaux}>
              {acces.canaux.map((c) => (
                <Badge key={c} appearance="outline" color="informative">
                  {t(CANAL_LABEL[c])}
                </Badge>
              ))}
            </div>
          </DrawerSection>

          <DrawerSection title={t('Traces du compte')}>
            <FieldGrid
              fields={[
                { label: t('Identité de connexion'), value: acces.email },
                {
                  label: t('Fiche Contact (authentification)'),
                  value: acces.contactId ? t('Existe') : t('Absente'),
                },
                {
                  label: t('Identité externe'),
                  value: acces.compteB2cId
                    ? acces.compteB2cCree
                      ? t('Compte Azure créé')
                      : t('Compte Azure jamais créé')
                    : t('Absente'),
                },
                { label: t('Invitation envoyée le'), value: frDate(acces.invitation) },
                { label: t('Dernière connexion'), value: frDate(acces.derniereConnexion, true) },
                { label: t('Tentatives échouées'), value: String(acces.tentatives) },
              ]}
            />
          </DrawerSection>

          {peutDebloquer && (
            <DrawerSection
              title={t('Action')}
              description={t('Réactive la connexion portail, vide le verrouillage et remet le compteur d’échecs à zéro.')}
            >
              <Button
                appearance="primary"
                icon={<ArrowClockwise20Regular />}
                disabled={debloquerEnCours}
                onClick={onDebloquer}
              >
                {t('Débloquer l’accès')}
              </Button>
            </DrawerSection>
          )}
        </>
      )}
    </DetailDrawer>
  );
}
