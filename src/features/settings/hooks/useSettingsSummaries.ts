import { useShallow } from 'zustand/react/shallow';

import { envGifApiKey } from '@/services/gif/envKeys';
import { type SettingsValues } from '@/store/createSettingsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { isDynamicColorSupported } from '@/theme';
import { settingsSummaries } from '../settingsSummaries';

/** The Settings list's one-line summaries, kept up to date with the settings store. */
export function useSettingsSummaries() {
  const values = useSettingsStore(
    useShallow(
      (s): SettingsValues => ({
        klipyApiKey: s.klipyApiKey,
        giphyApiKey: s.giphyApiKey,
        contentRating: s.contentRating,
        reduceMotion: s.reduceMotion,
        useDynamicColor: s.useDynamicColor,
        themeMode: s.themeMode,
        lastPublisher: s.lastPublisher,
      }),
    ),
  );
  const envKeys = { klipy: envGifApiKey('klipy') !== '', giphy: envGifApiKey('giphy') !== '' };
  return settingsSummaries(values, envKeys, { dynamicColorSupported: isDynamicColorSupported() });
}
