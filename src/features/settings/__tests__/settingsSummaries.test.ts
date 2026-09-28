import { settingsSummaries } from '@/features/settings';
import { DEFAULT_SETTINGS, type SettingsValues } from '@/store/createSettingsStore';

const NO_ENV_KEYS = { klipy: false, giphy: false };
const values = (patch: Partial<SettingsValues> = {}): SettingsValues => ({ ...DEFAULT_SETTINGS, ...patch });

describe('settingsSummaries', () => {
  describe('GIF search & API', () => {
    it('reports each provider independently, and the rating', () => {
      expect(settingsSummaries(values(), NO_ENV_KEYS).gif).toBe('Klipy: no key · Giphy: no key · PG-13');
    });

    it('counts a saved key per provider', () => {
      expect(settingsSummaries(values({ giphyApiKey: 'abc', contentRating: 'g' }), NO_ENV_KEYS).gif).toBe(
        'Klipy: no key · Giphy: key set · G',
      );
    });

    it('counts a key from .env per provider', () => {
      expect(settingsSummaries(values({ contentRating: 'r' }), { klipy: true, giphy: false }).gif).toBe(
        'Klipy: key set · Giphy: no key · R',
      );
    });

    it('ignores blank saved keys and counts both providers when both have keys', () => {
      const summary = settingsSummaries(values({ giphyApiKey: '  ', klipyApiKey: 'k', contentRating: 'pg' }), {
        klipy: true,
        giphy: true,
      });
      expect(summary.gif).toBe('Klipy: key set · Giphy: key set · PG');
    });
  });

  describe('Display', () => {
    it('reports both switches', () => {
      expect(settingsSummaries(values(), NO_ENV_KEYS).display).toBe('Wallpaper colours on · Reduce motion off');
      expect(settingsSummaries(values({ useDynamicColor: false, reduceMotion: true }), NO_ENV_KEYS).display).toBe(
        'Wallpaper colours off · Reduce motion on',
      );
    });

    it('says wallpaper colours are unavailable before Android 12', () => {
      expect(settingsSummaries(values(), NO_ENV_KEYS, { dynamicColorSupported: false }).display).toBe(
        'Wallpaper colours unavailable · Reduce motion off',
      );
    });
  });

  describe('New packs', () => {
    it('shows the default author, or that none is set', () => {
      expect(settingsSummaries(values({ lastPublisher: 'Jane Doe' }), NO_ENV_KEYS)['new-packs']).toBe('Default author: Jane Doe');
      expect(settingsSummaries(values(), NO_ENV_KEYS)['new-packs']).toBe('Default author: not set');
    });
  });
});
