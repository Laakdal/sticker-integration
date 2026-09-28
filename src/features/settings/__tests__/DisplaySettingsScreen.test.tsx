import * as material3 from '@pchmn/expo-material3-theme';
import { fireEvent, screen } from '@testing-library/react-native';

import DisplaySettingsScreen from '../../../../app/settings/display';
import { DEFAULT_SETTINGS } from '@/store/createSettingsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { renderWithProviders } from '@/test-utils/render';

const settings = () => useSettingsStore.getState();

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
