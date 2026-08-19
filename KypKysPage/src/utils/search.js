// Recherche texte partagée par tous les écrans du portail.
//
// Avant, chaque page portait sa propre expression de filtrage, sur deux ou trois
// champs seulement et sensible aux accents : chercher « telephone » ne trouvait
// pas « téléphone », et « Douala » ne trouvait rien sur la page Documents alors
// que la ville était affichée. Une seule fonction ici, cinq appels côté pages.
//
// Le filtrage reste EN MÉMOIRE, sur les lignes déjà chargées depuis Dataverse.
// C'est volontaire : les volumes par tiers sont petits (quelques dizaines de
// lignes) et cela évite un aller-retour réseau à chaque frappe.

// Minuscules + suppression des accents, pour que « Société » et « societe »
// se rencontrent. NFD sépare la lettre de son accent ; U+0300–U+036F est la
// plage des diacritiques combinants qu'on retire ensuite.
export function normalize(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/**
 * Vrai si TOUS les termes de la requête se retrouvent dans les champs fournis,
 * dans n'importe quel ordre. « rccm douala » trouve donc une ligne qui contient
 * les deux mots, même éloignés — plus utile qu'une recherche de chaîne exacte.
 * Une requête vide laisse tout passer.
 */
export function matches(query, fields) {
  const q = normalize(query).trim()
  if (!q) return true
  const haystack = normalize(
    (Array.isArray(fields) ? fields : [fields])
      .filter((v) => v !== null && v !== undefined && v !== '')
      .join(' '),
  )
  return q.split(/\s+/).every((term) => haystack.includes(term))
}

/**
 * Filtre une liste. `pick` reçoit un élément et renvoie le tableau de ses
 * champs recherchables — c'est le seul endroit à modifier pour élargir la
 * recherche d'un écran.
 */
export function filterBySearch(items, query, pick) {
  if (!normalize(query).trim()) return items
  return items.filter((item) => matches(query, pick(item)))
}
