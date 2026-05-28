/**
 * Design tokens — Portail KYP/KYS Afriland First Bank
 * Design system "Glassmorphism" dark-first, accent rouge confiant.
 */

export const colors = {
  // Accent rouge
  afbRed: {
    900: '#7f1d1d',
    800: '#991b1b',
    700: '#b91c1c',  // accent-dark
    600: '#dc2626',  // accent
    500: '#ef4444',  // accent-light
    400: '#f87171',
    300: '#fca5a5',
    200: '#fecaca',
    100: '#fee2e2',
    50:  '#fef2f2',
    25:  '#fff7f7',
  },
  // Neutres — canvas sombre
  neutral: {
    black:   '#000000',
    950:     '#0a0a0a',
    900:     '#111111',
    800:     '#1a1a1a',
    700:     '#262626',
    600:     '#404040',
    500:     '#666666',
    400:     '#999999',
    300:     '#cccccc',
    200:     '#e5e5e5',
    150:     '#eeeeee',
    100:     '#f5f5f5',
    50:      '#fafafa',
    25:      '#ffffff',
  },
  // Fonds
  bg: {
    app:      '#0a0a0a',
    appAlt:   '#111111',
    card:     'rgba(255, 255, 255, 0.06)',
    cardAlt:  'rgba(255, 255, 255, 0.04)',
    hover:    'rgba(255, 255, 255, 0.10)',
    overlay:  'rgba(0, 0, 0, 0.70)',
  },
  // Statuts sémantiques
  semantic: {
    success:    '#22c55e',
    successBg:  'rgba(34, 197, 94, 0.15)',
    successFg:  '#22c55e',
    warning:    '#f59e0b',
    warningBg:  'rgba(245, 158, 11, 0.15)',
    warningFg:  '#f59e0b',
    danger:     '#ef4444',
    dangerBg:   'rgba(239, 68, 68, 0.15)',
    dangerFg:   '#ef4444',
    info:       '#3b82f6',
    infoBg:     'rgba(59, 130, 246, 0.15)',
    infoFg:     '#3b82f6',
    neutralBg:  'rgba(255, 255, 255, 0.08)',
    neutralFg:  '#999999',
  },
  // Glassmorphism + effets
  effects: {
    glassBg:        'rgba(255, 255, 255, 0.06)',
    glassBorder:    'rgba(255, 255, 255, 0.10)',
    glassHoverBg:   'rgba(255, 255, 255, 0.10)',
    glassHoverBorder: 'rgba(255, 255, 255, 0.20)',
    glassRedBg:     'rgba(220, 38, 38, 0.08)',
    glassRedBorder: 'rgba(220, 38, 38, 0.20)',
    glassBlur:      'blur(16px)',
    focusRing:      'rgba(220, 38, 38, 0.30)',
    glow:           'rgba(220, 38, 38, 0.30)',
    border:         'rgba(255, 255, 255, 0.10)',
    borderSubtle:   'rgba(255, 255, 255, 0.06)',
    borderStrong:   'rgba(255, 255, 255, 0.20)',
  },
} as const;

export const typography = {
  fontFamily: '"Plus Jakarta Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontFamilyMono: '"JetBrains Mono", "SF Mono", Menlo, Consolas, monospace',
  // Tailles
  display:    '28px',
  h1:         '24px',
  h2:         '16px',
  h3:         '14px',
  body:       '14px',
  small:      '13px',
  caption:    '12px',
  micro:      '11px',
  // Graisses 300–800
  weights: {
    light:    300,
    regular:  400,
    medium:   500,
    semibold: 600,
    bold:     700,
    extrabold: 800,
  },
  leading: {
    tight:   1.2,
    snug:    1.35,
    normal:  1.5,
    relaxed: 1.65,
  },
  tracking: {
    tight:   '-0.01em',
    normal:  '0',
    wide:    '0.02em',
    label:   '0.5px',
    wider:   '0.04em',
    widest:  '0.08em',
  },
} as const;

export const spacing = {
  xs:    '4px',
  sm:    '8px',
  md:    '12px',
  lg:    '16px',
  xl:    '24px',
  '2xl': '32px',
  '3xl': '48px',
  '4xl': '64px',
} as const;

export const radius = {
  xs:   '6px',
  sm:   '8px',
  md:   '12px',
  lg:   '16px',
  xl:   '20px',
  '2xl': '20px',
  '3xl': '24px',
  full: '9999px',
} as const;

export const shadow = {
  xs:     '0 2px 8px rgba(0, 0, 0, 0.20)',
  sm:     '0 4px 16px rgba(0, 0, 0, 0.25)',
  md:     '0 8px 32px rgba(0, 0, 0, 0.30)',  // glass
  lg:     '0 12px 40px rgba(0, 0, 0, 0.35)',
  xl:     '0 20px 56px rgba(0, 0, 0, 0.40)',
  '2xl':  '0 28px 64px rgba(0, 0, 0, 0.50)',
  modal:  '0 24px 64px rgba(0, 0, 0, 0.55)',
  // Lueur rouge pour focus / hover des actions
  focus:  '0 0 0 3px rgba(220, 38, 38, 0.30)',
  glow:   '0 0 20px rgba(220, 38, 38, 0.30)',
  inset:  'inset 0 1px 0 rgba(255, 255, 255, 0.06)',
} as const;

export const motion = {
  ease: {
    out:    'cubic-bezier(0.16, 1, 0.3, 1)',
    inOut:  'cubic-bezier(0.65, 0, 0.35, 1)',
    snap:   'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  duration: {
    instant: '80ms',
    fast:    '150ms',
    base:    '250ms',
    slow:    '320ms',
    slower:  '480ms',
  },
} as const;
