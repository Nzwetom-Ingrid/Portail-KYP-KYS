// =============================================================
// Couche métier : opérations haut niveau côté partenaire
// =============================================================
// CONTRAT PARTAGÉ AVEC L'APP INTERNE (AFB_KYP_KYS) :
// ce module lit et écrit EXACTEMENT les mêmes colonnes et les
// mêmes valeurs de choix (option sets) que le Power App interne,
// telles que définies dans les modèles générés (src/generated).
// C'est ce partage strict du schéma Dataverse qui fait que les
// deux applications « communiquent » : ce que le partenaire écrit
// ici est lu tel quel par la conformité, et inversement.
//
// Les fonctions exposent des « view-models » stables (forme
// attendue par les composants React) et traduisent depuis/vers
// le schéma Dataverse réel. Les composants ignorent la source
// (Dataverse en ligne, ou mocks en développement local).
// =============================================================

import { dv, getCurrentUser, getCurrentUserEmail } from './dataverse'
import { SETS, LOGICAL, CHOICES } from '../config/dataverse'
import { entityTypeFromFamille, entityTypeFromRef, CODE_PAR_TYPE } from '../config/entityType'
import {
  construireDemandes,
  estPieceJustificative,
  mapDemande,
  DEMANDE,
  RELATION_TIERS_DEMANDE,
} from '../config/demandes'
import {
  MOCK_TIERS,
  MOCK_DOSSIER,
  MOCK_DOCUMENTS,
  MOCK_DOCUMENT_CATEGORIES,
  MOCK_UBOS,
  MOCK_EVALUATIONS,
  MOCK_QUESTIONNAIRES,
  MOCK_QUESTIONS,
} from './mock'

