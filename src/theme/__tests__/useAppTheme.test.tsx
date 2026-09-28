import * as material3 from '@pchmn/expo-material3-theme';
import { act, renderHook } from '@testing-library/react-native';

import { DEFAULT_SETTINGS } from '@/store/createSettingsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { FALLBACK_SOURCE_COLOR, useAppTheme } from '@/theme';

// jest.setup.ts mocks the native module: no wallpaper colours unless a test says otherwise.
const wallpaper = material3.createMaterial3Theme('#6750A4');
const fallback = material3.createMaterial3Theme(FALLBACK_SOURCE_COLOR);
const getMaterial3Theme = jest.mocked(material3.getMaterial3Theme);

let supported: jest.ReplaceProperty<boolean> | undefined;
function supportDynamicColor(theme: material3.Material3Theme) {
  supported = jest.replaceProperty(material3, 'isDynamicThemeSupported', true);
  getMaterial3Theme.mockReturnValue(theme);
}

beforeEach(() => {
  useSettingsStore.setState(DEFAULT_SETTINGS);
  getMaterial3Theme.mockReset();
});
afterEach(() => supported?.restore());

describe('useAppTheme', () => {
  it('uses the wallpaper colours on a device that supports them', async () => {
    supportDynamicColor(wallpaper);

    const { result } = await renderHook(() => useAppTheme());
    expect(getMaterial3Theme).toHaveBeenCalledWith(FALLBACK_SOURCE_COLOR);
    expect(result.current.theme.colors.primary).toBe(wallpaper.light.primary);
    expect(result.current.navigationTheme.colors.primary).toBe(wallpaper.light.primary);
    expect(result.current.dynamicColorSupported).toBe(true);
  });

  it('switches to the brand colours when the setting is turned off', async () => {
    supportDynamicColor(wallpaper);

    const { result } = await renderHook(() => useAppTheme());
    await act(async () => useSettingsStore.getState().setSetting('useDynamicColor', false));
    expect(result.current.theme.colors.primary).toBe(fallback.light.primary);
  });

  it('uses the brand colours without asking the native module on older Android', async () => {
    const { result } = await renderHook(() => useAppTheme());
    expect(getMaterial3Theme).not.toHaveBeenCalled();
    expect(result.current.theme.colors.primary).toBe(fallback.light.primary);
    expect(result.current.dynamicColorSupported).toBe(false);
  });
});
