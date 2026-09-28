import { act, screen } from '@testing-library/react-native';

import { StickerImage } from '@/components/StickerImage';
import { DEFAULT_SETTINGS } from '@/store/createSettingsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { renderWithProviders } from '@/test-utils/render';

// The app settings store persists through react-native-mmkv, which swaps in an in-memory
// instance under Jest, so tests use the real store and reset it between cases.
beforeEach(() => useSettingsStore.setState(DEFAULT_SETTINGS));

const autoplayOf = (label: string) => screen.getByLabelText(label).props.autoplay;

describe('StickerImage', () => {
  it('plays animated stickers by default', async () => {
    await renderWithProviders(<StickerImage uri="file:///a.webp" size={48} accessibilityLabel="Sticker" />);
    expect(autoplayOf('Sticker')).toBe(true);
  });

  it('does not play when reduce motion is on', async () => {
    useSettingsStore.getState().setSetting('reduceMotion', true);
    await renderWithProviders(<StickerImage uri="file:///a.webp" size={48} accessibilityLabel="Sticker" />);
    expect(autoplayOf('Sticker')).toBe(false);
  });

  it('follows reduce motion changes while mounted', async () => {
    await renderWithProviders(<StickerImage uri="file:///a.webp" size={48} accessibilityLabel="Sticker" />);
    await act(async () => useSettingsStore.getState().setSetting('reduceMotion', true));
    expect(autoplayOf('Sticker')).toBe(false);
  });

  it('lets an explicit animate prop override the setting', async () => {
    await renderWithProviders(<StickerImage uri="file:///a.webp" size={48} animate={false} accessibilityLabel="Tray" />);
    expect(autoplayOf('Tray')).toBe(false);
  });
});
