// Internationalisation légère (FR par défaut / EN).
// Approche « clé = texte français » : t('Mes documents') renvoie la traduction
// anglaise si la langue est EN (via le dico), sinon le français tel quel.
import { createContext, useCallback, useContext, useState } from 'react'
import { EN } from './en'

const LangContext = createContext({ lang: 'fr', setLang: () => {}, t: (s) => s })

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      return localStorage.getItem('afb_lang') || 'fr'
    } catch {
      return 'fr'
    }
  })
  const setLang = useCallback((l) => {
    setLangState(l)
    try {
      localStorage.setItem('afb_lang', l)
    } catch {
      /* mode privé : ignore */
    }
  }, [])
  // t(fr) : renvoie l'anglais si dispo, sinon le texte français d'origine.
  const t = useCallback((s) => (lang === 'en' ? EN[s] ?? s : s), [lang])
  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>
}

export function useT() {
  return useContext(LangContext)
}
