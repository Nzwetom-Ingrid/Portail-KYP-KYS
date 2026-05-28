import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import {
  Toaster,
  Toast,
  ToastTitle,
  ToastBody,
  ToastFooter,
  Link,
  useToastController,
  useId as useFluentId,
} from '@fluentui/react-components';

/**
 * NotificationProvider — système de toasts global pour le Portail KYP/KYS.
 *
 * Usage :
 *   const { notifySuccess, notifyError, notifyWarning, notifyInfo } = useNotifications();
 *   notifySuccess('Dossier validé', 'Le dossier KYC-B-2025-0007 a été validé et archivé.');
 *
 * Wrapper l'app dans <NotificationProvider> au-dessus de <Layout />.
 */

type Intent = 'success' | 'error' | 'warning' | 'info';

interface NotifyOptions {
  /** Lien d'action à afficher dans le footer (ex. « Voir le dossier ») */
  action?: { label: string; onClick: () => void };
  /** Durée d'affichage en ms (défaut : 5000 — 8000 pour les erreurs) */
  timeout?: number;
}

type NotifyMessage = string | (NotifyOptions & { description?: string });

interface NotificationsContextValue {
  notifySuccess: (title: string, message?: NotifyMessage, options?: NotifyOptions) => void;
  notifyError: (title: string, message?: NotifyMessage, options?: NotifyOptions) => void;
  notifyWarning: (title: string, message?: NotifyMessage, options?: NotifyOptions) => void;
  notifyInfo: (title: string, message?: NotifyMessage, options?: NotifyOptions) => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const toasterId = useFluentId('afb-toaster');
  const { dispatchToast } = useToastController(toasterId);

  // Ref stable pour éviter les re-renders en cascade des consommateurs.
  const dispatchRef = useRef(dispatchToast);
  dispatchRef.current = dispatchToast;

  const notify = useCallback(
    (intent: Intent, title: string, message?: NotifyMessage, options?: NotifyOptions) => {
      // Accepter soit une string (message), soit un objet { description?, action?, timeout? }.
      const text = typeof message === 'string' ? message : message?.description;
      const merged: NotifyOptions = {
        action: options?.action ?? (typeof message === 'object' ? message?.action : undefined),
        timeout: options?.timeout ?? (typeof message === 'object' ? message?.timeout : undefined),
      };
      dispatchRef.current(
        <Toast>
          <ToastTitle>{title}</ToastTitle>
          {text && <ToastBody>{text}</ToastBody>}
          {merged.action && (
            <ToastFooter>
              <Link onClick={merged.action.onClick}>{merged.action.label}</Link>
            </ToastFooter>
          )}
        </Toast>,
        {
          intent,
          timeout: merged.timeout ?? (intent === 'error' ? 8000 : 5000),
          position: 'top-end',
        },
      );
    },
    [],
  );

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifySuccess: (title, message, options) => notify('success', title, message, options),
      notifyError: (title, message, options) => notify('error', title, message, options),
      notifyWarning: (title, message, options) => notify('warning', title, message, options),
      notifyInfo: (title, message, options) => notify('info', title, message, options),
    }),
    [notify],
  );

  return (
    <NotificationsContext.Provider value={value}>
      <Toaster toasterId={toasterId} pauseOnHover pauseOnWindowBlur />
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error(
      'useNotifications doit être utilisé à l\'intérieur de <NotificationProvider>. Wrapper l\'app dans App.tsx au-dessus du Layout.',
    );
  }
  return ctx;
}

/* Helper non-hook pour ESLint-friendly imports nommés */
const _useId = useId;
export { _useId };