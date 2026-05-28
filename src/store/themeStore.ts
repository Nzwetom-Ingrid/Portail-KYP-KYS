import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'afb-theme';

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  // Soft Premium clair par défaut ; bascule en sombre seulement sur préférence explicite.
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  // Thème piloté par l'attribut [data-theme] sur :root.
  document.documentElement.setAttribute('data-theme', mode);
}

interface ThemeStore {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: getInitialTheme(),
  setTheme: (mode) => {
    applyTheme(mode);
    localStorage.setItem(STORAGE_KEY, mode);
    set({ theme: mode });
  },
  toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
}));

// Applique le thème dès le chargement du module (avant le premier rendu).
applyTheme(useThemeStore.getState().theme);
