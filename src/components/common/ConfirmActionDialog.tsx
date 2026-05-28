import { useState, type ReactNode } from 'react';
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogBody,
  Button,
  Field,
  Textarea,
  Spinner,
  makeStyles,
} from '@fluentui/react-components';
import {
  CheckmarkCircle24Filled,
  DismissCircle24Filled,
  Warning24Filled,
  Info24Filled,
  ShieldProhibited24Filled,
} from '@fluentui/react-icons';

export type ConfirmIntent = 'validate' | 'reject' | 'warn' | 'info' | 'suspend';

interface ConfirmActionDialogProps {
  open: boolean;
  /** Au moins un de onClose / onOpenChange doit être fourni. */
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  /** Callback déclenché à la confirmation. Peut être async — le dialog gère le loading. */
  onConfirm: (motif: string) => void | Promise<void>;
  intent: ConfirmIntent;
  title: string;
  /** Description courte expliquant l'action. */
  description: ReactNode;
  /** Label du bouton de confirmation. Défaut : varie selon intent. */
  confirmLabel?: string;
  /** Libellé du champ motif. Défaut : « Motif » ou « Commentaire » selon intent. */
  motifLabel?: string;
  /** Si true, le motif est obligatoire pour confirmer. Défaut : true pour reject/suspend. */
  motifRequired?: boolean;
  /** Alias de `motifRequired` (usage des pages). */
  requireMotif?: boolean;
  /** Placeholder du champ motif. */
  motifPlaceholder?: string;
  /** Texte d'information secondaire (encadré bleu). Ex : « Cette action sera archivée 10 ans (Art. 38 R-2023/01) ». */
  helperNote?: ReactNode;
  /** Référence du dossier ou de l'entité concernée — affichée en chip. */
  entityRef?: string;
}

const intentConfig: Record<
  ConfirmIntent,
  {
    icon: ReactNode;
    iconColor: string;
    iconBg: string;
    defaultConfirmLabel: string;
    confirmAppearance: 'primary' | 'outline';
    confirmColor?: string;
    defaultMotifRequired: boolean;
    defaultMotifLabel: string;
  }
> = {
  validate: {
    icon: <CheckmarkCircle24Filled />,
    iconColor: '#15803D',
    iconBg: '#DCFCE7',
    defaultConfirmLabel: 'Valider le dossier',
    confirmAppearance: 'primary',
    defaultMotifRequired: false,
    defaultMotifLabel: 'Commentaire de validation (optionnel)',
  },
  reject: {
    icon: <DismissCircle24Filled />,
    iconColor: '#E30613',
    iconBg: '#FEF2F3',
    defaultConfirmLabel: 'Rejeter le dossier',
    confirmAppearance: 'primary',
    confirmColor: '#E30613',
    defaultMotifRequired: true,
    defaultMotifLabel: 'Motif du rejet (obligatoire)',
  },
  warn: {
    icon: <Warning24Filled />,
    iconColor: '#B45309',
    iconBg: '#FEF3C7',
    defaultConfirmLabel: 'Demander un complément',
    confirmAppearance: 'primary',
    defaultMotifRequired: true,
    defaultMotifLabel: 'Éléments à compléter (obligatoire)',
  },
  info: {
    icon: <Info24Filled />,
    iconColor: '#404040',
    iconBg: '#ECEAE4',
    defaultConfirmLabel: 'Confirmer',
    confirmAppearance: 'primary',
    defaultMotifRequired: false,
    defaultMotifLabel: 'Commentaire (optionnel)',
  },
  suspend: {
    icon: <ShieldProhibited24Filled />,
    iconColor: '#A50410',
    iconBg: '#FEF2F3',
    defaultConfirmLabel: 'Suspendre la relation',
    confirmAppearance: 'primary',
    confirmColor: '#A50410',
    defaultMotifRequired: true,
    defaultMotifLabel: 'Motif de suspension (obligatoire — Art. 41-48 R-2023/01)',
  },
};

const useStyles = makeStyles({
  surface: {
    maxWidth: '540px',
    padding: 0,
    borderRadius: '16px',
    border: '1px solid #ECEAE4',
    boxShadow: '0 24px 64px -12px rgba(15, 15, 15, 0.22), 0 8px 24px -8px rgba(15, 15, 15, 0.10)',
    overflow: 'hidden',
    animation: 'scaleIn 280ms cubic-bezier(0.16, 1, 0.3, 1)',
  },
  body: {
    padding: '28px 30px 0',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '6px',
  },
  iconBubble: {
    width: '48px',
    height: '48px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 1px 3px rgba(15, 15, 15, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  entityChip: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 9px',
    fontSize: '11px',
    fontWeight: 600,
    fontFamily: '"JetBrains Mono", monospace',
    backgroundColor: '#F4F2EC',
    border: '1px solid #ECEAE4',
    borderRadius: '6px',
    color: '#525252',
    marginBottom: '8px',
  },
  description: {
    fontSize: '13.5px',
    color: '#404040',
    lineHeight: 1.6,
    marginTop: '14px',
  },
  helperNote: {
    display: 'flex',
    gap: '12px',
    padding: '14px 16px',
    backgroundColor: '#FAF9F6',
    border: '1px solid #ECEAE4',
    borderRadius: '10px',
    fontSize: '12.5px',
    color: '#525252',
    lineHeight: 1.55,
    marginTop: '18px',
  },
  helperIcon: {
    color: '#C20012',
    flexShrink: 0,
    marginTop: '1px',
  },
  motifBlock: {
    marginTop: '20px',
  },
  motifCount: {
    fontSize: '11px',
    color: '#A3A3A3',
    textAlign: 'right',
    marginTop: '6px',
    fontFamily: '"JetBrains Mono", monospace',
  },
  actions: {
    padding: '18px 30px 24px',
    gap: '10px',
    borderTop: 'none',
    backgroundColor: '#FAF9F6',
  },
});

