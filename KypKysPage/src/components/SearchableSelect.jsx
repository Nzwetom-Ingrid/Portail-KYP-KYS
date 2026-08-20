import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from './Icon'
import { useT } from '../i18n/i18n'
import { normalize } from '../utils/search'

/**
 * Liste déroulante avec recherche, pour les champs de formulaire du portail.
 *
 * Les `<select>` natifs deviennent impraticables passé quelques dizaines
 * d'entrées : la liste des pays en compte près de 200, celle des secteurs 110.
 * Le partenaire devait faire défiler à l'aveugle, ou deviner la première lettre.
 *
 * Le composant reste volontairement proche du `<select>` qu'il remplace : mêmes
 * `value` / `onChange`, mêmes classes CSS. Les appelants n'ont presque rien à
 * changer, et un champ non converti continue de fonctionner.
 *
 * @param {{label:string, value:string}[]} options
 * @param {{label:string, options:{label:string,value:string}[]}[]} groups
 *        Alternative à `options` : liste groupée (secteurs par section).
 */
export default function SearchableSelect({
  value,
  onChange,
  options,
  groups,
  placeholder = '— Sélectionner —',
  disabled = false,
  id,
}) {
  const { t } = useT()
  const [ouvert, setOuvert] = useState(false)
  const [q, setQ] = useState('')
  const conteneur = useRef(null)
  const champ = useRef(null)

  // Vue à plat, groupes compris : c'est ce qu'on filtre et ce qu'on affiche.
  const toutes = useMemo(() => {
    if (groups) return groups.flatMap((g) => g.options.map((o) => ({ ...o, groupe: g.label })))
    return (options ?? []).map((o) => ({ ...o, groupe: null }))
  }, [options, groups])

  const filtrees = useMemo(() => {
    const terme = normalize(q).trim()
    if (!terme) return toutes
    // Le groupe est cherchable aussi : taper « banque » remonte tout le secteur
    // financier, même si le libellé exact ne contient pas le mot.
    return toutes.filter((o) => normalize(`${o.label} ${o.groupe ?? ''}`).includes(terme))
  }, [toutes, q])

  const libelle = toutes.find((o) => o.value === value)?.label

  // Fermeture au clic extérieur et à Échap : un menu qui reste ouvert derrière
  // le reste du formulaire est le défaut classique de ce genre de composant.
  useEffect(() => {
    if (!ouvert) return
    const auClic = (e) => {
      if (conteneur.current && !conteneur.current.contains(e.target)) setOuvert(false)
    }
    const auClavier = (e) => {
      if (e.key === 'Escape') setOuvert(false)
    }
    document.addEventListener('mousedown', auClic)
    document.addEventListener('keydown', auClavier)
    return () => {
      document.removeEventListener('mousedown', auClic)
      document.removeEventListener('keydown', auClavier)
    }
  }, [ouvert])

  // À l'ouverture, le curseur est déjà dans le champ : on tape sans viser.
  useEffect(() => {
    if (ouvert) champ.current?.focus()
  }, [ouvert])

  const choisir = (v) => {
    onChange?.({ target: { value: v } }) // même forme d'événement qu'un <select>
    setOuvert(false)
    setQ('')
  }

  return (
    <div className="ss" ref={conteneur}>
      <button
        type="button"
        id={id}
        className={`ss__control ${ouvert ? 'is-open' : ''}`}
        disabled={disabled}
        onClick={() => setOuvert((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={ouvert}
      >
        <span className={libelle ? '' : 'ss__placeholder'}>{libelle || t(placeholder)}</span>
        <Icon name="chevronDown" size={16} />
      </button>

      {ouvert && (
        <div className="ss__menu" role="listbox">
          <div className="ss__search">
            <Icon name="search" size={15} />
            <input
              ref={champ}
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('Rechercher…')}
            />
          </div>

          <div className="ss__list">
            {filtrees.length === 0 && (
              <div className="ss__empty">{t('Aucun résultat pour cette recherche.')}</div>
            )}
            {filtrees.map((o, i) => {
              // En-tête de groupe : affiché au premier élément d'un groupe, et
              // masqué pendant une recherche où le regroupement n'aide plus.
              const nouveauGroupe = !q && o.groupe && o.groupe !== filtrees[i - 1]?.groupe
              return (
                <div key={o.value}>
                  {nouveauGroupe && <div className="ss__group">{o.groupe}</div>}
                  <button
                    type="button"
                    role="option"
                    aria-selected={o.value === value}
                    className={`ss__option ${o.value === value ? 'is-selected' : ''}`}
                    onClick={() => choisir(o.value)}
                  >
                    {o.label}
                    {o.value === value && <Icon name="check" size={15} />}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
