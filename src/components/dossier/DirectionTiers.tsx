/**
 * Direction du tiers — gérants et représentant légal.
 *
 * La conformité ne voyait aucun dirigeant. L'onboarding en collectait un seul,
 * et n'enregistrait même pas ses champs : le partenaire remplissait l'écran et
 * tout était perdu. Les gérants ont désormais leur table, et c'est sur eux que
 * porte le contrôle de sanctions — les afficher ici n'est donc pas un confort,
 * c'est ce qui permet de faire la diligence.
 */
import { Badge, makeStyles } from '@fluentui/react-components';
import { useT } from '@/i18n/i18n';

const useStyles = makeStyles({
  liste: { display: 'flex', flexDirection: 'column', gap: '10px' },
  carte: {
    border: '1px solid var(--colorNeutralStroke2)',
    borderRadius: '10px',
    padding: '12px 14px',
  },
  tete: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: '10px',
    marginBottom: '4px',
  },
  nom: { fontWeight: 700, fontSize: '13.5px' },
  fonction: { fontSize: '12.5px', color: 'var(--text-muted)' },
  ligne: { margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text-muted)' },
  vide: { fontSize: '13px', color: 'var(--text-muted)', margin: 0 },
});

/** Valeurs de choix `afb_typedepiecedidentite`. */
const PIECE: Record<number, string> = {
  0: 'CNI',
  1: 'Passeport',
  2: 'Titre de séjour',
};

/** `afb_representantlegal` est un choix Oui/Non, où 0 vaut Oui. */
const REPRESENTANT_OUI = 0;

export interface GerantBrut {
  afb_employe1id?: string;
  afb_nomcomplet?: string;
  afb_fonction?: string;
  afb_adresseemail?: string;
  afb_numerodetelephone?: string;
  afb_nationalite?: string;
  afb_datedenaissance?: string;
  afb_typedepiecedidentite?: number;
  afb_numerodepiecedidentite?: string;
  afb_representantlegal?: number;
  afb_rang?: number;
}

interface DirectionTiersProps {
  gerants: GerantBrut[];
  frDate: (value?: string) => string;
}

export function DirectionTiers({ gerants, frDate }: DirectionTiersProps) {
  const styles = useStyles();
  const { t } = useT();

  if (!gerants.length) {
    return (
      <p className={styles.vide}>
        {t('Aucun dirigeant déclaré. Le partenaire les renseigne à l’étape « Direction » de son onboarding.')}
      </p>
    );
  }

  const ordonnes = [...gerants].sort((a, b) => (a.afb_rang ?? 0) - (b.afb_rang ?? 0));

  return (
    <div className={styles.liste}>
      {ordonnes.map((g) => (
        <div key={g.afb_employe1id} className={styles.carte}>
          <div className={styles.tete}>
            <div>
              <div className={styles.nom}>{g.afb_nomcomplet || '—'}</div>
              <div className={styles.fonction}>{g.afb_fonction || '—'}</div>
            </div>
            {g.afb_representantlegal === REPRESENTANT_OUI && (
              <Badge appearance="filled" color="brand">
                {t('Représentant légal')}
              </Badge>
            )}
          </div>

          <p className={styles.ligne}>
            {g.afb_adresseemail || '—'}
            {g.afb_numerodetelephone ? ` · ${g.afb_numerodetelephone}` : ''}
          </p>
          <p className={styles.ligne}>
            {/* Nationalité et date de naissance ne sont pas décoratives : sans
                elles, un contrôle de sanctions sur le seul nom remonte des
                dizaines de correspondances à écarter à la main. */}
            {g.afb_nationalite || t('Nationalité non renseignée')}
            {g.afb_datedenaissance ? ` · ${t('né(e) le')} ${frDate(g.afb_datedenaissance)}` : ''}
          </p>
          {(g.afb_typedepiecedidentite !== undefined || g.afb_numerodepiecedidentite) && (
            <p className={styles.ligne}>
              {PIECE[g.afb_typedepiecedidentite ?? -1] ?? t('Pièce')}
              {g.afb_numerodepiecedidentite ? ` · ${g.afb_numerodepiecedidentite}` : ''}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