export function ConfirmActionDialog({
  open,
  onClose,
  onOpenChange,
  onConfirm,
  intent,
  title,
  description,
  confirmLabel,
  motifLabel,
  motifRequired,
  requireMotif,
  motifPlaceholder,
  helperNote,
  entityRef,
}: ConfirmActionDialogProps) {
  const styles = useStyles();
  const config = intentConfig[intent];
  const [motif, setMotif] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);
  const close = () => {
    onClose?.();
    onOpenChange?.(false);
  };

  // Réinitialiser à chaque ouverture (pattern « adjust state during render »)
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setMotif('');
      setSubmitting(false);
    }
  }

  const motifIsRequired = motifRequired ?? requireMotif ?? config.defaultMotifRequired;
  const canConfirm = !submitting && (!motifIsRequired || motif.trim().length >= 5);

  const handleConfirm = async () => {
    if (!canConfirm) return;
    try {
      setSubmitting(true);
      await onConfirm(motif.trim());
      close();
    } catch {
      // L'appelant doit gérer l'erreur via notifyError. On garde le dialog ouvert pour permettre une nouvelle tentative.
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && !submitting && close()}>
      <DialogSurface className={styles.surface}>
        <DialogBody>
          <DialogContent>
            <div className={styles.body}>
              <div className={styles.headerRow}>
                <div
                  className={styles.iconBubble}
                  style={{ backgroundColor: config.iconBg, color: config.iconColor }}
                >
                  {config.icon}
                </div>
                <div className={styles.titleBlock}>
                  {entityRef && <span className={styles.entityChip}>{entityRef}</span>}
                  <DialogTitle style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#1A1A1A' }}>
                    {title}
                  </DialogTitle>
                </div>
              </div>

              <div className={styles.description}>{description}</div>

              {helperNote && (
                <div className={styles.helperNote}>
                  <Info24Filled className={styles.helperIcon} style={{ width: 18, height: 18 }} />
                  <span>{helperNote}</span>
                </div>
              )}

              <div className={styles.motifBlock}>
                <Field
                  label={motifLabel ?? config.defaultMotifLabel}
                  required={motifIsRequired}
                  validationState={motifIsRequired && motif.length > 0 && motif.trim().length < 5 ? 'warning' : 'none'}
                  validationMessage={
                    motifIsRequired && motif.length > 0 && motif.trim().length < 5
                      ? 'Le motif doit comporter au moins 5 caractères.'
                      : undefined
                  }
                >
                  <Textarea
                    value={motif}
                    onChange={(_, data) => setMotif(data.value)}
                    placeholder={
                      motifPlaceholder ??
                      (intent === 'reject'
                        ? 'Ex. : pièces d\'identité des UBO non authentifiées par notaire/avocat — manquement Wolfsberg…'
                        : intent === 'warn'
                        ? 'Ex. : merci de fournir le questionnaire FATCA W-8 BEN-E daté de moins de 12 mois.'
                        : intent === 'suspend'
                        ? 'Ex. : non-réponse aux relances J-7, dossier en infraction Art. 34 R-2023/01.'
                        : 'Ajouter une note interne (optionnel).')
                    }
                    rows={4}
                    maxLength={1000}
                    resize="vertical"
                    disabled={submitting}
                  />
                </Field>
                <div className={styles.motifCount}>{motif.length} / 1000</div>
              </div>
            </div>
          </DialogContent>

          <DialogActions className={styles.actions} fluid>
            <Button appearance="secondary" onClick={close} disabled={submitting}>
              Annuler
            </Button>
            <Button
              appearance={config.confirmAppearance}
              onClick={handleConfirm}
              disabled={!canConfirm}
              icon={submitting ? <Spinner size="tiny" /> : undefined}
              style={
                config.confirmColor
                  ? {
                      backgroundColor: canConfirm ? config.confirmColor : undefined,
                      borderTopColor: canConfirm ? config.confirmColor : undefined, borderRightColor: canConfirm ? config.confirmColor : undefined, borderBottomColor: canConfirm ? config.confirmColor : undefined, borderLeftColor: canConfirm ? config.confirmColor : undefined,
                    }
                  : undefined
              }
            >
              {submitting ? 'Traitement…' : confirmLabel ?? config.defaultConfirmLabel}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}