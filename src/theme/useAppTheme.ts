import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { useSettingsStore } from '@/store/settingsStore';
import { isDynamicColorSupported, readSystemTheme } from './dynamicColor';
import { navigationThemeFor } from './navigationTheme';
import { type ColorSchemeName, resolveAppTheme } from './theme';

/**
 * The app theme: light/dark follows Settings → Display → Theme (Auto = the system), colours come from the wallpaper (Android 12+,
 * Settings → Display) or from the app's own green. Returns the Paper theme and the matching
 * navigation theme so headers, the drawer and Paper components share one scheme.
 */
export function useAppTheme() {
  const systemScheme: ColorSchemeName = useColorScheme() === 'dark' ? 'dark' : 'light';
  const themeMode = useSettingsStore((s) => s.themeMode);
  const colorScheme: ColorSchemeName = themeMode === 'system' ? systemScheme : themeMode;
  const useDynamicColor = useSettingsStore((s) => s.useDynamicColor);
  const dynamicColorSupported = isDynamicColorSupported();

  // Read the wallpaper palette again when the colour scheme flips, which is also when Android
  // hands the app a fresh configuration.
  const systemTheme = useMemo(
    () => (useDynamicColor && dynamicColorSupported ? readSystemTheme() : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- colorScheme is the refresh trigger
    [useDynamicColor, dynamicColorSupported, colorScheme],
  );

  return useMemo(() => {
    const theme = resolveAppTheme({ themeMode, systemScheme, useDynamicColor, systemTheme });
    return { theme, navigationTheme: navigationThemeFor(theme), colorScheme, dynamicColorSupported };
  }, [colorScheme, themeMode, systemScheme, useDynamicColor, systemTheme, dynamicColorSupported]);
}
