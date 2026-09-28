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

beforeEach(() => useSettingsStore.setState(DEFAULT_SETTINGS));

describe('GIF search & API settings', () => {
  it('shows Klipy and Giphy as separate sections, each with its own key field, and no .env helper text', async () => {
    useSettingsStore.setState({ giphyApiKey: 'saved-giphy' });
    await renderWithProviders(<GifSettingsScreen />);

    expect(screen.getByText('Klipy')).toBeTruthy();
    expect(screen.getByText('Giphy')).toBeTruthy();
    expect(screen.getByText('Content rating')).toBeTruthy();
    expect(screen.getByLabelText('Klipy API key')).toBeTruthy();
    expect(screen.getByLabelText('Giphy API key').props.value).toBe('saved-giphy');
    expect(screen.queryByText(/Empty: uses the key from \.env/)).toBeNull();
  });

  it('reads and writes the API keys, trimmed', async () => {
    useSettingsStore.setState({ giphyApiKey: 'saved-giphy' });
    await renderWithProviders(<GifSettingsScreen />);

    const klipy = screen.getByLabelText('Klipy API key');
    await fireEvent.changeText(klipy, ' my-klipy ');
    await fireEvent(klipy, 'blur');
    expect(settings().klipyApiKey).toBe('my-klipy');

    const giphy = screen.getByLabelText('Giphy API key');
    await fireEvent.changeText(giphy, '   ');
    await fireEvent(giphy, 'blur');
    expect(settings().giphyApiKey).toBe('');
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
