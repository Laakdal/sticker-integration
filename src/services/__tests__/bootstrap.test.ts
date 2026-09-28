import { runBootstrap } from '@/services/bootstrap';
import { removeLegacyStarterPacks } from '@/services/legacyStarterPacks';
import { createPackStorage, PACK_FILE } from '@/services/packStorage';
import { createPacksStore } from '@/store/createPacksStore';
import { createMemoryFileStore } from '@/test-utils/memoryFileStore';
import { makePack } from '@/test-utils/fixtures';

describe('runBootstrap', () => {
  it('cleans up before loading packs', async () => {
    const calls: string[] = [];
    const result = await runBootstrap({
      cleanUp: async () => void calls.push('cleanUp'),
      loadPacks: async () => void calls.push('load'),
    });
    expect(result).toEqual({ loadError: null });
    expect(calls).toEqual(['cleanUp', 'load']);
  });

  it('still loads packs when the cleanup fails', async () => {
    const loadPacks = jest.fn().mockResolvedValue(undefined);
    const result = await runBootstrap({ cleanUp: () => Promise.reject(new Error('disk busy')), loadPacks });
    expect(result).toEqual({ loadError: null });
    expect(loadPacks).toHaveBeenCalledTimes(1);
  });

  it('reports a loadPacks failure instead of rejecting', async () => {
    const result = await runBootstrap({
      cleanUp: async () => {},
      loadPacks: async () => {
        throw new Error('storage unreadable');
      },
    });
    expect(result.loadError?.message).toBe('storage unreadable');
  });

  it('wraps non-Error load failures', async () => {
    const result = await runBootstrap({ cleanUp: async () => {}, loadPacks: () => Promise.reject('boom') });
    expect(result.loadError?.message).toBe('boom');
  });

  it('removes previously installed starter packs before they could be quarantined', async () => {
    const fs = createMemoryFileStore();
    const storage = createPackStorage(fs, 'file:///data/files');
    const store = createPacksStore({ storage, newId: () => 'new', now: () => new Date() });
    const legacy = { ...makePack({ id: 'bundled.starter-basics' }), origin: 'bundled' };
    await fs.writeText(storage.fileUri(legacy.id, PACK_FILE), JSON.stringify(legacy));
    await storage.save(makePack({ id: 'mine' }));

    await runBootstrap({ cleanUp: () => removeLegacyStarterPacks(fs, storage), loadPacks: () => store.getState().load() });

    expect(Object.keys(store.getState().packs)).toEqual(['mine']);
    expect(store.getState().quarantined).toEqual([]);
  });
});
