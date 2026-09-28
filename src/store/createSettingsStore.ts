import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

export type GifProviderId = 'klipy' | 'giphy';
export type ContentRating = 'g' | 'pg' | 'pg-13' | 'r';

export interface SettingsValues {
  gifProvider: GifProviderId;
  /** Empty string means "use the .env default". */
  klipyApiKey: string;
  giphyApiKey: string;
  contentRating: ContentRating;
  reduceMotion: boolean;
  bundledPacksVersion: number;
  /** The author name last used to create a pack; pre-fills the "New pack" dialog. */
  lastPublisher: string;
}

export interface SettingsState extends SettingsValues {
  setSetting<K extends keyof SettingsValues>(key: K, value: SettingsValues[K]): void;
}

export const DEFAULT_SETTINGS: SettingsValues = {
  gifProvider: 'klipy',
  klipyApiKey: '',
  giphyApiKey: '',
  contentRating: 'pg-13',
  reduceMotion: false,
  bundledPacksVersion: 0,
  lastPublisher: '',
};

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
      },
    ),
  );
}
