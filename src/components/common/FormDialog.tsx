import { useState, type ReactNode } from 'react';
import {
  Dialog,
  DialogSurface,
  DialogBody,
  DialogContent,
  DialogActions,
  Button,
  Spinner,
  makeStyles,
} from '@fluentui/react-components';
import { Dismiss20Regular, ChevronLeft16Regular, ChevronRight16Regular, CheckmarkCircle16Filled } from '@fluentui/react-icons';

interface FormStep {
  key?: string;
  label: string;
  valid?: boolean;
}

interface FormDialogProps {
  open: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  onSubmit: () => void | Promise<void>;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  size?: 'medium' | 'large' | 'xlarge';
  steps?: FormStep[];
  /** Étape contrôlée. Si omis, le dialog gère l'étape en interne. */
  currentStep?: number;
  onStepChange?: (next: number) => void;
  /** Validation par étape (alternative à `step.valid`). Reçoit l'index d'étape. */
  validateStep?: (step: number) => boolean;
  submitDisabled?: boolean;
  submitLabel?: string;
  onSaveDraft?: () => void | Promise<void>;
  /** Contenu, ou render-prop recevant l'index de l'étape courante. */
  children: ReactNode | ((step: number) => ReactNode);
}

const useStyles = makeStyles({
  surfaceMedium: {
    width: '640px',
    maxWidth: '94vw',
    padding: 0,
    borderRadius: '16px',
    border: '1px solid #ECEAE4',
    boxShadow: '0 24px 64px -12px rgba(15, 15, 15, 0.22), 0 8px 24px -8px rgba(15, 15, 15, 0.10)',
    overflow: 'hidden',
    animation: 'scaleIn 280ms cubic-bezier(0.16, 1, 0.3, 1)',
  },
  surfaceLarge: {
    width: '840px',
    maxWidth: '94vw',
    padding: 0,
    borderRadius: '16px',
    border: '1px solid #ECEAE4',
    boxShadow: '0 24px 64px -12px rgba(15, 15, 15, 0.22), 0 8px 24px -8px rgba(15, 15, 15, 0.10)',
    overflow: 'hidden',
    animation: 'scaleIn 280ms cubic-bezier(0.16, 1, 0.3, 1)',
  },
  surfaceXLarge: {
    width: '1000px',
    maxWidth: '96vw',
    padding: 0,
    borderRadius: '16px',
    border: '1px solid #ECEAE4',
    boxShadow: '0 24px 64px -12px rgba(15, 15, 15, 0.22), 0 8px 24px -8px rgba(15, 15, 15, 0.10)',
    overflow: 'hidden',
    animation: 'scaleIn 280ms cubic-bezier(0.16, 1, 0.3, 1)',
  },

  header: {
    gridColumn: '1 / -1',
    padding: '24px 64px 18px 28px',
    borderBottom: '1px solid #F4F2EC',
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  headerTopRow: {
    display: 'block',
  },
  eyebrow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '10.5px',
    fontWeight: 700,
    color: 'var(--accent)',
    textTransform: 'uppercase',
    letterSpacing: '0.10em',
    marginBottom: '8px',
    padding: '3px 10px',
    backgroundColor: '#FDF0F1',
    borderRadius: '999px',
    border: '1px solid #FDE0E3',
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#0A0A0A',
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
    margin: 0,
  },
  subtitle: {
    fontSize: '13px',
    color: '#525252',
    marginTop: '8px',
    lineHeight: 1.55,
    maxWidth: '90%',
  },
  closeBtn: {
    position: 'absolute',
    top: '18px',
    right: '18px',
    width: '34px',
    height: '34px',
    minWidth: '34px',
    borderRadius: '10px',
    zIndex: 2,
  },
  stepper: {
    display: 'flex',
    gap: '6px',
    marginTop: '22px',
  },
  stepBar: {
    flex: 1,
    height: '5px',
    borderRadius: '999px',
    backgroundColor: '#F4F2EC',
    transition: 'background-color 280ms cubic-bezier(0.16, 1, 0.3, 1)',
    overflow: 'hidden',
    position: 'relative',
  },
  stepBarActive: {
    backgroundColor: 'var(--accent)',
    boxShadow: '0 0 8px rgba(200, 16, 46, 0.30)',
  },
  stepBarCurrent: {
    background: 'linear-gradient(90deg, var(--accent) 0%, var(--accent) 60%, #d8324a 100%)',
  },
  stepLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '10px',
    gap: '8px',
  },
  stepLabel: {
    flex: 1,
    fontSize: '11px',
    fontWeight: 600,
    color: '#A3A3A3',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    textAlign: 'center',
    transition: 'color 200ms',
  },
  stepLabelActive: {
    color: '#1A1A1A',
  },
  stepLabelDone: {
    color: '#15803D',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
  },
  body: {
    padding: '24px 28px',
    maxHeight: 'calc(86vh - 220px)',
    overflowY: 'auto',
    backgroundColor: '#FAF9F6',
  },
  footer: {
    padding: '16px 28px',
    borderTop: '1px solid #F4F2EC',
    backgroundColor: '#FFFFFF',
    gap: '10px',
    margin: 0,
  },
  footerLeft: {
    marginRight: 'auto',
  },
});

