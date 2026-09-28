import { fireEvent, screen } from '@testing-library/react-native';

import GifSettingsScreen from '../../../../app/settings/gif';
import { DEFAULT_SETTINGS } from '@/store/createSettingsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { renderWithProviders } from '@/test-utils/render';

// The real app store: react-native-mmkv runs on its in-memory instance under Jest (jest.setup.ts).
const settings = () => useSettingsStore.getState();

/** Paper's segmented buttons expose the selected segment through `accessibilityState.checked`. */
const expectSelected = (name: string) =>
  expect(screen.getByRole('button', { name }).props.accessibilityState).toMatchObject({ checked: true });

const ENV_KEYS = ['EXPO_PUBLIC_KLIPY_API_KEY', 'EXPO_PUBLIC_GIPHY_API_KEY'] as const;
const savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

beforeEach(() => {
  useSettingsStore.setState(DEFAULT_SETTINGS);
  process.env.EXPO_PUBLIC_KLIPY_API_KEY = 'from-env';
  delete process.env.EXPO_PUBLIC_GIPHY_API_KEY;
});

afterAll(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

describe('GIF search & API settings', () => {
  it('reads and writes the GIF provider', async () => {
    useSettingsStore.setState({ gifProvider: 'giphy' });
    await renderWithProviders(<GifSettingsScreen />);
    expectSelected('Giphy');

    await fireEvent.press(screen.getByRole('button', { name: 'Klipy' }));
    expect(settings().gifProvider).toBe('klipy');
    expectSelected('Klipy');
  });

  it('reads and writes the API keys, trimmed, with the .env status of each provider', async () => {
    useSettingsStore.setState({ giphyApiKey: 'saved-giphy' });
    await renderWithProviders(<GifSettingsScreen />);
    expect(screen.getByText('Empty: uses the key from .env (.env key found)')).toBeTruthy();
    expect(screen.getByLabelText('Giphy API key').props.value).toBe('saved-giphy');

    const klipy = screen.getByLabelText('Klipy API key');
    await fireEvent.changeText(klipy, ' my-klipy ');
    await fireEvent(klipy, 'blur');
    expect(settings().klipyApiKey).toBe('my-klipy');

    const giphy = screen.getByLabelText('Giphy API key');
    await fireEvent.changeText(giphy, '   ');
    await fireEvent(giphy, 'blur');
    expect(settings().giphyApiKey).toBe('');
    expect(screen.getByText('Empty: uses the key from .env (no .env key)')).toBeTruthy();
  });

  it('reads and writes the content rating', async () => {
    useSettingsStore.setState({ contentRating: 'pg' });
    await renderWithProviders(<GifSettingsScreen />);
    expectSelected('PG');

    await fireEvent.press(screen.getByRole('button', { name: 'R' }));
    expect(settings().contentRating).toBe('r');
    await fireEvent.press(screen.getByRole('button', { name: 'PG-13' }));
    expect(settings().contentRating).toBe('pg-13');
    await fireEvent.press(screen.getByRole('button', { name: 'G' }));
    expect(settings().contentRating).toBe('g');
  });
});