// -- Helpers de lecture des choix (libellé formaté Dataverse) ---
const FV = '@OData.Community.Display.V1.FormattedValue'
const fmt = (rec, field) => rec?.[`${field}${FV}`] ?? null
const esc = (s) => String(s).replace(/'/g, "''") // échappe les apostrophes OData

// -------- Tiers courant (résolu via l'identité externe B2C) ----
// L'utilisateur connecté est relié à SA fiche afb_tiers via la table
// afb_tiersexterneb2c (champ afb_emaildauthentification → lookup
// afb_nomdutiers). Ce n'est PAS un lookup sur le Contact.
let _tiers = null

/** Plafond retenu quand le type de partenaire ne le précise pas. */
export const MAX_GERANTS_DEFAUT = 5

// Mappe un enregistrement afb_tiers réel → view-model stable du portail
function mapTiers(t, b2c) {
  if (!t) return null

  // Source de vérité : la famille d'institution du type de partenaire choisi
  // par le chargé de relation à la création. C'est elle qui fixe déjà, côté
  // back-office, le préfixe de référence du dossier, la checklist des pièces
  // et la durée de validité — le portail lit donc la même chose.
  const famille = t.afb_typejuridique?.afb_familledinstitution
  let type = famille !== undefined && famille !== null ? entityTypeFromFamille(famille) : null

  // Repli, uniquement si le type de partenaire n'est pas lisible (permission de
  // table absente sur afb_partnertype, ou fiche ancienne sans type renseigné).
  // Cette heuristique est CONNUE POUR SE TROMPER : la création de dossier écrit
  // systématiquement DCONF, donc tout le monde ressort « partenaire ».
  if (!type) {
    const orga = b2c ? fmt(b2c, 'afb_typedorganisation') : null
    const direction = fmt(t, 'afb_directionporteuse')
    type = orga === 'Fournisseur' || (!orga && direction === 'DMG') ? 'fournisseur' : 'partenaire'
  }

  return {
    afb_tiersid: t.afb_tiersid,
    afb_nom: t.afb_nomdupartenaire || '—',
    afb_type: CODE_PAR_TYPE[type] ?? 'KYP',
    afb_entity_type: type, // 'partenaire' | 'fournisseur' | 'correspondant' | 'intragroupe'
    // Plafond de gérants, réglé par type de partenaire. Absent — type illisible
    // faute de permission, ou colonne non renseignée — on retombe sur 5.
    afb_max_gerants: t.afb_typejuridique?.afb_nombremaximumdegerants || MAX_GERANTS_DEFAUT,
    afb_statut: fmt(t, 'afb_statutdutiers'),
    afb_niveau_risque: fmt(t, 'afb_niveauderisque'),
    // Champs bruts conservés pour la mise à jour (onboarding)
    afb_nomdupartenaire: t.afb_nomdupartenaire,
    afb_numerorccmimmatriculation: t.afb_numerorccmimmatriculation,
    afb_pays: t.afb_pays,
    afb_ville: t.afb_ville,
    afb_adressecomplete: t.afb_adressecomplete,
    afb_emailcontactprincipal: t.afb_emailcontactprincipal,
    afb_telephone: t.afb_telephone,
    afb_codeswiftbic: t.afb_codeswiftbic,
    afb_secteurdactivite: t.afb_secteurdactivite,
    afb_documentsrequis: t.afb_documentsrequis, // liste JSON des pièces attendues (personnalisée)
  }
}

const TIERS_SELECT =
  'afb_tiersid,afb_nomdupartenaire,afb_statutdutiers,afb_niveauderisque,afb_directionporteuse,' +
  'afb_pays,afb_ville,afb_adressecomplete,afb_numerorccmimmatriculation,' +
  'afb_emailcontactprincipal,afb_telephone,afb_codeswiftbic,afb_secteurdactivite,afb_documentsrequis'

// Expansion du type de partenaire : c'est sa famille d'institution qui donne le
// type d'entite. Necessite la permission de table afb_partnertype (Global, R) ;
// sans elle l'expansion revient vide et mapTiers bascule sur le repli.
const TIERS_EXPAND =
  '&$expand=afb_typejuridique($select=afb_familledinstitution,afb_nombremaximumdegerants)'
// Meme expansion, imbriquee dans un $expand parent (syntaxe OData : point-virgule).
const TIERS_EXPAND_IMBRIQUE =
  ';$expand=afb_typejuridique($select=afb_familledinstitution,afb_nombremaximumdegerants)'

/** Entreprise retenue lorsque l'utilisateur en gère plusieurs. */
const CLE_TIERS_CHOISI = 'afb_tiers_choisi'

/**
 * Pourquoi le rattachement a échoué.
 *
 * Les trois voies d'accès étaient explorées avec un `.catch(() => [])` : une
 * permission de table absente et une absence de données produisaient exactement
 * le même résultat — une liste vide — et l'écran affichait « aucune entreprise »
 * dans les deux cas. Or ce sont deux pannes opposées : l'une se corrige dans les
 * autorisations du rôle web, l'autre dans la fiche du tiers. On garde donc la
 * trace de ce qui s'est réellement passé sur chaque voie.
 */
let _diagRattachement = null

/** @returns {{voies: Array<{canal: string, statut: string, message?: string}>, trouves: number}|null} */
export function getDiagnosticRattachement() {
  return _diagRattachement
}

/** Un refus d'autorisation se lit sur le code HTTP renvoyé par le portail. */
function estRefus(e) {
  return /→ 40[13]\b/.test(String(e?.message || ''))
}

/**
 * TOUTES les entreprises auxquelles l'utilisateur connecté a accès.
 *
 * Une même personne peut être rattachée à plusieurs partenaires — un dirigeant
 * de groupe, un mandataire qui suit deux sociétés. Les trois voies de résolution
 * sont donc explorées ENTIÈREMENT puis fusionnées, au lieu de s'arrêter à la
 * première trouvée comme auparavant.
 */
export async function loadAccessibleTiers() {
  if (!dv.enabled) return [MOCK_TIERS]

  const trouves = new Map() // dédoublonné par identifiant de tiers
  const voies = []

  /**
   * Explore une voie, sans jamais interrompre les suivantes.
   *
   * L'expansion du type de partenaire est un CONFORT : elle donne le type
   * d'entité (KYP / KYS). Elle exige pourtant une permission de table
   * supplémentaire sur `afb_partnertype`, et Dataverse refuse la requête
   * ENTIÈRE lorsqu'elle manque — pas seulement l'expansion. Le portail perdait
   * alors l'entreprise elle-même, et le dépôt de pièces devenait impossible :
   * une commodité d'affichage bloquait une résolution essentielle.
   *
   * On réessaie donc sans l'expansion. Le type retombe sur le préfixe de la
   * référence du dossier, qui le porte déjà.
   *
   * @param construire (avecType: boolean) => Promise — bâtit la requête.
   */
  const tenter = async (canal, construire) => {
    try {
      const r = await construire(true)
      voies.push({ canal, statut: 'ok' })
      return r
    } catch (e) {
      if (!estRefus(e)) {
        voies.push({ canal, statut: 'erreur', message: String(e?.message || e) })
        return null
      }
      try {
        const r = await construire(false)
        voies.push({ canal, statut: 'ok-sans-type' })
        return r
      } catch (e2) {
        voies.push({
          canal,
          statut: estRefus(e2) ? 'refuse' : 'erreur',
          message: String(e2?.message || e2),
        })
        return null
      }
    }
  }

  // ---- Voie 1 (SÉCURISÉE) : tiers lié au Contact connecté via le lookup
  // afb_Tiers (relation afb_contact_Tiers_afb_tiers). Ne lit que SA propre
  // fiche (permission Tiers-son-propre, scope Contact) — aucune lecture globale.
  const user = await getCurrentUser()
  if (user?.contactId) {
    const c = await tenter('contact', (avecType) =>
      dv.get(
        SETS.contact,
        user.contactId,
        `?$select=contactid&$expand=afb_Tiers($select=${TIERS_SELECT}${avecType ? TIERS_EXPAND_IMBRIQUE : ''})`
      )
    )
    if (c?.afb_Tiers) {
      const m = mapTiers(c.afb_Tiers, null)
      if (m) trouves.set(m.afb_tiersid, m)
    }
  }

  const email = await getCurrentUserEmail()
  if (!email) {
    voies.push({ canal: 'email', statut: 'inconnu' })
    _diagRattachement = { voies, trouves: trouves.size }
    return [...trouves.values()]
  }

  // ---- Voie 2 (RECOMMANDÉE) : tiers dont « Email contact principal »
  // (afb_emailcontactprincipal) = e-mail de connexion. Robuste quand le lookup
  // Contact.afb_Tiers n'est pas renseigné.
  const direct = (await tenter('email-principal', (avecType) =>
    dv.list(
      SETS.tiers,
      `?$filter=afb_emailcontactprincipal eq '${esc(email)}'&$select=${TIERS_SELECT}${avecType ? TIERS_EXPAND : ''}`
    )
  )) ?? []
  for (const t of direct) {
    const m = mapTiers(t, null)
    if (m) trouves.set(m.afb_tiersid, m)
  }

  // ---- Voie 3 (REPLI) : identités externes B2C portant cet e-mail.
  const rows = (await tenter('identite-externe', (avecType) =>
    dv.list(
      SETS.tiersExterneB2C,
      `?$filter=afb_emaildauthentification eq '${esc(email)}'` +
        `&$select=afb_tiersexterneb2cid,afb_typedorganisation` +
        `&$expand=afb_nomdutiers($select=${TIERS_SELECT}${avecType ? TIERS_EXPAND_IMBRIQUE : ''})`
    )
  )) ?? []
  for (const row of rows) {
    const m = mapTiers(row?.afb_nomdutiers, row)
    if (m) trouves.set(m.afb_tiersid, m)
  }

  _diagRattachement = { voies, trouves: trouves.size }

  return [...trouves.values()].sort((a, b) => (a.afb_nom || '').localeCompare(b.afb_nom || '', 'fr'))
}

/**
 * Entreprise active. Lorsque l'utilisateur en gère plusieurs, c'est celle qu'il
 * a choisie ; à défaut, la première. Le choix survit au rechargement.
 */
export async function getCurrentTiers() {
  if (_tiers) return _tiers
  if (!dv.enabled) {
    _tiers = MOCK_TIERS
    return _tiers
  }

  const accessibles = await loadAccessibleTiers()
  if (!accessibles.length) return null

  let choisi = null
  try {
    const id = localStorage.getItem(CLE_TIERS_CHOISI)
    // Le choix mémorisé n'est retenu que s'il reste accessible : un accès peut
    // avoir été révoqué depuis, et l'utilisateur se retrouverait sur une
    // entreprise dont il ne voit plus rien.
    choisi = id ? accessibles.find((t) => t.afb_tiersid === id) : null
  } catch {
    /* stockage indisponible (mode privé) : on prend la première */
  }

  _tiers = choisi ?? accessibles[0]

  // Le type de dossier est désormais CHOISI par le chargé de relation au
  // back-office, pas seulement déduit de la famille d'institution : une SARL
  // peut être un partenaire ou un fournisseur. Ce choix est porté par le
  // préfixe de la référence du dossier (KYP / KYS / KYC-B / KYI). Il prime donc
  // sur la déduction faite dans mapTiers, qui n'est qu'un défaut.
  const dossier = await loadDossier(_tiers.afb_tiersid).catch(() => null)
  const typeChoisi = entityTypeFromRef(dossier?.afb_reference)
  if (typeChoisi && typeChoisi !== _tiers.afb_entity_type) {
    _tiers = { ..._tiers, afb_entity_type: typeChoisi, afb_type: CODE_PAR_TYPE[typeChoisi] }
  }

  return _tiers
}

/** Bascule d'entreprise. Le cache est vidé : tous les écrans se rechargent. */
export function setCurrentTiers(tiersId) {
  try {
    localStorage.setItem(CLE_TIERS_CHOISI, tiersId)
  } catch {
    /* stockage indisponible : la bascule ne survivra pas au rechargement */
  }
  _tiers = null
}

// -------- Profil de l'utilisateur connecté (en-tête portail) ----
// Affiche le NOM DE LA PERSONNE connectée (fiche Contact), et place le nom de
// l'entreprise (tiers) en sous-titre. On n'utilise JAMAIS le nom du tiers comme
// nom de personne (source de confusion).
function nameFromContact(c) {
  if (!c) return ''
  return c.fullname || [c.firstname, c.lastname].filter(Boolean).join(' ') || ''
}

export async function getCurrentUserProfile() {
  const [user, t, email] = await Promise.all([
    getCurrentUser().catch(() => null),
    getCurrentTiers().catch(() => null),
    getCurrentUserEmail().catch(() => null),
  ])

  let name = ''
  // 0) Nom injecté par Power Pages via Liquid (fiable, aucun appel Dataverse)
  if (user?.fullName && !user.fullName.includes('@') && user.fullName.charAt(0) !== '{') {
    name = user.fullName
  }
  // 1) Fiche Contact par son id (source du « Signed in as » de Power Pages)
  if (!name && user?.contactId && dv.enabled) {
    const c = await dv
      .get(SETS.contact, user.contactId, '?$select=fullname,firstname,lastname')
      .catch(() => null)
    name = nameFromContact(c)
  }
  // 2) Fiche Contact par e-mail (si l'id n'est pas exposé côté code site)
  if (!name && email && dv.enabled) {
    const rows = await dv
      .list(SETS.contact, `?$filter=emailaddress1 eq '${esc(email)}'&$top=1&$select=fullname,firstname,lastname`)
      .catch(() => [])
    name = nameFromContact(rows[0])
  }
  // 3) Champs d'identité B2C (jamais l'e-mail ni un GUID)
  if (!name) name = [user?.firstName, user?.lastName].filter(Boolean).join(' ')
  if (!name && user?.identityName && !user.identityName.includes('@')) name = user.identityName
  // 4) Repli neutre — surtout PAS le nom du tiers ici
  if (!name) name = 'Partenaire'

  const type = t?.afb_type || 'KYP'
  const company = t?.afb_nom && t.afb_nom !== '—' ? t.afb_nom : null
  const subtitle = company ? `${company} · ${type}` : `Partenaire · ${type}`
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || 'P'
  return { name, subtitle, initials }
}

// -------- Onboarding : MISE À JOUR de la fiche tiers existante ---
// Conforme au cahier des charges : la fiche tiers/cible est créée
// par AFB (charge de relation), puis le partenaire est invité et
// complète SA fiche en libre-service. Le portail ne crée pas de tiers.
export async function submitOnboarding(form) {
  if (!dv.enabled) {
    _tiers = { ...MOCK_TIERS, afb_nom: form.raisonSociale || MOCK_TIERS.afb_nom }
    return _tiers
  }
  const t = await getCurrentTiers()
  if (!t?.afb_tiersid) {
    throw new Error("Aucune fiche tiers rattachée à votre compte. Contactez votre chargé de relation AFB.")
  }
  const patch = {}
  if (form.raisonSociale) patch.afb_nomdupartenaire = form.raisonSociale
  if (form.rccm) patch.afb_numerorccmimmatriculation = form.rccm
  if (form.pays) patch.afb_pays = form.pays
  if (form.ville) patch.afb_ville = form.ville
  if (form.swift) patch.afb_codeswiftbic = form.swift
  if (form.secteur) patch.afb_secteurdactivite = form.secteur
  if (form.adresse) patch.afb_adressecomplete = form.adresse
  if (form.email) patch.afb_emailcontactprincipal = form.email
  if (form.telephone) patch.afb_telephone = form.telephone

  await dv.update(SETS.tiers, t.afb_tiersid, patch)
  await dv.update(SETS.tiers, t.afb_tiersid, {
    afb_datedernieremiseajour: new Date().toISOString(),
  }).catch(() => {})

  _tiers = { ...t, ...mapTiers({ afb_tiersid: t.afb_tiersid, ...patch }) }
  return _tiers
}

// -------- Bénéficiaires effectifs (UBO) du tiers -------------
// L'UBO utilise les vrais noms de colonnes (page construite sur le schéma réel).
/* ---------------------------------------------------------------------------
 *  Gérants et dirigeants (table « Employé »)
 * ------------------------------------------------------------------------- */

/** Un enregistrement Dataverse → la forme manipulée par le formulaire. */
function mapGerant(g) {
  return {
    id: g.afb_employe1id,
    nom: g.afb_nomcomplet || '',
    fonction: g.afb_fonction || '',
    email: g.afb_adresseemail || '',
    telephone: g.afb_numerodetelephone || '',
    typePiece: g.afb_typedepiecedidentite ?? CHOICES.gerantPiece.CNI,
    numeroPiece: g.afb_numerodepiecedidentite || '',
    nationalite: g.afb_nationalite || '',
    dateNaissance: g.afb_datedenaissance ? String(g.afb_datedenaissance).slice(0, 10) : '',
    representant: g.afb_representantlegal === CHOICES.gerantRepresentant.Oui,
    rang: g.afb_rang ?? 0,
  }
}

export async function loadGerants(tiersId) {
  if (!dv.enabled) return []
  const rows = await dv
    .list(
      SETS.gerant,
      `?$filter=_afb_tiers_value eq ${tiersId}` +
        `&$select=afb_employe1id,afb_nomcomplet,afb_fonction,afb_adresseemail,` +
        `afb_numerodetelephone,afb_typedepiecedidentite,afb_numerodepiecedidentite,` +
        `afb_nationalite,afb_datedenaissance,afb_representantlegal,afb_rang` +
        `&$orderby=afb_rang asc`
    )
    .catch(() => [])
  return rows.map(mapGerant)
}

/**
 * Enregistre un gérant.
 *
 * Deux voies d'écriture, essayées dans cet ordre : le deep-insert dans la
 * collection de navigation du tiers — celui qui contourne l'erreur
 * d'association du Web API (90040106) sur les documents — puis, s'il échoue,
 * la création directe avec le lookup en `@odata.bind`. Le nom exact de la
 * relation dépend de la façon dont Maker l'a nommée ; plutôt que de le
 * supposer, on tente les deux.
 */
export async function saveGerant(tiersId, g, rang = 0) {
  if (!dv.enabled) return null
  const payload = {
    afb_nomcomplet: g.nom?.trim() || '',
    afb_fonction: g.fonction?.trim() || '',
    afb_adresseemail: g.email?.trim() || '',
    afb_representantlegal: g.representant
      ? CHOICES.gerantRepresentant.Oui
      : CHOICES.gerantRepresentant.Non,
    afb_rang: rang,
  }
  if (g.telephone?.trim()) payload.afb_numerodetelephone = g.telephone.trim()
  if (g.numeroPiece?.trim()) payload.afb_numerodepiecedidentite = g.numeroPiece.trim()
  if (g.nationalite?.trim()) payload.afb_nationalite = g.nationalite.trim()
  if (g.dateNaissance) payload.afb_datedenaissance = g.dateNaissance
  if (g.typePiece !== undefined && g.typePiece !== null) {
    payload.afb_typedepiecedidentite = Number(g.typePiece)
  }

  // Mise à jour d'un gérant déjà enregistré.
  if (g.id) return dv.update(SETS.gerant, g.id, payload)

  try {
    return await dv.createIn(SETS.tiers, tiersId, 'afb_employe1_Tiers_afb_tiers', payload)
  } catch {
    return dv.create(SETS.gerant, {
      ...payload,
      [`afb_Tiers@odata.bind`]: `/${SETS.tiers}(${tiersId})`,
    })
  }
}

/** Retire un gérant supprimé du formulaire. */
export async function deleteGerant(id) {
  if (!dv.enabled) return null
  return dv.remove(SETS.gerant, id)
}

export async function loadUbos(tiersId) {
  if (!dv.enabled) return [...MOCK_UBOS]
  return await dv.list(
    SETS.ubo,
    `?$filter=_afb_tiersparent_value eq ${tiersId}` +
      `&$select=afb_uboid,afb_nomouraisonsociale,afb_nationalite,afb_datedenaissance,` +
      `afb_pourcentagededetentiondirecte,afb_typedentite,afb_statutdevalidation,afb_statutppe,createdon` +
      `&$orderby=createdon desc`
  )
}

export async function submitUbo(tiersId, form) {
  if (!dv.enabled) {
    return {
      afb_uboid: `mock-${Date.now()}`,
      afb_nomouraisonsociale: form.nom,
      afb_nationalite: form.nationalite || null,
      afb_datedenaissance: form.dateNaissance || null,
      afb_pourcentagededetentiondirecte: Number(form.pourcentage) || 0,
      afb_typedentite: form.typeEntite === 'morale' ? CHOICES.uboTypeEntite.Morale : CHOICES.uboTypeEntite.Physique,
      afb_statutdevalidation: CHOICES.uboStatut.EnCours,
      afb_statutppe: form.ppe ? CHOICES.uboPpe.AutoDeclaree : CHOICES.uboPpe.Non,
      createdon: new Date().toISOString(),
    }
  }
  // Deep-insert dans la collection de navigation du tiers (afb_tiersparent) pour
  // contourner le contrôle d'association Web API (90040106). Le rattachement au
  // tiers passe par l'URL — pas de @odata.bind.
  const payload = {
    afb_nomouraisonsociale: form.nom,
    afb_pourcentagededetentiondirecte: Number(form.pourcentage) || 0,
    afb_typedentite: form.typeEntite === 'morale' ? CHOICES.uboTypeEntite.Morale : CHOICES.uboTypeEntite.Physique,
    afb_statutdevalidation: CHOICES.uboStatut.EnCours, // « En cours » — la conformité revoit côté back-office
    afb_statutppe: form.ppe ? CHOICES.uboPpe.AutoDeclaree : CHOICES.uboPpe.Non,
    ...(form.nationalite ? { afb_nationalite: form.nationalite } : {}),
    ...(form.dateNaissance ? { afb_datedenaissance: form.dateNaissance } : {}),
  }
  const created = await dv.createIn(SETS.tiers, tiersId, 'afb_ubo_tiersparent_afb_tiers', payload)

  // Power Pages peut répondre 204 sans corps ni OData-EntityId → le record est
  // BIEN créé, mais createIn renvoie null. On relit alors le UBO le plus récent
  // de ce tiers portant le même nom (même logique que createResponseHeader).
  let uboId = created?.afb_uboid || created?.id
  if (!uboId) {
    const nom = String(form.nom || '').replace(/'/g, "''")
    const rows = await dv.list(
      SETS.ubo,
      `?$filter=_afb_tiersparent_value eq ${tiersId} and afb_nomouraisonsociale eq '${nom}'` +
        `&$select=afb_uboid&$orderby=createdon desc&$top=1`
    ).catch(() => [])
    uboId = rows[0]?.afb_uboid
  }
  if (!uboId) throw new Error('Bénéficiaire créé mais identifiant introuvable (relecture).')

  // Renvoie l'enregistrement complet pour l'affichage immédiat côté portail.
  const full = await dv.get(
    SETS.ubo,
    uboId,
    `?$select=afb_uboid,afb_nomouraisonsociale,afb_nationalite,afb_datedenaissance,` +
      `afb_pourcentagededetentiondirecte,afb_typedentite,afb_statutdevalidation,afb_statutppe,createdon`
  ).catch(() => null)
  return full || { afb_uboid: uboId, ...payload, createdon: new Date().toISOString() }
}

// -------- Évaluations du tiers (vues par le partenaire) ------
// Conformément au besoin : le tiers ne voit QUE les évaluations VALIDÉES
// le concernant (avis des évaluateurs, note, décision de partenariat).
function mapEvaluation(e) {
  const note = e.afb_noteglobale ?? 0
  const max = e.afb_notemaximalepossible || 0
  return {
    id: e.afb_evaluationpartenaireid,
    reference: e.afb_referencedevaluation || '—',
    date: e.afb_datedevaluation || null,
    periodeDebut: e.afb_debutdelaperiodeevaluee || null,
    periodeFin: e.afb_findelaperiodeevaluee || null,
    note,
    noteMax: max,
    pourcentage: max ? Math.round((note / max) * 100) : 0,
    risque: fmt(e, 'afb_niveauderisquecalcule') || '—',
    tendance: fmt(e, 'afb_tendanceparrapportalevaluationprece') || null,
    avis: e.afb_commentaireglobal || '',
    plan: e.afb_plandactions || '',
    decision: fmt(e, 'afb_decisionpartenariat') || null,
    dateValidation: e.afb_datedevalidation || null,
  }
}

export async function loadEvaluations(tiersId) {
  if (!dv.enabled) return [...MOCK_EVALUATIONS]
  const rows = await dv.list(
    SETS.evaluation,
    // Validée ET publiée (push) : afb_datedevalidation = date de mise à disposition.
    // Le tiers ne voit son évaluation qu'après le « push » des internes.
    `?$filter=_afb_tiersevalue_value eq ${tiersId} and afb_statutdelevaluation eq ${CHOICES.evaluationStatut.Validee}` +
      ` and afb_datedevalidation ne null` +
      `&$select=afb_evaluationpartenaireid,afb_referencedevaluation,afb_datedevaluation,` +
      `afb_debutdelaperiodeevaluee,afb_findelaperiodeevaluee,afb_noteglobale,afb_notemaximalepossible,` +
      `afb_niveauderisquecalcule,afb_tendanceparrapportalevaluationprece,afb_commentaireglobal,` +
      `afb_plandactions,afb_decisionpartenariat,afb_datedevalidation` +
      `&$orderby=afb_datedevaluation desc`
  )
  return rows.map(mapEvaluation)
}

// -------- Dossier KYP/KYS du tiers ---------------------------
export async function loadDossier(tiersId) {
  if (!dv.enabled) return MOCK_DOSSIER
  const items = await dv.list(
    SETS.dossier,
    `?$filter=_afb_nomdutiers_value eq ${tiersId}&$top=1&$orderby=createdon desc` +
      `&$select=afb_dossierkypkysid,afb_statutdudossier,afb_tauxdecompletude,afb_datedesoumission,afb_versiondudossier,afb_referencedudossier,afb_commentairedconf`
  )
  const d = items[0]
  if (!d) return null
  return {
    afb_dossierid: d.afb_dossierkypkysid,
    afb_reference: d.afb_referencedudossier ?? null, // préfixe → type d'entité (checklist)
    afb_statut: fmt(d, 'afb_statutdudossier'),
    afb_statutcode: d.afb_statutdudossier, // code brut (0 Validé, 2 À compléter, 747010002 Rejeté…)
    afb_commentaire_dconf: d.afb_commentairedconf ?? null, // avis de la conformité, visible par le tiers
    afb_taux_complet: d.afb_tauxdecompletude ?? 0,
    afb_date_soumission: d.afb_datedesoumission ?? null,
    afb_version: d.afb_versiondudossier ?? 1,
  }
}

// -------- Documents (bibliothèque) ---------------------------
// Mappe le choix réel afb_statutdevalidite → vocabulaire du portail
const DOC_STATUT_FROM_INT = {
  0: 'Valide',
  1: 'EnRevue', // « En attente de validation »
  747010001: 'Expire',
  747010002: 'Rejete',
  747010003: 'Remplace', // supplantée par une version plus récente
}

function mapDocument(d) {
  return {
    afb_documentid: d.afb_documentid,
    afb_nomfichier: d.afb_nomdufichier || '—',
    afb_typedocument: d.afb_typededocument || '—',
    afb_categorie_label: d.afb_categorie?.afb_libelle || fmt(d, '_afb_categorie_value') || 'Document',
    afb_statutvalidite: DOC_STATUT_FROM_INT[d.afb_statutdevalidite] ?? 'EnRevue',
    afb_date_expiration: d.afb_datedexpiration || null,
    createdon: d.afb_datedeteleversement || d.createdon || null,
  }
}

export async function loadDocuments(tiersId) {
  if (!dv.enabled) return [...MOCK_DOCUMENTS]
  // « Mes documents » = ce que le tiers a déposé. On EXCLUT les documents partagés
  // par la banque (afb_sourcedudepot = 747010001), qui vivent dans « Documents reçus ».
  const rows = await dv.list(
    SETS.document,
    `?$filter=_afb_tiers_value eq ${tiersId} and afb_sourcedudepot ne ${CHOICES.documentSource.DCONF}` +
      `&$select=afb_documentid,afb_nomdufichier,afb_typededocument,afb_statutdevalidite,` +
      `afb_datedexpiration,afb_datedeteleversement,createdon` +
      `&$expand=afb_categorie($select=afb_libelle)` +
      `&$orderby=afb_datedeteleversement desc`
  )
  // Exclut tout ce qui n'est pas une pièce déposée : demandes du tiers,
  // réponses de la banque à ces demandes, compléments rattachés à un document
  // reçu. Le prédicat est partagé avec le back-office (config/demandes.js) —
  // il avait déjà fallu le corriger deux fois à deux endroits.
  return rows.filter(estPieceJustificative).map(mapDocument)
}

// « Documents reçus » = documents partagés par la banque (DCONF/DMG) vers ce tiers.
export async function loadReceivedDocuments(tiersId) {
  if (!dv.enabled) return []
  const rows = await dv.list(
    SETS.document,
    `?$filter=_afb_tiers_value eq ${tiersId} and afb_sourcedudepot eq ${CHOICES.documentSource.DCONF}` +
      `&$select=afb_documentid,afb_nomdufichier,afb_typededocument,afb_statutdevalidite,` +
      `afb_datedexpiration,afb_datedeteleversement,createdon` +
      `&$expand=afb_categorie($select=afb_libelle)` +
      `&$orderby=afb_datedeteleversement desc`
  )
  return rows.map(mapDocument)
}

// Catégories documentaires (pour le menu de téléversement)
/**
 * Demandes du tiers et réponses de la conformité.
 *
 * Le partenaire écrivait jusqu'ici sans retour possible : sa demande partait
 * dans le dossier et rien ne lui revenait. Il voit désormais le fil complet.
 */
/**
 * Demandes du tiers et réponses de la conformité.
 *
 * Deux sources, fusionnées : la table `afb_demandederevue` pour les nouvelles,
 * et `afb_document` pour celles émises avant qu'elle n'existe. Ces dernières
 * ne sont pas migrées — une reprise de données pour une poignée
 * d'enregistrements ferait courir plus de risques qu'elle n'en éviterait — mais
 * elles restent lisibles, ce qui est le seul point qui compte pour le tiers.
 */
export async function loadDemandes(tiersId) {
  if (!dv.enabled) return []

  const [lignes, anciens] = await Promise.all([
    dv
      .list(
        SETS.demande,
        `?$filter=_afb_tiers_value eq ${tiersId}` +
          `&$select=afb_demandederevueid,afb_objetdelademande,afb_messagedelademande,` +
          `afb_typededemande,afb_statut,afb_emisepar,afb_datedemission,createdon,_afb_demandeparente_value` +
          `&$orderby=afb_datedemission desc`
      )
      .catch(() => []),
    dv
      .list(
        SETS.document,
        `?$filter=_afb_tiers_value eq ${tiersId}` +
          `&$select=afb_documentid,afb_typededocument,afb_motifderejet,afb_statutdevalidite,` +
          `afb_datedeteleversement,createdon` +
          `&$orderby=afb_datedeteleversement desc`
      )
      .catch(() => []),
  ])

  // Une réponse est une ligne dont « Demande parente » est renseignée.
  const reponsesParDemande = new Map()
  for (const l of lignes) {
    const parent = l._afb_demandeparente_value
    if (!parent) continue
    const r = {
      id: l.afb_demandederevueid,
      texte: l.afb_messagedelademande || '',
      date: l.afb_datedemission || l.createdon || null,
    }
    const liste = reponsesParDemande.get(parent)
    if (liste) liste.push(r)
    else reponsesParDemande.set(parent, [r])
  }

  const nouvelles = lignes
    .filter((l) => !l._afb_demandeparente_value)
    .map((l) => mapDemande(l, reponsesParDemande.get(l.afb_demandederevueid) || []))

  return [...nouvelles, ...construireDemandes(anciens)]
}

export async function loadDocumentCategories() {
  if (!dv.enabled) return [...MOCK_DOCUMENT_CATEGORIES]
  const rows = await dv.list(
    SETS.documentCategory,
    `?$select=afb_documentcategoryid,afb_libelle,afb_codedudocument&$orderby=afb_ordredaffichage asc`
  )
  return rows.map((c) => ({ id: c.afb_documentcategoryid, label: c.afb_libelle }))
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] || '')
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

/**
 * Téléverse un fichier dans la bibliothèque du tiers.
 * 1) crée l'enregistrement afb_document (tous les champs requis) ;
 * 2) attache le binaire en note Dataverse.
 * Le binaire est ensuite poussé vers SharePoint par un flux Power
 * Automate qui renseigne afb_urlsharepoint (cf. cahier des charges).
 * @param {object} options
 * @param {string} options.categoryId  Catégorie (afb_documentcategory) — REQUISE côté Dataverse.
 * @param {string|null} [options.expiration]  Date d'expiration (AAAA-MM-JJ).
 */
/**
 * Statut donné à la pièce qui vient d'être remplacée.
 *
 * Distinct d'« Expiré », qui parle de la date de validité du document : une
 * pièce remplacée peut être parfaitement valide, elle n'est simplement plus
 * celle en vigueur. La confusion aurait pu tromper un auditeur.
 */
const STATUT_REMPLACE = CHOICES.documentStatut.Remplace

/** Statut « En revue » du dossier (afb_statutdudossier). */
const DOSSIER_EN_REVUE = 1

/**
 * Une clé de checklist (« rccm », « statuts »…), par opposition à un type MIME
 * ou à un marqueur de demande. Seules ces pièces se remplacent : deux fichiers
 * portant le même type MIME n'ont aucun rapport entre eux.
 */
function estClePiece(docType) {
  const t = String(docType || '')
  return t !== '' && !t.includes('/') && !t.startsWith('reponse') && !t.startsWith('demande')
}

/**
 * Enregistre le remplacement d'une pièce et, si elle était validée, remet le
 * dossier en revue.
 *
 * Deux défauts relevés en recette se corrigent ici. D'abord, remplacer une
 * pièce ne laissait aucune trace : la version examinée par la conformité
 * disparaissait purement et simplement, alors qu'une décision de conformité
 * doit rester rattachable au document sur lequel elle a été prise. Ensuite, un
 * dossier validé le restait après le remplacement d'une de ses pièces — il
 * était donc validé sur la foi d'un document qui n'était plus celui examiné.
 *
 * Rien ici n'est bloquant : si la table des versions ou le dossier ne sont pas
 * accessibles en écriture, le dépôt reste acquis. Perdre la pièce que le
 * partenaire vient de téléverser au motif qu'on n'a pas pu écrire son historique
 * serait le pire des deux maux.
 */
async function enregistrerRemplacement(tiersId, docType, nouveauDocId) {
  if (!estClePiece(docType)) return

  // Pièces précédentes de même nature, la plus récente d'abord.
  const anterieurs = await dv
    .list(
      SETS.document,
      `?$filter=_afb_tiers_value eq ${tiersId} and afb_typededocument eq '${esc(docType)}'` +
        `&$select=afb_documentid,afb_statutdevalidite&$orderby=createdon desc&$top=50`
    )
    .catch(() => [])

  const precedente = anterieurs.find((d) => d.afb_documentid !== nouveauDocId)
  if (!precedente) return // premier dépôt de cette pièce : rien à remplacer

  // Le numéro de version se déduit du nombre de pièces déjà déposées pour cette
  // clé — la nouvelle est la n-ième.
  const numero = anterieurs.length

  await dv
    .create(SETS.documentVersion, {
      afb_referencedeversion: `${docType}-v${numero}`,
      afb_numerodeversion: numero,
      afb_datederemplacement: new Date().toISOString(),
      afb_motifderemplacement: 'Remplacement par le partenaire depuis le portail.',
      [`afb_documentanterieur@odata.bind`]: `/${SETS.document}(${precedente.afb_documentid})`,
      [`afb_documentcourant@odata.bind`]: `/${SETS.document}(${nouveauDocId})`,
    })
    .catch(() => null)

  // La pièce remplacée sort du jeu courant : sans cela, le partenaire verrait
  // deux fois la même pièce, l'une « Validée » et l'autre « En attente ».
  await dv
    .update(SETS.document, precedente.afb_documentid, { afb_statutdevalidite: STATUT_REMPLACE })
    .catch(() => null)

  // Le dossier ne repart en revue QUE si la pièce remplacée avait été validée.
  // Remplacer une pièce encore en attente ne change rien à l'état du dossier.
  if (precedente.afb_statutdevalidite !== CHOICES.documentStatut.Valide) return

  const dossier = await loadDossier(tiersId).catch(() => null)
  if (!dossier?.afb_dossierid) return
  if (dossier.afb_statutcode === DOSSIER_EN_REVUE) return

  await dv
    .update(SETS.dossier, dossier.afb_dossierid, { afb_statutdudossier: DOSSIER_EN_REVUE })
    .catch(() => null)
}

export async function uploadDocument(tiersId, file, { categoryId = null, expiration = null, docType = null } = {}) {
  const sizeKo = Math.round((file.size || 0) / 1024)
  const ext = (file.name.split('.').pop() || 'PDF').toUpperCase()

  if (!dv.enabled) {
    return mapDocument({
      afb_documentid: `mock-${Date.now()}`,
      afb_nomdufichier: file.name,
      afb_typededocument: docType || `${ext} · ${((file.size || 0) / 1048576).toFixed(1)} Mo`,
      afb_statutdevalidite: CHOICES.documentStatut.EnAttente,
      afb_datedexpiration: expiration || null,
      afb_datedeteleversement: new Date().toISOString(),
    })
  }
  if (!categoryId) throw new Error('Sélectionnez une catégorie avant de téléverser.')

  const payload = {
    afb_nomdufichier: file.name,
    // La clé de la pièce attendue (rccm, statuts…) est stockée ici pour le
    // rattachement à la checklist ; à défaut, le type MIME du fichier.
    afb_typededocument: docType || file.type || `application/${ext.toLowerCase()}`,
    afb_statutdevalidite: CHOICES.documentStatut.EnAttente, // « En attente de validation »
    afb_sourcedudepot: CHOICES.documentSource.Tiers, // « Déposé par tiers »
    afb_authentifie: CHOICES.documentAuthentifie.Non,
    afb_datedeteleversement: new Date().toISOString(),
    afb_anneededepot: new Date().getFullYear(),
    afb_tailledufichierko: sizeKo,
    // Renseigné par le flux Power Automate après push SharePoint
    afb_urlsharepoint: `pending://${file.name}`,
    // Lien tiers via l'URL (deep-insert) — pas de @odata.bind. On garde la
    // catégorie en bind (table de référence, contrôle d'association non bloquant).
    [`afb_categorie@odata.bind`]: `/${SETS.documentCategory}(${categoryId})`,
  }
  if (expiration) payload.afb_datedexpiration = expiration

  // Deep-insert dans la collection de navigation du tiers pour contourner
  // l'erreur d'association Web API (90040106).
  const created = await dv.createIn(SETS.tiers, tiersId, 'afb_document_tiers_afb_tiers', payload)

  // Power Pages peut répondre 204 sans corps ni OData-EntityId → le document est
  // BIEN créé, mais createIn renvoie null. On relit alors le document le plus
  // récent de ce tiers portant le même nom de fichier (même logique que
  // createResponseHeader). Sans cela, l'attache de l'annotation ci-dessous
  // échouait sur un id undefined/null → une erreur s'affichait alors que le
  // document existait bel et bien.
  let docId = created?.afb_documentid || created?.id
  if (!docId) {
    const fname = String(file.name || '').replace(/'/g, "''")
    const rows = await dv.list(
      SETS.document,
      `?$filter=_afb_tiers_value eq ${tiersId} and afb_nomdufichier eq '${fname}'` +
        `&$select=afb_documentid&$orderby=createdon desc&$top=1`
    ).catch(() => [])
    docId = rows[0]?.afb_documentid
  }
  if (!docId) throw new Error('Document créé mais identifiant introuvable (relecture).')

  // Attache le binaire en annotation (compatible Power Pages, < 30 Mo).
  const b64 = await fileToBase64(file)
  await dv.create(SETS.annotation, {
    [`objectid_${LOGICAL.document}@odata.bind`]: `/${SETS.document}(${docId})`,
    subject: 'Pièce jointe partenaire',
    filename: file.name,
    mimetype: file.type || 'application/octet-stream',
    documentbody: b64,
  })

  // Après le dépôt seulement : si cette pièce en remplace une autre, on écrit
  // l'historique et, le cas échéant, on remet le dossier en revue.
  await enregistrerRemplacement(tiersId, docType, docId)

  return mapDocument({ ...payload, afb_documentid: docId })
}

export async function deleteDocument(documentId) {
  if (!dv.enabled) return
  await dv.remove(SETS.document, documentId)
}

// -------- Flux inverse : réponses à un document reçu ----------
// Le tiers joint un document (facture, complément…) EN RÉPONSE à un document reçu
// de la banque. La réponse est un afb_document classique (déposé par le tiers),
// relié au document parent via afb_typededocument = 'reponse:<parentDocId>' — pas
// d'association Dataverse (évite le blocage 90040106), juste un marqueur requêtable.
export async function respondToDocument(tiersId, parentDocId, file) {
  if (!dv.enabled) return null
  const cats = await loadDocumentCategories()
  const categoryId = cats[0]?.id
  if (!categoryId) throw new Error('Aucune catégorie de document disponible.')
  // Réutilise uploadDocument (deep-insert + relecture 204 + pièce jointe).
  return uploadDocument(tiersId, file, { categoryId, docType: `reponse:${parentDocId}` })
}

// Demande de document envoyée par le tiers à AFB : « merci d'ajouter tel document
// sur la plateforme ». Enregistrée comme afb_document marqueur ('demande-document')
// — écriture par deep-insert (fiable, pas d'association), SANS fichier. Un flux
// Power Automate surveille la création de ces lignes pour e-mailer AFB (nom du
// document demandé = afb_nomdufichier, message = afb_motifderejet).
export async function requestDocumentFromBank(tiersId, { docName, message }) {
  if (!dv.enabled) return null
  const cats = await loadDocumentCategories()
  const categoryId = cats[0]?.id
  if (!categoryId) throw new Error('Aucune catégorie de document disponible.')
  const payload = {
    // Le nom est optionnel côté tiers ; le champ Dataverse est requis → valeur par défaut.
    afb_nomdufichier: docName || 'Demande de document',
    afb_typededocument: 'demande-document',
    afb_statutdevalidite: CHOICES.documentStatut.EnAttente,
    afb_sourcedudepot: CHOICES.documentSource.Tiers,
    afb_authentifie: CHOICES.documentAuthentifie.Non,
    afb_datedeteleversement: new Date().toISOString(),
    afb_anneededepot: new Date().getFullYear(),
    afb_urlsharepoint: 'request://demande',
    afb_motifderejet: message || '',
    [`afb_categorie@odata.bind`]: `/${SETS.documentCategory}(${categoryId})`,
  }
  await dv.createIn(SETS.tiers, tiersId, 'afb_document_tiers_afb_tiers', payload)
}

/**
 * Demande de revue adressée par le tiers à la conformité : « merci de réexaminer
 * mon dossier ». Enregistrée comme afb_document marqueur ('demande-revue'), sur
 * le même principe que requestDocumentFromBank — table existante, écriture par
 * deep-insert, aucun fichier.
 *
 * Ce que cela fait, et ce que cela ne fait pas : la demande est PERSISTÉE et
 * horodatée, donc opposable et requêtable. Elle ne déclenche AUCUNE notification
 * et n'apparaît pas encore dans l'application interne — cet affichage reste à
 * construire (chantier « demande de revue de bout en bout »).
 */
/**
 * Émet une demande de revue.
 *
 * Elle était jusqu'ici rangée dans `afb_document` avec un marqueur de type et
 * une URL `request://` : une demande n'est pas un document, et elle
 * apparaissait parmi les pièces justificatives, avec des boutons Valider et
 * Rejeter qui n'avaient aucun sens pour un message. Elle a désormais sa table.
 *
 * Deep-insert dans la collection de navigation du tiers, comme pour les
 * documents : c'est ce qui contourne l'erreur d'association du Web API (90040106).
 */
export async function requestReview(tiersId, { message } = {}) {
  if (!dv.enabled) return null
  await dv.createIn(SETS.tiers, tiersId, RELATION_TIERS_DEMANDE, {
    afb_objetdelademande: 'Demande de revue du dossier',
    afb_typededemande: DEMANDE.type.revue,
    afb_statut: DEMANDE.statut.ouverte,
    afb_emisepar: DEMANDE.emisePar.partenaire,
    afb_messagedelademande: message || '',
    // Horodatage métier, distinct de createdon : c'est celui que le tiers voit
    // et celui sur lequel le délai de traitement se mesure.
    afb_datedemission: new Date().toISOString(),
  })
}

// Réponses (enfants) attachées à un document reçu donné.
export async function loadDocumentResponses(tiersId, parentDocId) {
  if (!dv.enabled) return []
  const rows = await dv.list(
    SETS.document,
    `?$filter=_afb_tiers_value eq ${tiersId} and afb_typededocument eq 'reponse:${parentDocId}'` +
      `&$select=afb_documentid,afb_nomdufichier,afb_typededocument,afb_statutdevalidite,` +
      `afb_datedexpiration,afb_datedeteleversement,createdon` +
      `&$orderby=afb_datedeteleversement desc`
  )
  return rows.map(mapDocument)
}

/**
 * Récupère le binaire d'un document pour l'aperçu / le téléchargement.
 * PRIORITÉ à la pièce jointe (annotation) Dataverse : elle est créée à chaque
 * dépôt et donc fiable. On ne retombe sur l'URL SharePoint que si aucune
 * annotation n'existe — car le flux Power Automate n'est pas fiable et l'URL
 * peut pointer vers un fichier absent (404). Auparavant l'ordre était inversé,
 * ce qui faisait échouer le téléchargement (404 SharePoint) alors que le
 * fichier était bien présent en annotation.
 * @returns {Promise<{url?:string, base64?:string, mimetype?:string, filename?:string}>}
 */
export async function getDocumentFile(documentId) {
  if (!dv.enabled) return {}
  // 1) Pièce jointe (annotation) rattachée au document — source fiable.
  const notes = await dv.list(
    SETS.annotation,
    `?$filter=_objectid_value eq ${documentId} and isdocument eq true` +
      `&$select=documentbody,mimetype,filename&$top=1&$orderby=createdon desc`
  ).catch(() => [])
  const n = notes[0]
  if (n?.documentbody) {
    return {
      base64: n.documentbody,
      mimetype: n.mimetype || 'application/octet-stream',
      filename: n.filename || 'document',
    }
  }
  // 2) À défaut, lien SharePoint (documents archivés par le flux, sans annotation).
  const doc = await dv.get(
    SETS.document,
    documentId,
    '?$select=afb_urlsharepoint,afb_nomdufichier'
  ).catch(() => null)
  const url = doc?.afb_urlsharepoint || ''
  if (/^https?:\/\//i.test(url)) return { url, filename: doc?.afb_nomdufichier }
  throw new Error('Fichier introuvable (pièce jointe absente).')
}

// -------- Questionnaires --------------------------------------
// L'affectation pointe vers une VERSION de questionnaire (afb_versionduquestionnaire).
const ASSIGN_STATUT_FROM_INT = {
  0: 'Valide',
  1: 'EnCours',
  2: 'AFaire', // « Affecté »
  747010001: 'Soumis',
  747010002: 'EnCours', // « En retard » → reste à compléter
}

// Statut de la RÉPONSE (afb_statutglobal) → statut affiché sur la carte. La
// réponse est la source de vérité (le back-office valide/rejette la réponse ;
// la mise à jour du statut d'affectation peut échouer sans conséquence ici).
const RESP_STATUT_TO_CARD = {
  0: 'Valide',       // validée par la conformité
  1: 'EnCours',      // brouillon en cours
  747010001: 'Soumis',
  747010002: 'Rejete',
}

export async function loadAssignedQuestionnaires(tiersId) {
  if (!dv.enabled) return [...MOCK_QUESTIONNAIRES]
  const rows = await dv.list(
    SETS.assignment,
    `?$filter=_afb_tiers_value eq ${tiersId}` +
      `&$select=afb_questionnaireassignmentid,afb_statut,afb_datedecheance,afb_tauxdecompletion` +
      `&$expand=afb_versionduquestionnaire($select=afb_questionnaireid,afb_codedudocument,afb_titreenfrancais,afb_descriptionducontenu,afb_typededocument)` +
      `&$orderby=afb_datedecheance asc`
  )

  // Dernière réponse par affectation → statut authoritatif (validé/rejeté/soumis).
  const respByAssign = {}
  const ids = rows.map((r) => r.afb_questionnaireassignmentid).filter(Boolean)
  if (ids.length) {
    const filter = ids.map((id) => `_afb_assignation_value eq ${id}`).join(' or ')
    const resps = await dv.list(
      SETS.response,
      `?$filter=(${filter})&$select=_afb_assignation_value,afb_statutglobal` +
        `&$orderby=createdon desc&$top=200`
    ).catch(() => [])
    for (const rp of resps) {
      const aid = rp._afb_assignation_value
      if (aid && !(aid in respByAssign)) respByAssign[aid] = rp.afb_statutglobal // 1er = plus récent
    }
  }

  return rows.map((r) => {
    const q = r.afb_versionduquestionnaire || {}
    const respStatut = respByAssign[r.afb_questionnaireassignmentid]
    const statut =
      respStatut != null && RESP_STATUT_TO_CARD[respStatut] != null
        ? RESP_STATUT_TO_CARD[respStatut]
        : ASSIGN_STATUT_FROM_INT[r.afb_statut] ?? 'AFaire'
    return {
      afb_assignmentid: r.afb_questionnaireassignmentid,
      afb_questionnaireid: q.afb_questionnaireid,
      afb_code: q.afb_codedudocument,
      afb_intitule: q.afb_titreenfrancais || fmt(q, 'afb_typededocument') || 'Questionnaire',
      afb_sous_titre: q.afb_descriptionducontenu || '',
      afb_nb_questions: null,
      afb_statut: statut,
      afb_progression: r.afb_tauxdecompletion ?? 0,
      afb_echeance: r.afb_datedecheance,
    }
  })
}

const Q_TYPE_FROM_INT = {
  0: 'TEXTE_COURT',
  1: 'OUI_NON',
  2: 'PIECE_JOINTE',
  3: 'TABLEAU',
  4: 'NUMERIQUE',
  747010001: 'TEXTE_LONG',
  747010002: 'CHOIX_UNIQUE',
  747010003: 'CHOIX_MULTIPLES',
  747010004: 'DATE',
  747010005: 'STATUT',
}

// Charge les questions d'un questionnaire via sa hiérarchie sections → questions → options
export async function loadQuestionnaireQuestions(questionnaireId) {
  if (!dv.enabled) return [...MOCK_QUESTIONS]
  if (!questionnaireId) return []

  // 1) Sections du questionnaire
  const sections = await dv.list(
    SETS.section,
    `?$filter=_afb_questionnaireassocie_value eq ${questionnaireId}&$select=afb_questionnairesectionid&$orderby=afb_numerodordre asc`
  )
  if (!sections.length) return []
  const secFilter = sections
    .map((s) => `_afb_section_value eq ${s.afb_questionnairesectionid}`)
    .join(' or ')

  // 2) Questions de ces sections
  const questions = await dv.list(
    SETS.question,
    `?$filter=(${secFilter})` +
      `&$select=afb_questionid,afb_numerodordre,afb_libelleenfrancais,afb_typedequestion,afb_obligatoire` +
      `&$orderby=afb_numerodordre asc`
  )
  if (!questions.length) return []

  // 3) Options de ces questions
  const qFilter = questions
    .map((q) => `_afb_identifiantdelaquestion_value eq ${q.afb_questionid}`)
    .join(' or ')
  const options = await dv.list(
    SETS.questionOption,
    `?$filter=(${qFilter})&$select=afb_libelleenfrancais,afb_valeurstockee,afb_ordredaffichage,_afb_identifiantdelaquestion_value&$orderby=afb_ordredaffichage asc`
  ).catch(() => [])

  const optsByQuestion = {}
  for (const o of options) {
    const qid = o._afb_identifiantdelaquestion_value
    ;(optsByQuestion[qid] ||= []).push(o.afb_libelleenfrancais)
  }

  return questions.map((q) => ({
    afb_questionid: q.afb_questionid,
    afb_ordre: q.afb_numerodordre,
    afb_libelle: q.afb_libelleenfrancais,
    afb_type: Q_TYPE_FROM_INT[q.afb_typedequestion] ?? 'TEXTE_COURT',
    afb_obligatoire: q.afb_obligatoire === 0, // 0 = Oui dans le modèle interne
    options: optsByQuestion[q.afb_questionid] || [],
  }))
}

// Deep-insert : POST dans la collection de navigation du parent pour contourner
// le blocage d'association Power Pages (90040106). La Web API DEV refuse
// l'@odata.bind (AppendTo non honoré) ; en passant par la nav-collection du
// parent, Power Pages contrôle « Créer » sur l'enfant. Noms de relation Dataverse
// (convention <enfant>_<attribut-sans-prefixe>_<parent>, confirmée par UBO/document).
const NAV_ASSIGN_RESPONSE = 'afb_questionnaireresponse_assignation_afb_questionnaireassignment'
const NAV_RESPONSE_QRESPONSE = 'afb_questionresponse_reponseauquestionnaire_afb_questionnaireresponse'

// Crée l'en-tête de réponse (deep-insert sous l'affectation) et renvoie son ID.
// Le POST Power Pages peut répondre 204 sans corps ni OData-EntityId → on relit
// alors la réponse par sa référence unique (le record est bien créé).
async function createResponseHeader(assignmentId, ref, extra) {
  const created = await dv.createIn(SETS.assignment, assignmentId, NAV_ASSIGN_RESPONSE, {
    afb_referencedelareponse: ref,
    ...extra,
  })
  let id = created?.afb_questionnaireresponseid || created?.id
  if (!id) {
    const rows = await dv.list(
      SETS.response,
      `?$filter=afb_referencedelareponse eq '${ref}' and _afb_assignation_value eq ${assignmentId}` +
        `&$select=afb_questionnaireresponseid&$top=1&$orderby=createdon desc`
    ).catch(() => [])
    id = rows[0]?.afb_questionnaireresponseid
  }
  if (!id) throw new Error('Réponse créée mais identifiant introuvable (relecture échouée).')
  return id
}

// Crée les réponses-questions sous une réponse (deep-insert). La question reste
// en @odata.bind : table de référence globale, association autorisée (comme la
// catégorie d'un document).
async function createQuestionResponses(responseId, answers, stamp) {
  await Promise.all(
    Object.entries(answers).map(([questionId, value], i) =>
      dv.createIn(SETS.response, responseId, NAV_RESPONSE_QRESPONSE, {
        [`afb_question@odata.bind`]: `/${SETS.question}(${questionId})`,
        afb_reference: `QR-${Date.now()}-${i}`,
        afb_valeurchoixunique: value == null ? null : String(value),
        afb_horodatage: stamp,
        afb_statut: CHOICES.questionResponseStatut.Validee,
      })
    )
  )
}

export async function submitQuestionnaireResponse(assignmentId, answers) {
  if (!dv.enabled) {
    return { afb_responseid: `mock-${Date.now()}`, soumis: true }
  }
  const stamp = new Date().toISOString()

  // 1) En-tête de réponse — deep-insert sous l'affectation (pas de @odata.bind).
  const responseId = await createResponseHeader(assignmentId, `REP-${Date.now()}`, {
    afb_datedesoumission: stamp,
    afb_statutglobal: CHOICES.responseStatut.Soumis,
  })

  // 2) Réponses individuelles — deep-insert sous la réponse.
  await createQuestionResponses(responseId, answers, stamp)

  // 3) Met à jour l'affectation (statut « Soumis » + complétion 100 %)
  await dv.update(SETS.assignment, assignmentId, {
    afb_statut: CHOICES.assignmentStatut.Soumis,
    afb_tauxdecompletion: 100,
  })

  return { afb_questionnaireresponseid: responseId }
}

// -------- Brouillon de réponses (sauvegarde + reprise) -------
// « Enregistrer le brouillon » : persiste les réponses saisies (statut Brouillon)
// et met à jour la progression de l'affectation, sans verrouiller.
export async function saveQuestionnaireDraft(assignmentId, answers, total) {
  if (!dv.enabled) return { progression: 0 }
  const stamp = new Date().toISOString()
  const answered = Object.keys(answers).length
  const progression = total ? Math.round((answered / total) * 100) : 0

  // Supprime le brouillon précédent pour éviter les doublons à chaque sauvegarde.
  const existing = await dv.list(
    SETS.response,
    `?$filter=_afb_assignation_value eq ${assignmentId} and afb_statutglobal eq ${CHOICES.responseStatut.Brouillon}` +
      `&$select=afb_questionnaireresponseid&$top=10`
  ).catch(() => [])
  for (const r of existing) await dv.remove(SETS.response, r.afb_questionnaireresponseid).catch(() => {})

  // En-tête brouillon — deep-insert sous l'affectation, puis réponses individuelles.
  const responseId = await createResponseHeader(assignmentId, `BRO-${Date.now()}`, {
    afb_statutglobal: CHOICES.responseStatut.Brouillon,
  })
  await createQuestionResponses(responseId, answers, stamp)

  // Progression de l'affectation (statut « En cours » si pas déjà soumis).
  await dv.update(SETS.assignment, assignmentId, {
    afb_tauxdecompletion: progression,
    afb_statut: CHOICES.assignmentStatut.EnCours,
  }).catch(() => {})

  return { progression }
}

// Recharge les réponses de la dernière réponse (brouillon ou soumise) d'une
// affectation → { [questionId]: valeur } pour pré-remplir le formulaire.
export async function loadQuestionnaireDraftAnswers(assignmentId) {
  if (!dv.enabled) return {}
  const headers = await dv.list(
    SETS.response,
    `?$filter=_afb_assignation_value eq ${assignmentId}&$top=1&$orderby=createdon desc&$select=afb_questionnaireresponseid`
  ).catch(() => [])
  const h = headers[0]
  if (!h) return {}
  const qrs = await dv.list(
    SETS.questionResponse,
    `?$filter=_afb_reponseauquestionnaire_value eq ${h.afb_questionnaireresponseid}` +
      `&$select=_afb_question_value,afb_valeurchoixunique&$top=300`
  ).catch(() => [])
  const map = {}
  for (const qr of qrs) if (qr._afb_question_value) map[qr._afb_question_value] = qr.afb_valeurchoixunique
  return map
}
