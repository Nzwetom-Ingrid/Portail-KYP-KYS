// =============================================================
// Authentification du portail — connexion via Azure AD B2C
// =============================================================
// Sur un Power Pages « code site », les routes d'authentification
// (/Account/Login/*) sont servies CÔTÉ SERVEUR par Power Pages — elles
// ne passent pas par le routage client du SPA. On déclenche donc la
// connexion B2C en POSTant le formulaire ExternalLogin documenté par
// Microsoft (cf. « Create and deploy a single-page application in
// Power Pages »).
//
// Remplace l'ancien lien /register?invitation=CODE (404 sur un code
// site, car la page native de redemption d'invitation n'y existe pas).
// =============================================================

import { B2C_PROVIDER, LOGIN_RETURN_URL } from '../config/auth'

/**
 * Récupère le jeton anti-forgery requis par le POST ExternalLogin,
 * via l'endpoint documenté /_layout/tokenhtml.
 */
async function fetchAntiForgeryToken() {
  const res = await fetch('/_layout/tokenhtml', { credentials: 'include' })
  if (!res.ok) throw new Error(`/_layout/tokenhtml → ${res.status}`)
  const html = await res.text()
  const marker = 'value="'
  const start = html.indexOf(marker)
  if (start === -1) throw new Error('Jeton __RequestVerificationToken introuvable')
  const from = start + marker.length
  return html.slice(from, html.indexOf('"', from))
}

/**
 * Déclenche la connexion Azure AD B2C.
 *  - B2C_PROVIDER renseigné → POST direct vers ExternalLogin (→ B2C immédiat).
 *  - B2C_PROVIDER vide       → repli GET vers /SignIn (page de connexion standard).
 * Dans les deux cas, le navigateur quitte le SPA pour la séquence d'auth serveur.
 */
export async function signInWithB2C() {
  const returnUrl = LOGIN_RETURN_URL || '/'

  // Repli : aucune valeur de fournisseur connue → page de connexion standard.
  if (!B2C_PROVIDER) {
    window.location.href = `/SignIn?returnUrl=${encodeURIComponent(returnUrl)}`
    return
  }

  // Parcours direct : POST du formulaire ExternalLogin (comme la doc Microsoft).
  const token = await fetchAntiForgeryToken()
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = '/Account/Login/ExternalLogin'

  const fields = {
    __RequestVerificationToken: token,
    provider: B2C_PROVIDER,
    returnUrl,
  }
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = name
    input.value = value
    form.appendChild(input)
  }
  document.body.appendChild(form)
  form.submit()
}
