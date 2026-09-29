import * as material3 from '@pchmn/expo-material3-theme';
import { fireEvent, screen } from '@testing-library/react-native';

import DisplaySettingsScreen from '../../../../app/settings/display';
import { DEFAULT_SETTINGS } from '@/store/createSettingsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { renderWithProviders } from '@/test-utils/render';

const settings = () => useSettingsStore.getState();

/** Paper's segmented buttons expose the selected segment through `accessibilityState.checked`. */
const expectSelected = (name: string) =>
  expect(screen.getByRole('button', { name }).props.accessibilityState).toMatchObject({ checked: true });

let supported: jest.ReplaceProperty<boolean> | undefined;
beforeEach(() => useSettingsStore.setState(DEFAULT_SETTINGS));
afterEach(() => supported?.restore());

describe('Display settings', () => {
  it('reads and writes "Use wallpaper colours" on Android 12 or newer', async () => {
    supported = jest.replaceProperty(material3, 'isDynamicThemeSupported', true);
    await renderWithProviders(<DisplaySettingsScreen />);
    expect(screen.getByText('Android 12 or newer')).toBeTruthy();
    const toggle = screen.getByRole('switch', { name: 'Use wallpaper colours' });
    expect(toggle).toBeChecked();
    expect(toggle).toBeEnabled();

    await fireEvent(toggle, 'valueChange', false);
    expect(settings().useDynamicColor).toBe(false);
    expect(screen.getByRole('switch', { name: 'Use wallpaper colours' })).not.toBeChecked();

    await fireEvent.press(screen.getByText('Use wallpaper colours'));
    expect(settings().useDynamicColor).toBe(true);
  });

  it('disables "Use wallpaper colours" with an explanation on older Android', async () => {
    await renderWithProviders(<DisplaySettingsScreen />);
    expect(screen.getByText('Needs Android 12 or newer')).toBeTruthy();
    expect(screen.getByRole('switch', { name: 'Use wallpaper colours' })).toBeDisabled();

    await fireEvent.press(screen.getByText('Use wallpaper colours'));
    expect(settings().useDynamicColor).toBe(true);
  });

  it('reads and writes the theme', async () => {
    await renderWithProviders(<DisplaySettingsScreen />);
    expect(screen.getByText('Theme')).toBeTruthy();
    expectSelected('Auto');

    await fireEvent.press(screen.getByRole('button', { name: 'Dark' }));
    expect(settings().themeMode).toBe('dark');
    expectSelected('Dark');

    await fireEvent.press(screen.getByRole('button', { name: 'Light' }));
    expect(settings().themeMode).toBe('light');
    await fireEvent.press(screen.getByRole('button', { name: 'Auto' }));
    expect(settings().themeMode).toBe('system');
  });

  it('reads and writes reduce motion', async () => {
    await renderWithProviders(<DisplaySettingsScreen />);
    const toggle = screen.getByRole('switch', { name: 'Reduce motion' });
    expect(toggle).not.toBeChecked();

    await fireEvent(toggle, 'valueChange', true);
    expect(settings().reduceMotion).toBe(true);
    expect(screen.getByRole('switch', { name: 'Reduce motion' })).toBeChecked();

    await fireEvent.press(screen.getByText('Reduce motion'));
    expect(settings().reduceMotion).toBe(false);
  });
});
