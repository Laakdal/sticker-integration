import { DarkTheme, DefaultTheme, type Theme } from 'expo-router';

import type { AppTheme } from './theme';

/** The React Navigation theme (headers, drawer, scene backgrounds) matching a Paper theme. */
export function navigationThemeFor(theme: AppTheme): Theme {
  const base = theme.dark ? DarkTheme : DefaultTheme;
  const { colors } = theme;
  return {
    ...base,
    dark: theme.dark,
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.onSurface,
      border: colors.outlineVariant,
      notification: colors.error,
    },
  };
}
