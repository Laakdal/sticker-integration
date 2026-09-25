import { createMMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

import { createSettingsStore } from './createSettingsStore';

const mmkv = createMMKV({ id: 'settings' });

const mmkvStorage: StateStorage = {
  getItem: (key) => mmkv.getString(key) ?? null,
  setItem: (key, value) => mmkv.set(key, value),
  removeItem: (key) => {
    mmkv.remove(key);
  },
};

export const useSettingsStore = createSettingsStore(mmkvStorage);
