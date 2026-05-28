import { webLightTheme, webDarkTheme, type Theme } from '@fluentui/react-components';
import { colors } from './tokens';

// Pile typographique Plus Jakarta Sans — pro, raffinée, soft & moderne.
const afbFontFamily =
  '"Plus Jakarta Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const afbFontMono = '"JetBrains Mono", "SF Mono", Menlo, Consolas, monospace';

// Mode sombre (par défaut) — accent rouge #dc2626 sur canvas noir
export const afbThemeDark: Theme = {
  ...webDarkTheme,
  fontFamilyBase:        afbFontFamily,
  fontFamilyMonospace:   afbFontMono,
  fontFamilyNumeric:     afbFontFamily,
  colorBrandBackground:           colors.afbRed[600],
  colorBrandBackgroundHover:      colors.afbRed[700],
  colorBrandBackgroundPressed:    colors.afbRed[800],
  colorBrandBackgroundSelected:   colors.afbRed[700],
  colorBrandForeground1:          colors.afbRed[500],
  colorBrandForeground2:          colors.afbRed[400],
  colorBrandForegroundLink:       colors.afbRed[500],
  colorBrandForegroundLinkHover:  colors.afbRed[400],
  colorBrandStroke1:              colors.afbRed[600],
  colorBrandStroke2:              colors.afbRed[800],
  colorNeutralBackground1:        '#111111',
  colorNeutralBackground2:        '#0d0d0d',
  colorNeutralBackground3:        '#0a0a0a',
  colorNeutralForeground1:        '#ffffff',
  colorNeutralForeground2:        '#999999',
  colorNeutralForeground3:        '#666666',
};

// Mode clair Soft Premium — accent rouge Afriland #E30613, contrôles arrondis
export const afbThemeLight: Theme = {
  ...webLightTheme,
  fontFamilyBase:        afbFontFamily,
  fontFamilyMonospace:   afbFontMono,
  fontFamilyNumeric:     afbFontFamily,
  // Rayons généreux pour des composants soft (boutons, champs, dropdowns)
  borderRadiusSmall:     '8px',
  borderRadiusMedium:    '11px',
  borderRadiusLarge:     '14px',
  borderRadiusXLarge:    '18px',
  colorBrandBackground:           '#E30613',
  colorBrandBackgroundHover:      '#C20012',
  colorBrandBackgroundPressed:    '#A50410',
  colorBrandBackgroundSelected:   '#C20012',
  colorBrandForeground1:          '#E30613',
  colorBrandForeground2:          '#C20012',
  colorBrandForegroundLink:       '#E30613',
  colorBrandForegroundLinkHover:  '#C20012',
  colorBrandStroke1:              '#E30613',
  colorBrandStroke2:              '#FDA3AA',
  colorNeutralForeground1:        '#1A1A1A',
  colorNeutralForeground2:        '#525252',
  colorNeutralForeground3:        '#8A8A8A',
  colorNeutralBackground1:        '#ffffff',
  colorNeutralBackground2:        '#F7F6F3',
  colorNeutralBackground3:        '#EFEDE7',
};

/** @deprecated Utiliser afbThemeDark / afbThemeLight. */
export const afbTheme = afbThemeDark;
