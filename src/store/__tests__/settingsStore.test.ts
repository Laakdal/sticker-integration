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

  it('persists the last author used for a new pack', () => {
    const storage = memoryStorage();
    const store = createSettingsStore(storage);
    expect(store.getState().lastPublisher).toBe('');
    store.getState().setSetting('lastPublisher', 'Jane');
    expect(store.getState().lastPublisher).toBe('Jane');
    expect(JSON.parse(storage.data.settings!).state.lastPublisher).toBe('Jane');
  });

  it('rehydrates saved values synchronously', () => {
    const storage = memoryStorage({
      settings: JSON.stringify({ state: { gifProvider: 'giphy', lastPublisher: 'Jane' }, version: 1 }),
    });
    const store = createSettingsStore(storage);
    expect(store.getState().gifProvider).toBe('giphy');
    expect(store.getState().lastPublisher).toBe('Jane');
    expect(store.getState().contentRating).toBe('pg-13');
  });

  it('uses wallpaper colours by default and keeps a saved choice', () => {
    expect(createSettingsStore(memoryStorage()).getState().useDynamicColor).toBe(true);

    const storage = memoryStorage({ settings: JSON.stringify({ state: { useDynamicColor: false }, version: 1 }) });
    expect(createSettingsStore(storage).getState().useDynamicColor).toBe(false);
  });

  it('drops retired settings saved by an older version', () => {
    const storage = memoryStorage({
      settings: JSON.stringify({ state: { gifProvider: 'giphy', bundledPacksVersion: 3 }, version: 1 }),
    });
    const store = createSettingsStore(storage);
    expect(store.getState().gifProvider).toBe('giphy');
    expect(store.getState()).not.toHaveProperty('bundledPacksVersion');

    store.getState().setSetting('reduceMotion', true);
    const saved = JSON.parse(storage.data.settings!).state;
    expect(saved).not.toHaveProperty('bundledPacksVersion');
    expect(saved).toMatchObject({ gifProvider: 'giphy', reduceMotion: true });
  });
});
