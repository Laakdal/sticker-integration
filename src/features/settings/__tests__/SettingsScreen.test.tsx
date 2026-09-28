import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

import * as DrawerLayout from '../../../../app/(drawer)/_layout';
import * as SettingsScreen from '../../../../app/(drawer)/settings';
import * as RootLayout from '../../../../app/_layout';
import * as DisplaySettingsScreen from '../../../../app/settings/display';
import * as GifSettingsScreen from '../../../../app/settings/gif';
import { DEFAULT_SETTINGS } from '@/store/createSettingsStore';
import { useSettingsStore } from '@/store/settingsStore';

jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { name: 'Sticker Maker', version: '1.0.0' } } }));

// The root layout's bootstrap (file storage, native modules) is covered elsewhere.
jest.mock('@/features/packs', () => ({
  useBootstrap: () => ({ ready: true, loadError: null, retry: jest.fn() }),
}));

const routes = {
  _layout: RootLayout,
  '(drawer)/_layout': DrawerLayout,
  '(drawer)/index': () => <Text>Home screen</Text>,
  '(drawer)/settings': SettingsScreen,
  'settings/gif': GifSettingsScreen,
  'settings/display': DisplaySettingsScreen,
};

const ENV_KEYS = ['EXPO_PUBLIC_KLIPY_API_KEY', 'EXPO_PUBLIC_GIPHY_API_KEY'] as const;
const savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

beforeEach(() => {
  useSettingsStore.setState(DEFAULT_SETTINGS);
  delete process.env.EXPO_PUBLIC_KLIPY_API_KEY;
  delete process.env.EXPO_PUBLIC_GIPHY_API_KEY;
});

afterAll(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

/** renderRouter() attaches the route helpers to the promise it returns, so keep a reference to it. */
async function renderSettings() {
  const rendered = renderRouter(routes, { initialUrl: '/settings' });
  await rendered;
  return { pathname: () => rendered.getPathname() };
}

describe('Settings screen', () => {
  it('lists the categories with a summary of their current values', async () => {
    useSettingsStore.setState({ contentRating: 'g', giphyApiKey: 'saved', reduceMotion: true, lastPublisher: 'Jane' });
    await renderSettings();
    expect(screen.getByText('GIF search & API')).toBeTruthy();
    expect(screen.getByText('Klipy: no key · Giphy: key set · G')).toBeTruthy();
    expect(screen.getByText('Display')).toBeTruthy();
    // jest.setup.ts reports a device without wallpaper colours.
    expect(screen.getByText('Wallpaper colours unavailable · Reduce motion on')).toBeTruthy();
  });

  it('does not list or offer a "New packs" category', async () => {
    await renderSettings();
    expect(screen.queryByText('New packs')).toBeNull();
  });

  it('counts a key from .env in the GIF summary', async () => {
    process.env.EXPO_PUBLIC_KLIPY_API_KEY = 'from-env';
    await renderSettings();
    expect(screen.getByText('Klipy: key set · Giphy: no key · PG-13')).toBeTruthy();
  });

  it.each([
    ['GIF search & API', '/settings/gif', 'Klipy API key'],
    ['Display', '/settings/display', 'Reduce motion'],
  ])('opens %s above the drawer with a back arrow', async (title, pathname, field) => {
    const app = await renderSettings();
    await fireEvent.press(screen.getByText(title));
    await act(async () => jest.runOnlyPendingTimers());

    expect(app.pathname()).toBe(pathname);
    expect(screen.getByLabelText(field)).toBeTruthy();
    expect(screen.queryByLabelText('Open navigation menu')).toBeNull();
    expect(router.canGoBack()).toBe(true);

    await act(async () => router.back());
    expect(app.pathname()).toBe('/settings');
  });

  it('shows the app name and version in a row that does not navigate', async () => {
    const app = await renderSettings();
    expect(screen.getByText('Version 1.0.0')).toBeTruthy();
    await fireEvent.press(screen.getByText('Version 1.0.0'));
    await act(async () => jest.runOnlyPendingTimers());
    expect(app.pathname()).toBe('/settings');
  });
});
