import { router, useLocalSearchParams } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

import * as DrawerLayout from '../../app/(drawer)/_layout';
import * as SettingsScreen from '../../app/(drawer)/settings';
import * as RootLayout from '../../app/_layout';

// The root layout's bootstrap (bundled packs, file storage, native modules) is covered elsewhere;
// here it is always ready so the test exercises only the navigators.
jest.mock('@/features/packs', () => ({
  useBootstrap: () => ({ ready: true, installError: null, loadError: null, retry: jest.fn() }),
  InstallErrorBanner: () => null,
}));

function HomeStub() {
  return <Text>Home screen</Text>;
}

function PackStub() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Text>{`Pack ${id}`}</Text>;
}

const routes = {
  _layout: RootLayout,
  '(drawer)/_layout': DrawerLayout,
  '(drawer)/index': HomeStub,
  '(drawer)/settings': SettingsScreen,
  'pack/[id]': PackStub,
};

const MENU = 'Open navigation menu';

/**
 * renderRouter() hands back the (now async) RNTL render with the route helpers attached to the
 * promise itself, so keep a reference to it for the pathname and await it for the render.
 */
async function renderApp(initialUrl: string) {
  const rendered = renderRouter(routes, { initialUrl });
  await rendered;
  return { pathname: () => rendered.getPathname() };
}

afterEach(() => jest.useRealTimers());

describe('navigation', () => {
  it('opens the packs list at / with a menu button in the header', async () => {
    const app = await renderApp('/');
    expect(app.pathname()).toBe('/');
    expect(screen.getByText('Home screen')).toBeTruthy();
    expect(screen.getByText('Sticker Maker')).toBeTruthy();
    expect(screen.getByLabelText(MENU)).toBeTruthy();
  });

  it('lists Sticker packs and Settings in the drawer and navigates to Settings', async () => {
    const app = await renderApp('/');
    await fireEvent.press(screen.getByLabelText(MENU));
    expect(screen.getByText('Sticker packs')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: /Settings/ }));
    await act(async () => jest.runOnlyPendingTimers());
    expect(app.pathname()).toBe('/settings');
    expect(screen.getByText('GIF search')).toBeTruthy();
  });

  it('opens /settings directly', async () => {
    const app = await renderApp('/settings');
    expect(app.pathname()).toBe('/settings');
    expect(screen.getByText('GIF search')).toBeTruthy();
  });

  it('keeps /pack/[id] above the drawer, without the menu button, with the packs list behind it', async () => {
    const app = await renderApp('/pack/abc');
    expect(app.pathname()).toBe('/pack/abc');
    expect(screen.getByText('Pack abc')).toBeTruthy();
    expect(screen.queryByLabelText(MENU)).toBeNull();
    expect(router.canGoBack()).toBe(true);
  });
});
