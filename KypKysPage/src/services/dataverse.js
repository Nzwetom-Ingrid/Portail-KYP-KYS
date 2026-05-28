// =============================================================
// Client bas-niveau Dataverse via la Web API Power Pages
// =============================================================
// Toute requête /_api/* est :
//   - servie par le portail Power Pages (même origine)
//   - authentifiée via les cookies de session (credentials:'include')
//   - protégée par anti-forgery : header __RequestVerificationToken
// =============================================================

import { USE_DATAVERSE } from '../config/dataverse'

let tokenPromise = null

/** Récupère (et met en cache) le jeton anti-forgery requis par Power Pages. */
function getAntiForgeryToken() {
  if (tokenPromise) return tokenPromise

  tokenPromise = (async () => {
    // 1) Helper global du shell Power Pages, si présent dans la page
    if (typeof window !== 'undefined' && window.shell?.getTokenDeferred) {
      return await new Promise((resolve, reject) => {
        try {
          const d = window.shell.getTokenDeferred()
          if (typeof d?.done === 'function') {
            d.done((t) => resolve(t)).fail((e) => reject(e))
          } else {
            Promise.resolve(d).then(resolve, reject)
          }
        } catch (e) {
          reject(e)
        }
      })
    }
    // 2) Méta-tag ou input caché injectés via Liquid
    const meta = document.querySelector('meta[name="__RequestVerificationToken"]')
    if (meta?.content) return meta.content
    const input = document.querySelector('input[name="__RequestVerificationToken"]')
    if (input?.value) return input.value
    // 3) Endpoint dédié
    const r = await fetch('/_services/auth/token', { credentials: 'include' })
    if (r.ok) return (await r.text()).trim()

    throw new Error(
      "Impossible d'obtenir le jeton __RequestVerificationToken — " +
        "vérifiez que le portail Power Pages est bien chargé et l'utilisateur authentifié."
    )
  })().catch((e) => {
    tokenPromise = null // permet un retry
    throw e
  })

  return tokenPromise
}

/** Appel générique vers la Web API Power Pages. */
async function call(method, path, body) {
  if (!USE_DATAVERSE) {
    throw new Error(`Dataverse désactivé (mode local). Appel ignoré : ${method} ${path}`)
  }

  const headers = {
    Accept: 'application/json',
    'OData-MaxVersion': '4.0',
    'OData-Version': '4.0',
    Prefer: 'odata.include-annotations="*"',
  }
  if (body !== undefined) headers['Content-Type'] = 'application/json; charset=utf-8'

  // Le token n'est strictement requis qu'en écriture, mais on l'ajoute
  // systématiquement quand il est disponible (certains environnements le
  // demandent aussi en GET selon la configuration Site Settings).
  try {
    headers['__RequestVerificationToken'] = await getAntiForgeryToken()
  } catch (e) {
    if (method !== 'GET') throw e
  }

  const res = await fetch(`/_api/${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Dataverse ${method} /_api/${path} → ${res.status} ${text.slice(0, 300)}`)
  }
  if (res.status === 204) return null

  const ct = res.headers.get('content-type') || ''
  return ct.includes('application/json') ? res.json() : res.text()
}

/** Client CRUD typé. */
export const dv = {
  enabled: USE_DATAVERSE,

  /** GET /_api/{set}?{options} — renvoie le tableau .value */
  list: async (set, options = '') => {
    const r = await call('GET', `${set}${options}`)
    return r?.value ?? []
  },

  /** GET /_api/{set}({id})?{options} */
  get: (set, id, options = '') => call('GET', `${set}(${id})${options}`),

  /** POST /_api/{set} — renvoie l'enregistrement créé (Prefer: return=representation) */
  create: async (set, data) => {
    if (!USE_DATAVERSE) return data
    return await call('POST', set, data)
  },

  /** PATCH /_api/{set}({id}) */
  update: (set, id, data) => call('PATCH', `${set}(${id})`, data),

  /** DELETE /_api/{set}({id}) */
  remove: (set, id) => call('DELETE', `${set}(${id})`),
}

/** Récupère l'identité de l'utilisateur courant du portail. */
let cachedUser
export async function getCurrentUser() {
  if (cachedUser !== undefined) return cachedUser

  // 1) Globals exposés par le shell Power Pages
  if (typeof window !== 'undefined') {
    const g = window.Microsoft?.Dynamic365?.Portal?.User || window.User
    if (g && (g.contactId || g.userId || g.id)) {
      cachedUser = {
        contactId: g.contactId || g.userId || g.id,
        firstName: g.firstName,
        lastName: g.lastName,
        userName: g.userName,
        identityName: g.identityName,
      }
      return cachedUser
    }
  }

  // 2) Endpoint profil
  try {
    const r = await fetch('/_services/portal/profile', { credentials: 'include' })
    if (r.ok) {
      const j = await r.json().catch(() => null)
      if (j) {
        cachedUser = j
        return cachedUser
      }
    }
  } catch {
    /* ignore */
  }

  cachedUser = null
  return null
}
