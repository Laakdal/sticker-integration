import type { StateStorage } from 'zustand/middleware';

import { createSettingsStore, DEFAULT_SETTINGS } from '@/store/createSettingsStore';

function memoryStorage(initial: Record<string, string> = {}): StateStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v;
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

describe('settings store', () => {
  it('starts with defaults', () => {
    const store = createSettingsStore(memoryStorage());
    const { setSetting: _ignored, ...values } = store.getState();
    expect(values).toEqual(DEFAULT_SETTINGS);
  });

  it('persists changes', () => {
    const storage = memoryStorage();
    const store = createSettingsStore(storage);
    store.getState().setSetting('reduceMotion', true);
    expect(JSON.parse(storage.data.settings!).state.reduceMotion).toBe(true);
  });

  it('rehydrates saved values synchronously', () => {
    const storage = memoryStorage({
      settings: JSON.stringify({ state: { gifProvider: 'giphy', bundledPacksVersion: 3 }, version: 1 }),
    });
    const store = createSettingsStore(storage);
    expect(store.getState().gifProvider).toBe('giphy');
    expect(store.getState().bundledPacksVersion).toBe(3);
    expect(store.getState().contentRating).toBe('pg-13');
  });
});
