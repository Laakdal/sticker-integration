import { installBundledPacks, type BundledPackSource } from '@/services/bundledPacks';
import { createPackStorage } from '@/services/packStorage';
import { createMemoryFileStore } from '@/test-utils/memoryFileStore';
import { makePack } from '@/test-utils/fixtures';

const ROOT = 'file:///data/files';

function setup() {
  const fs = createMemoryFileStore();
  const storage = createPackStorage(fs, ROOT);
  const pack = makePack({ id: 'bundled.test', origin: 'bundled' });
  const files: Record<string, number> = { 'tray.png': 1 };
  pack.stickers.forEach((s, i) => (files[s.file] = i + 2));
  const assetUri = (id: number) => `file:///cache/asset-${id}`;
  for (const id of Object.values(files)) fs.files.set(assetUri(id), `content-${id}`);
  const sources: BundledPackSource[] = [{ pack, files }];
  const deps = { fs, storage, resolveAssetUri: async (id: number) => assetUri(id) };
  return { fs, storage, pack, sources, deps };
}

describe('installBundledPacks', () => {
  it('copies files and pack.json into packs/<id>', async () => {
    const { fs, storage, pack, sources, deps } = setup();
    expect(await installBundledPacks(sources, deps)).toEqual(['bundled.test']);
    expect(fs.files.get(storage.fileUri(pack.id, 'tray.png'))).toBe('content-1');
    expect((await storage.loadAll()).packs).toEqual([pack]);
    expect(await fs.listDirs(storage.packsDirUri)).toEqual(['bundled.test']);
  });

  it('replaces a previous copy of the same pack', async () => {
    const { fs, storage, pack, sources, deps } = setup();
    await fs.writeText(storage.fileUri(pack.id, 'stale.webp'), 'old');
    await installBundledPacks(sources, deps);
    expect(await fs.exists(storage.fileUri(pack.id, 'stale.webp'))).toBe(false);
  });

  it('rejects a source that is not a bundled pack', async () => {
    const { sources, deps } = setup();
    sources[0]!.pack = { ...makePack(), origin: 'user' };
    await expect(installBundledPacks(sources, deps)).rejects.toThrow('Invalid bundled pack');
  });

  it('rejects a source missing a referenced file', async () => {
    const { sources, deps } = setup();
    delete sources[0]!.files['tray.png'];
    await expect(installBundledPacks(sources, deps)).rejects.toThrow('missing tray.png');
  });
});
