import type { ContentRating } from '@/store/createSettingsStore';

export const RATING_OPTIONS: { value: ContentRating; label: string }[] = [
  { value: 'g', label: 'G' },
  { value: 'pg', label: 'PG' },
  { value: 'pg-13', label: 'PG-13' },
  { value: 'r', label: 'R' },
];

export type SettingsCategoryId = 'gif' | 'display';

/** The settings sub-screens: `/settings/<id>`, pushed on the root Stack above the drawer. */
export const SETTINGS_CATEGORIES: { id: SettingsCategoryId; title: string; icon: string }[] = [
  { id: 'gif', title: 'GIF search & API', icon: 'file-gif-box' },
  { id: 'display', title: 'Display', icon: 'palette-outline' },
];

export function optionLabel<T extends string>(options: { value: T; label: string }[], value: T): string {
  return options.find((o) => o.value === value)?.label ?? value;
}
