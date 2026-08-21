/**
 * Ouverture d'un accès portail pour une personne d'une entreprise existante.
 *
 * Plusieurs identités externes peuvent pointer vers le même tiers — le schéma
 * Dataverse le permet depuis toujours, rien ne l'exploitait. Une entreprise
 * n'avait donc en pratique qu'un seul interlocuteur au portail, alors que le
 * dépôt des pièces concerne souvent plusieurs personnes : le dirigeant signe,
 * le juriste fournit les statuts, le financier l'attestation fiscale.
 *
 * Extrait de SupportAcces pour garder cet écran sous le seuil de 400 lignes
 * (charte AFB_PS03 § 7.2).
 */
import { useState } from 'react';
import { Dropdown, Field, Input, Option, makeStyles } from '@fluentui/react-components';
import { FormDialog, FormSection, FieldRow } from '@/components/common/FormDialog';
import { useNotifications } from '@/components/common/NotificationProvider';
import { tiersExterneB2c } from '@/lib/dataverse/entityHooks';
import { STATUT_COMPTE } from '@/lib/support/accessDiagnostic';
import { useT } from '@/i18n/i18n';

const useStyles = makeStyles({
  avertissement: {
    padding: '12px 14px',
    borderRadius: '8px',
    backgroundColor: 'var(--warning-bg)',
    fontSize: '13.5px',
    lineHeight: 1.55,
  },
});

/** Valeurs de choix `afb_typedorganisation` sur l'identité externe. */
const TYPE_ORGA = { BanqueCorrespondante: 0, EMF: 1, Fournisseur: 2, Autre: 747010001 } as const;

const ORGA_OPTIONS = [
  { value: String(TYPE_ORGA.BanqueCorrespondante), label: 'Banque correspondante' },
  { value: String(TYPE_ORGA.EMF), label: 'Établissement de microfinance' },
  { value: String(TYPE_ORGA.Fournisseur), label: 'Fournisseur' },
  { value: String(TYPE_ORGA.Autre), label: 'Autre' },
];

interface InviterAccesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Entreprises déjà référencées : identifiant → raison sociale. */
  entreprises: Map<string, string>;
}

export function InviterAccesDialog({ open, onOpenChange, entreprises }: InviterAccesDialogProps) {
  const styles = useStyles();
  const { t } = useT();
  const { notifySuccess, notifyError } = useNotifications();
  const creer = tiersExterneB2c.useCreate();

  const [tiersId, setTiersId] = useState('');
  const [email, setEmail] = useState('');
  const [orga, setOrga] = useState<string>(String(TYPE_ORGA.Autre));

  const emailValide = /^\S+@\S+\.\S+$/.test(email.trim());
  const valide = Boolean(tiersId) && emailValide;

  const reinitialiser = () => {
    setTiersId('');
    setEmail('');
    setOrga(String(TYPE_ORGA.Autre));
  };

  const soumettre = async () => {
    if (!valide) return;
    try {
      await creer.mutateAsync({
        afb_emaildauthentification: email.trim().toLowerCase(),
        afb_typedorganisation: Number(orga),
        afb_statutducompte: STATUT_COMPTE.actif,
        afb_datedecreation: new Date().toISOString(),
        afb_datedinvitation: new Date().toISOString(),
        afb_nombredetentativesechouees: 0,
        // Vide tant que la personne n'a pas finalisé son inscription côté Azure.
        // C'est précisément cette absence que lit le diagnostic de l'écran.
        afb_identifiantb2c: '',
        'afb_nomdutiers@odata.bind': `/afb_tierses(${tiersId})`,
      } as unknown as Parameters<typeof creer.mutateAsync>[0]);

      // Message volontairement précis : l'accès est OUVERT, aucun e-mail n'est
      // parti. Le flux « Invitation Tiers » se déclenche sur la table TIERS,
      // pas sur celle-ci — il ignore donc cette création.
      notifySuccess(t('Accès ouvert'), {
        description: `${email.trim()} — ${t('aucun e-mail n’a été envoyé : communiquez-lui l’adresse du portail.')}`,
      });
      reinitialiser();
      onOpenChange(false);
    } catch (e) {
      notifyError(t('Ouverture d’accès impossible'), {
        description: e instanceof Error ? e.message : t('Erreur Dataverse.'),
      });
    }
  };

  const entreprisesTriees = [...entreprises.entries()].sort((a, b) => a[1].localeCompare(b[1], 'fr'));

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reinitialiser();
        onOpenChange(o);
      }}
      eyebrow={t('Support')}
      title={t('Ouvrir un accès au portail')}
      subtitle={t('Plusieurs personnes d’une même entreprise peuvent avoir leur propre accès : le dirigeant, le juriste, le responsable financier. Chacune dépose ses pièces sous son identité.')}
      submitLabel={t('Ouvrir l’accès')}
      submitDisabled={!valide || creer.isPending}
      onSubmit={soumettre}
    >
      <FormSection
        title={t('Entreprise et personne')}
        description={t('L’entreprise doit déjà exister. Pour un nouveau partenaire, passez par « Dossiers → Nouveau dossier ».')}
      >
        <Field label={t('Entreprise')} required>
          <Dropdown
            placeholder={t('Sélectionner une entreprise')}
            value={entreprises.get(tiersId) ?? ''}
            selectedOptions={tiersId ? [tiersId] : []}
            onOptionSelect={(_, d) => d.optionValue && setTiersId(d.optionValue)}
          >
            {entreprisesTriees.map(([id, nom]) => (
              <Option key={id} value={id} text={nom}>
                {nom}
              </Option>
            ))}
          </Dropdown>
        </Field>

        <FieldRow cols={2}>
          <Field
            label={t('E-mail de connexion')}
            required
            hint={t('C’est avec cette adresse que la personne s’authentifiera.')}
            validationState={email && !emailValide ? 'error' : 'none'}
            validationMessage={email && !emailValide ? t('Adresse e-mail invalide.') : undefined}
          >
            <Input
              type="email"
              value={email}
              onChange={(_, d) => setEmail(d.value)}
              placeholder="prenom.nom@entreprise.com"
            />
          </Field>

          <Field label={t('Type d’organisation')}>
            <Dropdown
              value={t(ORGA_OPTIONS.find((o) => o.value === orga)?.label ?? '')}
              selectedOptions={[orga]}
              onOptionSelect={(_, d) => d.optionValue && setOrga(d.optionValue)}
            >
              {ORGA_OPTIONS.map((o) => (
                <Option key={o.value} value={o.value} text={t(o.label)}>
                  {t(o.label)}
                </Option>
              ))}
            </Dropdown>
          </Field>
        </FieldRow>
      </FormSection>

      <FormSection title={t('Ce que fait cette action')}>
        <p className={styles.avertissement}>
          {t('L’accès est ouvert immédiatement. En revanche, AUCUN e-mail n’est envoyé : le flux d’invitation se déclenche à la création d’un tiers, pas à l’ouverture d’un accès supplémentaire. Communiquez vous-même l’adresse du portail à la personne.')}
        </p>
      </FormSection>
    </FormDialog>
  );
}