export function FormDialog({
  open,
  onClose,
  onOpenChange,
  onSubmit,
  eyebrow,
  title,
  subtitle,
  size = 'medium',
  steps,
  currentStep: currentStepProp,
  onStepChange,
  validateStep,
  submitDisabled,
  submitLabel = 'Créer',
  onSaveDraft,
  children,
}: FormDialogProps) {
  const styles = useStyles();
  const [internalStep, setInternalStep] = useState(0);
  // Étape contrôlée si fournie, sinon gérée en interne.
  const currentStep = currentStepProp ?? internalStep;
  const goToStep = (next: number) => {
    onStepChange?.(next);
    if (currentStepProp === undefined) setInternalStep(next);
  };
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);
  const close = () => {
    onClose?.();
    onOpenChange?.(false);
  };

  // Réinitialiser les états transitoires à chaque ouverture (pattern « adjust state during render »).
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setSubmitting(false);
      setSavingDraft(false);
      if (currentStepProp === undefined) setInternalStep(0);
    }
  }

  const isMultiStep = !!steps && steps.length > 1;
  const isLastStep = !isMultiStep || currentStep === (steps?.length ?? 1) - 1;
  const currentStepValid =
    !isMultiStep ||
    (validateStep ? validateStep(currentStep) : steps?.[currentStep]?.valid !== false);

  const surfaceClass =
    size === 'xlarge' ? styles.surfaceXLarge : size === 'large' ? styles.surfaceLarge : styles.surfaceMedium;

  const handlePrimary = async () => {
    if (isMultiStep && !isLastStep) {
      goToStep(currentStep + 1);
      return;
    }
    try {
      setSubmitting(true);
      await onSubmit();
      close();
    } catch {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!onSaveDraft) return;
    try {
      setSavingDraft(true);
      await onSaveDraft();
    } finally {
      setSavingDraft(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(_, data) => !data.open && !submitting && close()}
      modalType="modal"
    >
      <DialogSurface className={surfaceClass}>
        <DialogBody>
          <div className={styles.header}>
            <Button
              appearance="subtle"
              icon={<Dismiss20Regular />}
              onClick={close}
              disabled={submitting}
              aria-label="Fermer"
              className={styles.closeBtn}
            />
            <div style={{ minWidth: 0 }}>
              {eyebrow && <div className={styles.eyebrow}>{eyebrow}</div>}
              <h2 className={styles.title}>{title}</h2>
              {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            </div>

            {isMultiStep && (
              <>
                <div className={styles.stepper}>
                  {steps!.map((s, i) => (
                    <div
                      key={s.key ?? i}
                      className={`${styles.stepBar} ${
                        i < currentStep ? styles.stepBarActive : i === currentStep ? styles.stepBarCurrent : ''
                      }`}
                    />
                  ))}
                </div>
                <div className={styles.stepLabels}>
                  {steps!.map((s, i) => (
                    <span
                      key={s.key ?? i}
                      className={`${styles.stepLabel} ${
                        i < currentStep
                          ? styles.stepLabelDone
                          : i === currentStep
                          ? styles.stepLabelActive
                          : ''
                      }`}
                    >
                      {i < currentStep && <CheckmarkCircle16Filled style={{ color: '#15803D' }} />}
                      {`${i + 1}. ${s.label}`}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          <DialogContent className={styles.body}>
            {typeof children === 'function' ? children(currentStep) : children}
          </DialogContent>

          <DialogActions className={styles.footer} fluid>
            {onSaveDraft && !isMultiStep && (
              <Button
                className={styles.footerLeft}
                appearance="subtle"
                onClick={handleSaveDraft}
                disabled={submitting || savingDraft}
                icon={savingDraft ? <Spinner size="tiny" /> : undefined}
              >
                {savingDraft ? 'Enregistrement…' : 'Enregistrer comme brouillon'}
              </Button>
            )}

            {isMultiStep && currentStep > 0 && (
              <Button
                appearance="subtle"
                icon={<ChevronLeft16Regular />}
                onClick={() => goToStep(currentStep - 1)}
                disabled={submitting}
              >
                Précédent
              </Button>
            )}

            <Button appearance="secondary" onClick={close} disabled={submitting}>
              Annuler
            </Button>

            <Button
              appearance="primary"
              onClick={handlePrimary}
              disabled={submitting || submitDisabled || !currentStepValid}
              icon={
                submitting ? (
                  <Spinner size="tiny" />
                ) : isMultiStep && !isLastStep ? (
                  <ChevronRight16Regular />
                ) : undefined
              }
              iconPosition={isMultiStep && !isLastStep ? 'after' : 'before'}
            >
              {submitting
                ? 'Traitement…'
                : isMultiStep && !isLastStep
                ? 'Suivant'
                : submitLabel}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Composables internes                                                */
/* ------------------------------------------------------------------ */

const useFormStyles = makeStyles({
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #F4F2EC',
    padding: '20px 22px',
    marginBottom: '14px',
    boxShadow: '0 1px 2px rgba(15, 15, 15, 0.03)',
    transition: 'box-shadow 220ms cubic-bezier(0.16, 1, 0.3, 1), border-color 220ms',
    ':hover': {
      borderTopColor: '#ECEAE4', borderRightColor: '#ECEAE4', borderBottomColor: '#ECEAE4', borderLeftColor: '#ECEAE4',
      boxShadow: '0 2px 6px rgba(15, 15, 15, 0.04)',
    },
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#737373',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '6px',
  },
  sectionDescription: {
    fontSize: '12.5px',
    color: '#525252',
    lineHeight: 1.55,
    marginBottom: '16px',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '14px',
    marginBottom: '14px',
    ':last-child': { marginBottom: 0 },
    '@media (max-width: 600px)': {
      gridTemplateColumns: '1fr',
    },
  },
  rowSingle: {
    display: 'block',
    marginBottom: '14px',
    ':last-child': { marginBottom: 0 },
  },
  rowTriple: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '14px',
    marginBottom: '14px',
    ':last-child': { marginBottom: 0 },
    '@media (max-width: 600px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

interface FormSectionProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}

export function FormSection({ title, description, children }: FormSectionProps) {
  const styles = useFormStyles();
  return (
    <section className={styles.section}>
      <div className={styles.sectionTitle}>{title}</div>
      {description && <div className={styles.sectionDescription}>{description}</div>}
      {children}
    </section>
  );
}

interface FieldRowProps {
  children: ReactNode;
  cols?: 1 | 2 | 3;
}

export function FieldRow({ children, cols = 2 }: FieldRowProps) {
  const styles = useFormStyles();
  const cls = cols === 1 ? styles.rowSingle : cols === 3 ? styles.rowTriple : styles.row;
  return <div className={cls}>{children}</div>;
}
