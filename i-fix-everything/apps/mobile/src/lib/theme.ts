import { colors, fontSize, lineHeight, minTouchTarget, radius, space, type ColorTokens } from '@ife/design-tokens';
import { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import type { ThemePreference } from '@ife/contracts';

export const ThemePrefContext = createContext<ThemePreference>('system');

export interface Theme {
  c: ColorTokens;
  dark: boolean;
  space: typeof space;
  radius: typeof radius;
  fontSize: typeof fontSize;
  lineHeight: typeof lineHeight;
  minTouchTarget: number;
}

export function useTheme(): Theme {
  const system = useColorScheme();
  const pref = useContext(ThemePrefContext);
  const dark = pref === 'system' ? system === 'dark' : pref === 'dark';
  return { c: colors[dark ? 'dark' : 'light'], dark, space, radius, fontSize, lineHeight, minTouchTarget };
}
