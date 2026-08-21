/**
 * Rubrique « Demandes » du dossier — ce que le partenaire a écrit, et la
 * réponse de la conformité.
 *
 * Une demande de revue apparaissait jusqu'ici dans la liste des pièces
 * déposées, avec un statut « En attente » et des boutons Valider / Rejeter qui
 * n'avaient aucun sens pour un message. Surtout, personne ne pouvait y
 * répondre : le partenaire écrivait dans le vide et n'avait aucun moyen de
 * savoir si sa demande avait été lue.
 *
 * Le fil se lit ici de haut en bas, la demande la plus récente en premier —
 * c'est celle qui attend une réaction.
 */
import { useState } from 'react';
import { Button, Textarea, makeStyles } from '@fluentui/react-components';
import { CheckmarkCircle20Regular, Send20Regular } from '@fluentui/react-icons';
import { useT } from '@/i18n/i18n';
import type { Demande } from '@/lib/demandes/demandes';

const useStyles = makeStyles({
  liste: { display: 'flex', flexDirection: 'column', gap: '14px' },
  fil: {
    border: '1px solid var(--colorNeutralStroke2)',
    borderRadius: '10px',
    padding: '14px 16px',
  },
  tete: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: '10px',
    marginBottom: '8px',
  },
  titre: { fontWeight: 700, fontSize: '13.5px' },
  meta: { fontSize: '12px', color: 'var(--text-muted)' },
  statut: {
    fontSize: '11px',
    fontWeight: 700,
    padding: '3px 9px',
    borderRadius: '999px',
    whiteSpace: 'nowrap',
  },
  message: {
    margin: '0 0 10px',
    fontSize: '13.5px',
    lineHeight: 1.55,
    whiteSpace: 'pre-wrap',
  },
  reponse: {
    borderLeft: '3px solid var(--colorBrandStroke1)',
    padding: '8px 0 8px 12px',
    marginBottom: '8px',
  },
  reponseTexte: { margin: 0, fontSize: '13px', lineHeight: 1.5, whiteSpace: 'pre-wrap' },
  actions: { display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'flex-start' },
  vide: { fontSize: '13px', color: 'var(--text-muted)', margin: 0 },
});

interface DemandesPartenaireProps {
  demandes: Demande[];
  /** Envoie une réponse et rouvre le fil côté partenaire. */
  onRepondre: (demande: Demande, texte: string) => Promise<void>;
  /** Clôt la demande sans nécessairement écrire quoi que ce soit. */
  onClore: (demande: Demande) => Promise<void>;
  enCours: boolean;
  /** Formatage des dates, partagé avec le reste du tiroir. */
  frDate: (value?: string) => string;
}

export function DemandesPartenaire({
  demandes,
  onRepondre,
  onClore,
  enCours,
  frDate,
}: DemandesPartenaireProps) {
  const styles = useStyles();
  const { t } = useT();
  // Un brouillon par fil : répondre à une demande ne doit pas effacer ce qui a
  // été commencé sur une autre.
  const [brouillons, setBrouillons] = useState<Record<string, string>>({});

  const ecrire = (id: string, texte: string) =>
    setBrouillons((b) => ({ ...b, [id]: texte }));

  const envoyer = async (d: Demande) => {
    const texte = (brouillons[d.id] ?? '').trim();
    if (!texte) return;
    await onRepondre(d, texte);
    setBrouillons((b) => ({ ...b, [d.id]: '' }));
  };

  if (!demandes.length) {
    return (
      <p className={styles.vide}>
        {t('Aucune demande. Le partenaire peut en émettre depuis son espace, lorsqu’il souhaite faire réexaminer son dossier ou réclamer une pièce à la banque.')}
      </p>
    );
  }

  return (
    <div className={styles.liste}>
      {demandes.map((d) => (
        <div key={d.id} className={styles.fil}>
          <div className={styles.tete}>
            <div>
              <div className={styles.titre}>{t(d.libelle)}</div>
              <div className={styles.meta}>
                {t('reçue le')} {frDate(d.date)}
              </div>
            </div>
            <span
              className={styles.statut}
              style={
                d.traitee
                  ? { color: 'var(--success)', backgroundColor: 'var(--success-bg)' }
                  : { color: 'var(--warning)', backgroundColor: 'var(--warning-bg)' }
              }
            >
              {d.traitee ? t('Traitée') : t('En attente de réponse')}
            </span>
          </div>

          <p className={styles.message}>
            {d.message || t('Le partenaire n’a pas précisé de motif.')}
          </p>

          {d.reponses.map((r) => (
            <div key={r.id} className={styles.reponse}>
              <div className={styles.meta}>
                {t('Réponse de la conformité')}
                {r.auteur ? ` · ${r.auteur}` : ''} · {frDate(r.date)}
              </div>
              <p className={styles.reponseTexte}>{r.texte}</p>
            </div>
          ))}

          <Textarea
            value={brouillons[d.id] ?? ''}
            onChange={(_, data) => ecrire(d.id, data.value)}
            placeholder={t('Votre réponse au partenaire — elle s’affiche dans son espace.')}
            resize="vertical"
            style={{ width: '100%' }}
          />

          <div className={styles.actions}>
            <Button
              appearance="primary"
              size="small"
              icon={<Send20Regular />}
              disabled={enCours || !(brouillons[d.id] ?? '').trim()}
              onClick={() => envoyer(d)}
            >
              {t('Répondre')}
            </Button>
            {!d.traitee && (
              <Button
                appearance="outline"
                size="small"
                icon={<CheckmarkCircle20Regular />}
                disabled={enCours}
                onClick={() => onClore(d)}
              >
                {t('Marquer comme traitée')}
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
