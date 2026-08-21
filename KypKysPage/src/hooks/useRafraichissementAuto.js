import { useEffect, useRef } from 'react'

/**
 * Rafraîchissement automatique des données du portail.
 *
 * Le partenaire devait recharger la page pour voir que son dossier avait été
 * validé, ou qu'une pièce avait changé de statut. Il n'avait aucune raison de
 * penser à le faire : rien à l'écran ne suggérait que l'information avait vieilli.
 *
 * Power Pages n'offre aucun canal de notification vers un code site — ni
 * websocket, ni SignalR côté client. Le seul mécanisme disponible est donc
 * l'interrogation périodique. Trois règles la rendent acceptable :
 *
 *  1. ELLE S'ARRÊTE QUAND L'ONGLET N'EST PAS VISIBLE. Un onglet oublié en fond
 *     pendant la journée interrogerait Dataverse des centaines de fois pour
 *     personne. `visibilitychange` suspend et reprend le cycle.
 *  2. ELLE RECHARGE AU RETOUR SUR L'ONGLET. C'est le moment où l'information
 *     périmée se voit — et il ne coûte qu'une requête.
 *  3. ELLE SE TAIT PENDANT UNE SAISIE. Remplacer les données sous les doigts de
 *     l'utilisateur — pendant un téléversement, un formulaire à moitié rempli —
 *     ferait plus de dégâts que la fraîcheur n'apporte. D'où `actif`.
 *
 * @param {() => (void|Promise<void>)} charger  recharge les données de l'écran.
 * @param {object}  [options]
 * @param {number}  [options.intervalleMs=60000] période entre deux relectures.
 * @param {boolean} [options.actif=true] passer à false suspend tout.
 */
export function useRafraichissementAuto(charger, { intervalleMs = 60000, actif = true } = {}) {
  // La fonction de chargement change à chaque rendu ; la garder dans une ref
  // évite de relancer le minuteur à chaque fois — ce qui, avec une dépendance
  // sur `charger`, empêcherait l'intervalle d'arriver à échéance.
  const chargerRef = useRef(charger)
  chargerRef.current = charger

  // Empêche deux relectures simultanées : au retour sur l'onglet, `focus` et
  // `visibilitychange` se déclenchent tous les deux.
  const enCours = useRef(false)

  useEffect(() => {
    if (!actif) return

    let minuteur = null

    const relire = async () => {
      if (enCours.current) return
      // Hors ligne, la requête échouerait et effacerait éventuellement l'écran.
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return
      enCours.current = true
      try {
        await chargerRef.current()
      } catch {
        // Une relecture silencieuse qui échoue doit rester silencieuse : les
        // données affichées restent celles de la dernière lecture réussie.
      } finally {
        enCours.current = false
      }
    }

    const demarrer = () => {
      if (minuteur === null) minuteur = setInterval(relire, intervalleMs)
    }
    const arreter = () => {
      if (minuteur !== null) {
        clearInterval(minuteur)
        minuteur = null
      }
    }

    const auChangementDeVisibilite = () => {
      if (document.visibilityState === 'visible') {
        relire()
        demarrer()
      } else {
        arreter()
      }
    }

    if (document.visibilityState === 'visible') demarrer()
    document.addEventListener('visibilitychange', auChangementDeVisibilite)
    window.addEventListener('focus', relire)
    window.addEventListener('online', relire)

    return () => {
      arreter()
      document.removeEventListener('visibilitychange', auChangementDeVisibilite)
      window.removeEventListener('focus', relire)
      window.removeEventListener('online', relire)
    }
  }, [intervalleMs, actif])
}
