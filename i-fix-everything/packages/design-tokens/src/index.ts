/**
 * I Fix Everything design tokens. One source for web (CSS variables) and
 * native (StyleSheet values). Change brand colors here only.
 *
 * Direction: charcoal and off-white surfaces with a restrained blue accent.
 * Status meaning is never carried by color alone — every status token pairs
 * with a text label and an icon in the UI.
 */

export type ColorScheme = 'light' | 'dark';
export type ThemePreference = ColorScheme | 'system';

export const palette = {
  charcoal950: '#0F1114',
  charcoal900: '#16191D',
  charcoal850: '#1C2025',
  charcoal800: '#23282E',
  charcoal700: '#323941',
  charcoal500: '#5B6570',
  charcoal400: '#7D8792',
  charcoal300: '#A3ABB4',
  offwhite50: '#FAF9F6',
  offwhite100: '#F3F2EE',
  offwhite200: '#E8E6E0',
  offwhite300: '#D7D4CC',
  white: '#FFFFFF',
  blue700: '#1E4FA3',
  blue600: '#2A62C2',
  blue500: '#3B78DB',
  blue400: '#6A9BEA',
  blue300: '#9DBDF2',
  green700: '#1F6B3A',
  green400: '#5FC287',
  amber700: '#8A5A00',
  amber400: '#F0B54A',
  red700: '#A32222',
  red400: '#F07A7A',
} as const;

export interface ColorTokens {
  background: string;
  surface: string;
  surfaceRaised: string;
  surfaceSunken: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textInverse: string;
  accent: string;
  accentHover: string;
  accentText: string;
  accentSubtle: string;
  focusRing: string;
  success: string;
  successSubtle: string;
  warning: string;
  warningSubtle: string;
  danger: string;
  dangerSubtle: string;
  info: string;
  infoSubtle: string;
}

export const colors: Record<ColorScheme, ColorTokens> = {
  light: {
    background: palette.offwhite100,
    surface: palette.offwhite50,
    surfaceRaised: palette.white,
    surfaceSunken: palette.offwhite200,
    border: palette.offwhite300,
    borderStrong: palette.charcoal400,
    text: palette.charcoal900,
    textMuted: '#4E5761',
    textInverse: palette.offwhite50,
    accent: palette.blue600,
    accentHover: palette.blue700,
    accentText: palette.white,
    accentSubtle: '#E3ECFA',
    focusRing: palette.blue500,
    success: palette.green700,
    successSubtle: '#E2F2E8',
    warning: palette.amber700,
    warningSubtle: '#FBF0D9',
    danger: palette.red700,
    dangerSubtle: '#F9E3E3',
    info: palette.blue700,
    infoSubtle: '#E3ECFA',
  },
  dark: {
    background: palette.charcoal950,
    surface: palette.charcoal900,
    surfaceRaised: palette.charcoal850,
    surfaceSunken: '#0B0D0F',
    border: palette.charcoal700,
    borderStrong: palette.charcoal500,
    text: palette.offwhite100,
    textMuted: palette.charcoal300,
    textInverse: palette.charcoal950,
    accent: palette.blue400,
    accentHover: palette.blue300,
    accentText: palette.charcoal950,
    accentSubtle: '#1A2740',
    focusRing: palette.blue400,
    success: palette.green400,
    successSubtle: '#15281D',
    warning: palette.amber400,
    warningSubtle: '#2C2312',
    danger: palette.red400,
    dangerSubtle: '#311717',
    info: palette.blue300,
    infoSubtle: '#1A2740',
  },
};

/** Spacing scale in px / dp. */
export const space = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 } as const;

export const radius = { sm: 6, md: 10, lg: 14, xl: 20, pill: 999 } as const;

/** Type scale (px / dp, before user font scaling). */
export const fontSize = { xs: 12, sm: 14, md: 16, lg: 18, xl: 22, '2xl': 28, '3xl': 36 } as const;
export const lineHeight = { xs: 16, sm: 20, md: 24, lg: 26, xl: 30, '2xl': 36, '3xl': 44 } as const;
export const fontWeight = { regular: '400', medium: '500', semibold: '600', bold: '700' } as const;

/** Minimum hit target for primary controls (exceeds WCAG 2.5.8 and platform guidance). */
export const minTouchTarget = 48;

export const motion = {
  /** Durations in ms. Always skip when the user prefers reduced motion. */
  fast: 120,
  base: 180,
  slow: 260,
} as const;

/** Flatten color tokens into CSS custom properties, e.g. --ife-text-muted. */
export function cssVariables(scheme: ColorScheme): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(colors[scheme])) {
    out[`--ife-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`] = value;
  }
  return out;
}

/** CSS text for both schemes, honoring an explicit data-theme override. */
export function themeCss(): string {
  const block = (scheme: ColorScheme) =>
    Object.entries(cssVariables(scheme))
      .map(([k, v]) => `  ${k}: ${v};`)
      .join('\n');
  return [
    `:root, :root[data-theme="light"] {\n  color-scheme: light;\n${block('light')}\n}`,
    `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {\n  color-scheme: dark;\n${block('dark')}\n  }\n}`,
    `:root[data-theme="dark"] {\n  color-scheme: dark;\n${block('dark')}\n}`,
  ].join('\n\n');
}
