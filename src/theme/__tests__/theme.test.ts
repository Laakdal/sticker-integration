import { createMaterial3Theme } from '@pchmn/expo-material3-theme';
import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

import { FALLBACK_SOURCE_COLOR, navigationThemeFor, resolveAppTheme } from '@/theme';

const fallback = createMaterial3Theme(FALLBACK_SOURCE_COLOR);
// Stands in for the wallpaper-derived scheme the native module reads on Android 12+.
const wallpaper = createMaterial3Theme('#6750A4');

describe('resolveAppTheme', () => {
  it('uses the wallpaper scheme when the setting is on and the device provides one', () => {
    const light = resolveAppTheme({ themeMode: 'system', systemScheme: 'light', useDynamicColor: true, systemTheme: wallpaper });
    expect(light.dark).toBe(false);
    expect(light.colors.primary).toBe(wallpaper.light.primary);
    expect(light.colors.secondaryContainer).toBe(wallpaper.light.secondaryContainer);

    const dark = resolveAppTheme({ themeMode: 'system', systemScheme: 'dark', useDynamicColor: true, systemTheme: wallpaper });
    expect(dark.dark).toBe(true);
    expect(dark.colors.primary).toBe(wallpaper.dark.primary);
    expect(dark.colors.surface).toBe(wallpaper.dark.surface);
  });

  it('uses the scheme generated from the brand colour when the setting is off', () => {
    const theme = resolveAppTheme({ themeMode: 'system', systemScheme: 'light', useDynamicColor: false, systemTheme: wallpaper });
    expect(theme.colors.primary).toBe(fallback.light.primary);
    expect(theme.colors.primary).not.toBe(wallpaper.light.primary);
  });

  it('falls back to the brand scheme when the device has no wallpaper colours', () => {
    const light = resolveAppTheme({ themeMode: 'system', systemScheme: 'light', useDynamicColor: true, systemTheme: null });
    expect(light.colors.primary).toBe(fallback.light.primary);
    const dark = resolveAppTheme({ themeMode: 'system', systemScheme: 'dark', useDynamicColor: true, systemTheme: null });
    expect(dark.dark).toBe(true);
    expect(dark.colors.primary).toBe(fallback.dark.primary);
  });

  it.each([
    ['light', MD3LightTheme],
    ['dark', MD3DarkTheme],
  ] as const)('keeps every Paper MD3 token valid in %s mode', (systemScheme, base) => {
    for (const systemTheme of [wallpaper, null]) {
      const theme = resolveAppTheme({ themeMode: 'system', systemScheme, useDynamicColor: true, systemTheme });
      expect(theme.isV3).toBe(true);
      expect(theme.fonts).toBe(base.fonts);
      expect(theme.roundness).toBe(base.roundness);
      for (const key of Object.keys(base.colors)) {
        expect(theme.colors).toHaveProperty(key);
      }
      for (const level of ['level0', 'level1', 'level2', 'level3', 'level4', 'level5'] as const) {
        expect(typeof theme.colors.elevation[level]).toBe('string');
      }
      for (const key of [
        'surfaceContainerLowest',
        'surfaceContainerLow',
        'surfaceContainer',
        'surfaceContainerHigh',
        'surfaceContainerHighest',
      ] as const) {
        expect(theme.colors[key]).toMatch(/^#[0-9A-F]{6}$/i);
      }
    }
  });
});

describe('resolveAppTheme themeMode', () => {
  it.each(['light', 'dark'] as const)('forces the %s scheme whatever the system scheme is', (mode) => {
    for (const systemScheme of ['light', 'dark'] as const) {
      const plain = resolveAppTheme({ themeMode: mode, systemScheme, useDynamicColor: false, systemTheme: null });
      expect(plain.dark).toBe(mode === 'dark');
      expect(plain.colors.primary).toBe(fallback[mode].primary);
      const dynamic = resolveAppTheme({ themeMode: mode, systemScheme, useDynamicColor: true, systemTheme: wallpaper });
      expect(dynamic.dark).toBe(mode === 'dark');
      expect(dynamic.colors.primary).toBe(wallpaper[mode].primary);
    }
  });

  it('follows the system scheme for system', () => {
    const light = resolveAppTheme({ themeMode: 'system', systemScheme: 'light', useDynamicColor: false, systemTheme: null });
    const dark = resolveAppTheme({ themeMode: 'system', systemScheme: 'dark', useDynamicColor: false, systemTheme: null });
    expect(light.dark).toBe(false);
    expect(dark.dark).toBe(true);
  });
});

describe('navigationThemeFor', () => {
  it('maps the Paper scheme onto the navigation theme', () => {
    const theme = resolveAppTheme({ themeMode: 'system', systemScheme: 'dark', useDynamicColor: true, systemTheme: wallpaper });
    const nav = navigationThemeFor(theme);
    expect(nav.dark).toBe(true);
    expect(nav.colors).toEqual({
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.onSurface,
      border: theme.colors.outlineVariant,
      notification: theme.colors.error,
    });
    expect(nav.fonts).toBeDefined();
  });
});
