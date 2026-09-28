import { settingsSummaries } from '@/features/settings';
import { DEFAULT_SETTINGS, type SettingsValues } from '@/store/createSettingsStore';

const NO_ENV_KEYS = { klipy: false, giphy: false };
const values = (patch: Partial<SettingsValues> = {}): SettingsValues => ({ ...DEFAULT_SETTINGS, ...patch });

describe('settingsSummaries', () => {
  describe('GIF search & API', () => {
    it('names the provider and rating, and says when the provider has no key', () => {
      expect(settingsSummaries(values(), NO_ENV_KEYS).gif).toBe('Klipy · PG-13 · no key set');
    });

    it('counts a saved key for the active provider', () => {
      expect(settingsSummaries(values({ gifProvider: 'giphy', giphyApiKey: 'abc', contentRating: 'g' }), NO_ENV_KEYS).gif).toBe(
        'Giphy · G · key set',
      );
    });

    it('counts a key from .env for the active provider', () => {
      expect(settingsSummaries(values({ contentRating: 'r' }), { klipy: true, giphy: false }).gif).toBe('Klipy · R · key set');
    });

    it("ignores the other provider's keys and blank saved keys", () => {
      const summary = settingsSummaries(values({ gifProvider: 'giphy', giphyApiKey: '  ', klipyApiKey: 'k', contentRating: 'pg' }), {
        klipy: true,
        giphy: false,
      });
      expect(summary.gif).toBe('Giphy · PG · no key set');
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
