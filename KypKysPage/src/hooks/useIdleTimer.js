// =============================================================
// Déconnexion auto par inactivité — portail tiers (Power Pages)
// =============================================================
// Détecte l'inactivité (souris, clavier, tactile, défilement) et
// déclenche `onIdle` après `timeoutMs` sans interaction. Protège les
// sessions laissées ouvertes sur un poste partagé / non surveillé.
//
// Multi-onglets : la dernière activité est partagée via localStorage,
// donc l'activité d'un onglet repousse l'échéance des autres.
// =============================================================

import { useEffect, useRef } from 'react'

const ACTIVITY_KEY = 'afb:lastActivity'
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel']

export function useIdleTimer(timeoutMs, onIdle, enabled = true) {
  const onIdleRef = useRef(onIdle)
  useEffect(() => {
    onIdleRef.current = onIdle
  })

  useEffect(() => {
    if (!enabled) return
    let timer

    const now = () => Date.now()
    const readLast = () => {
      try {
        return Number(localStorage.getItem(ACTIVITY_KEY)) || now()
      } catch {
        return now()
      }
    }
    const markActivity = () => {
      try {
        localStorage.setItem(ACTIVITY_KEY, String(now()))
      } catch {
        /* stockage indisponible : minuteur local uniquement */
      }
    }

    const check = () => {
      const elapsed = now() - readLast()
      if (elapsed >= timeoutMs) {
        onIdleRef.current()
        return
      }
      // Activité dans un autre onglet → replanifier pour le temps restant.
      clearTimeout(timer)
      timer = setTimeout(check, timeoutMs - elapsed)
    }

    const onActivity = () => {
      markActivity()
      clearTimeout(timer)
      timer = setTimeout(check, timeoutMs)
    }

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }))
    markActivity()
    timer = setTimeout(check, timeoutMs)

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity))
      clearTimeout(timer)
    }
  }, [timeoutMs, enabled])
}
