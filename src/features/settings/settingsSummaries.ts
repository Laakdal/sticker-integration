import type { SettingsValues } from '@/store/createSettingsStore';
import { optionLabel, RATING_OPTIONS, type SettingsCategoryId } from './options';

/** Whether the build has a `.env` key for each GIF provider. */
export interface EnvKeys {
  klipy: boolean;
  giphy: boolean;
}

/** One line per settings category. */
export type SettingsSummaries = Record<SettingsCategoryId, string>;

const THEME_SUMMARY = { light: 'Light theme', dark: 'Dark theme', system: 'Auto theme' } as const;

const onOff = (value: boolean) => (value ? 'on' : 'off');

/** One-line summaries of each settings category's current values, for the Settings list. */
export function settingsSummaries(
  values: SettingsValues,
  envKeys: EnvKeys,
  { dynamicColorSupported = true }: { dynamicColorSupported?: boolean } = {},
): SettingsSummaries {
  const keyLabel = (provider: keyof EnvKeys, savedKey: string) =>
    savedKey.trim() !== '' || envKeys[provider] ? 'key set' : 'no key';
  const gif = [
    `Klipy: ${keyLabel('klipy', values.klipyApiKey)}`,
    `Giphy: ${keyLabel('giphy', values.giphyApiKey)}`,
    optionLabel(RATING_OPTIONS, values.contentRating),
  ];
  const wallpaper = dynamicColorSupported ? onOff(values.useDynamicColor) : 'unavailable';

  return {
    gif: gif.join(' · '),
    display: `${THEME_SUMMARY[values.themeMode]} · Wallpaper colours ${wallpaper} · Reduce motion ${onOff(values.reduceMotion)}`,
  };
}
