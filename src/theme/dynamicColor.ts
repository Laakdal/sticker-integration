import { getMaterial3Theme, isDynamicThemeSupported, type Material3Theme } from '@pchmn/expo-material3-theme';

import { FALLBACK_SOURCE_COLOR } from './theme';

/** Whether the device provides wallpaper colours (Android 12 or newer). */
export function isDynamicColorSupported(): boolean {
  return isDynamicThemeSupported;
}

/** The wallpaper-derived light and dark schemes, or null where the device has none. */
export function readSystemTheme(): Material3Theme | null {
  return isDynamicThemeSupported ? getMaterial3Theme(FALLBACK_SOURCE_COLOR) : null;
}
