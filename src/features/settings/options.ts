import type { ContentRating, ThemeMode } from '@/store/createSettingsStore';

export const RATING_OPTIONS: { value: ContentRating; label: string }[] = [
  { value: 'g', label: 'G' },
  { value: 'pg', label: 'PG' },
  { value: 'pg-13', label: 'PG-13' },
  { value: 'r', label: 'R' },
];

export const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Auto (same as system)' },
];

export type SettingsCategoryId = 'gif' | 'display';

/** The settings sub-screens: `/settings/<id>`, pushed on the root Stack above the drawer. */
export const SETTINGS_CATEGORIES: { id: SettingsCategoryId; section: string; title: string; icon: string }[] = [
  { id: 'gif', section: 'API', title: 'API keys', icon: 'file-gif-box' },
  { id: 'display', section: 'Display', title: 'Appearance', icon: 'palette-outline' },
];

export function optionLabel<T extends string>(options: { value: T; label: string }[], value: T): string {
  return options.find((o) => o.value === value)?.label ?? value;
}
