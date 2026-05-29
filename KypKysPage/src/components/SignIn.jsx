// =============================================================
// Écran de connexion — affiché aux tiers NON authentifiés
// =============================================================
// Remplace le 404 de l'ancien lien /register?invitation=... :
// le tiers arrive ici (anonyme), clique « Se connecter » et démarre
// l'authentification Azure AD B2C + OTP (Option A, sans code
// d'invitation). Styles alignés sur le design system du portail.
// =============================================================

import { useState } from 'react'
import Icon from './Icon'
import { signInWithB2C } from '../services/auth'

export default function SignIn() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const onSignIn = async () => {
    setBusy(true)
    setError(null)
    try {
      await signInWithB2C()
      // En cas de succès, le navigateur quitte la page (redirection B2C).
    } catch (e) {
      setBusy(false)
      setError(
        "La connexion n'a pas pu démarrer. Réessayez, ou contactez la Direction " +
          "de la Conformité d'Afriland First Bank si le problème persiste."
      )
      console.error('SignIn — échec du démarrage de la connexion B2C :', e)
    }
  }

  return (
    <div className="signin">
      <div className="card card--pad signin__card">
        <span className="signin__badge"><Icon name="shield" size={28} /></span>
        <h1 className="signin__title">Portail KYP / KYS</h1>
        <p className="signin__sub">Afriland First Bank — Espace partenaires &amp; fournisseurs</p>
        <p className="signin__text">
          Pour accéder à votre espace sécurisé, connectez-vous avec le compte
          associé à l'e-mail d'invitation que vous avez reçu. Une vérification
          par code à usage unique (OTP) vous sera demandée.
        </p>
        <button className="btn btn--primary signin__btn" onClick={onSignIn} disabled={busy}>
          <Icon name="shield" size={18} />
          {busy ? 'Redirection…' : 'Se connecter'}
        </button>
        {error && <p className="signin__error" role="alert">{error}</p>}
      </div>
    </div>
  )
}
