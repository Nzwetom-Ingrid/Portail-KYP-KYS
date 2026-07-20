/**
 * Détecte l'inactivité de l'utilisateur et déclenche `onIdle` après `timeoutMs`
 * sans interaction (souris, clavier, tactile, défilement).
 *
 * Sécurité : protège les sessions laissées ouvertes sur un poste partagé /
 * non surveillé — au-delà du délai, l'appelant verrouille ou déconnecte.
 *
 * Multi-onglets : l'horodatage de dernière activité est partagé via
 * `localStorage`, donc une activité dans un autre onglet repousse l'échéance
 * de tous (pas de déconnexion intempestive quand un onglet travaille).
 */
import { useEffect, useRef } from 'react';

const ACTIVITY_KEY = 'afb:lastActivity';
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'] as const;

export function useIdleTimer(timeoutMs: number, onIdle: () => void, enabled = true) {
  const onIdleRef = useRef(onIdle);
  useEffect(() => {
    onIdleRef.current = onIdle;
  });

  useEffect(() => {
    if (!enabled) return;
    let timer: number | undefined;

    const now = () => Date.now();
    const readLast = (): number => {
      try {
        return Number(localStorage.getItem(ACTIVITY_KEY)) || now();
      } catch {
        return now();
      }
    };
    const markActivity = () => {
      try {
        localStorage.setItem(ACTIVITY_KEY, String(now()));
      } catch {
        /* stockage indisponible : on reste en minuteur local */
      }
    };

    const check = () => {
      const elapsed = now() - readLast();
      if (elapsed >= timeoutMs) {
        onIdleRef.current();
        return;
      }
      // Activité dans un autre onglet → on replanifie pour le temps restant.
      window.clearTimeout(timer);
      timer = window.setTimeout(check, timeoutMs - elapsed);
    };

    const onActivity = () => {
      markActivity();
      window.clearTimeout(timer);
      timer = window.setTimeout(check, timeoutMs);
    };

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    markActivity();
    timer = window.setTimeout(check, timeoutMs);

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      window.clearTimeout(timer);
    };
  }, [timeoutMs, enabled]);
}
