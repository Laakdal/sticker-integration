import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

export type GifProviderId = 'klipy' | 'giphy';
export type ContentRating = 'g' | 'pg' | 'pg-13' | 'r';

export interface SettingsValues {
  /** Empty string means "use the .env default". */
  klipyApiKey: string;
  giphyApiKey: string;
  contentRating: ContentRating;
  reduceMotion: boolean;
  /** Use the Android 12+ wallpaper colour scheme (Material You) where the device provides one. */
  useDynamicColor: boolean;
  /** The author name last used to create a pack; pre-fills the "New pack" dialog. */
  lastPublisher: string;
}

export interface SettingsState extends SettingsValues {
  setSetting<K extends keyof SettingsValues>(key: K, value: SettingsValues[K]): void;
}

export const DEFAULT_SETTINGS: SettingsValues = {
  klipyApiKey: '',
  giphyApiKey: '',
  contentRating: 'pg-13',
  reduceMotion: false,
  useDynamicColor: true,
  lastPublisher: '',
};

/**
 * Takes only the saved values this version still knows, so retired settings (e.g. the old
 * `bundledPacksVersion`) drop out of state and out of storage on the next save.
 */
function mergeKnownSettings(persisted: unknown, current: SettingsState): SettingsState {
  if (typeof persisted !== 'object' || persisted === null) return current;
  const saved = persisted as Record<string, unknown>;
  const known = Object.keys(DEFAULT_SETTINGS).filter((key) => key in saved);
  return { ...current, ...Object.fromEntries(known.map((key) => [key, saved[key]])) };
}

export function createSettingsStore(storage: StateStorage) {
  return create<SettingsState>()(
    persist(
      (set) => ({
        ...DEFAULT_SETTINGS,
        setSetting: (key, value) => set({ [key]: value } as Partial<SettingsValues>),
      }),
      {
        name: 'settings',
        version: 1,
        storage: createJSONStorage(() => storage),
        partialize: ({ setSetting: _setSetting, ...values }) => values,
        merge: mergeKnownSettings,
      },
    ),
  );
}
