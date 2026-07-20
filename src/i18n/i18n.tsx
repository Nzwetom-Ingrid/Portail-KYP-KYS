// Internationalisation légère (FR par défaut / EN) pour le back-office.
// Approche « clé = texte français » : t('Dossiers') renvoie l'anglais si dispo.
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { EN } from './en';

type Lang = 'fr' | 'en';
interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (s: string) => string;
}

const Ctx = createContext<LangCtx>({ lang: 'fr', setLang: () => {}, t: (s) => s });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      return (localStorage.getItem('afb_lang') as Lang) || 'fr';
    } catch {
      return 'fr';
    }
  });
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem('afb_lang', l);
    } catch {
      /* mode privé */
    }
  }, []);
  const t = useCallback((s: string) => (lang === 'en' ? EN[s] ?? s : s), [lang]);
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useT(): LangCtx {
  return useContext(Ctx);
}
