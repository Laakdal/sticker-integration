import { createMaterial3Theme, type Material3Scheme, type Material3Theme } from '@pchmn/expo-material3-theme';
import type { ThemeMode } from '@/store/createSettingsStore';
import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';

/** The app's own colour: the source of the scheme used when wallpaper colours are off or unavailable. */
export const FALLBACK_SOURCE_COLOR = '#1B7F5A';

export type ColorSchemeName = 'light' | 'dark';

/** Paper's MD3 colours plus the newer M3 tokens (surfaceContainer*, surfaceBright/Dim, …). */
export type AppColors = MD3Theme['colors'] & Material3Scheme;
export type AppTheme = Omit<MD3Theme, 'colors'> & { colors: AppColors };

/** Lays a full M3 scheme over Paper's MD3 base theme, so every Paper token stays defined. */
export function toPaperTheme(scheme: Material3Scheme, colorScheme: ColorSchemeName): AppTheme {
  const base = colorScheme === 'dark' ? MD3DarkTheme : MD3LightTheme;
  return { ...base, colors: { ...base.colors, ...scheme } };
}

const fallback = createMaterial3Theme(FALLBACK_SOURCE_COLOR);
export const lightTheme: AppTheme = toPaperTheme(fallback.light, 'light');
export const darkTheme: AppTheme = toPaperTheme(fallback.dark, 'dark');

export interface ThemeInputs {
  /** Settings → Display → Theme. */
  themeMode: ThemeMode;
  /** The device's current light/dark setting, used when themeMode is 'system'. */
  systemScheme: ColorSchemeName;
  /** Settings → Display → Use wallpaper colours. */
  useDynamicColor: boolean;
  /** The wallpaper-derived schemes, or null where the device has none (before Android 12). */
  systemTheme: Material3Theme | null;
}

/** The Paper theme for the chosen (or, for 'system', the device's) colour scheme, from the wallpaper when allowed and available. */
export function resolveAppTheme({ themeMode, systemScheme, useDynamicColor, systemTheme }: ThemeInputs): AppTheme {
  const colorScheme = themeMode === 'system' ? systemScheme : themeMode;
  if (useDynamicColor && systemTheme) return toPaperTheme(systemTheme[colorScheme], colorScheme);
  return colorScheme === 'dark' ? darkTheme : lightTheme;
}
