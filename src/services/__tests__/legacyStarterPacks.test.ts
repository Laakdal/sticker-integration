import { joinPath } from '@/services/fs/FileStore';
import { removeLegacyStarterPacks } from '@/services/legacyStarterPacks';
import { createPackStorage, PACK_FILE, TRAY_FILE } from '@/services/packStorage';
import { createMemoryFileStore } from '@/test-utils/memoryFileStore';
import { makePack } from '@/test-utils/fixtures';

const ROOT = 'file:///data/files';

function setup() {
  const fs = createMemoryFileStore();
  const storage = createPackStorage(fs, ROOT);
  return { fs, storage };
}

/** Writes a pack folder the way older app versions installed a starter pack (origin 'bundled'). */
async function writeLegacyStarterPack(fs: ReturnType<typeof createMemoryFileStore>, storage: ReturnType<typeof createPackStorage>, id: string) {
  const pack = { ...makePack({ id }), origin: 'bundled' };
  await fs.writeText(storage.fileUri(id, PACK_FILE), JSON.stringify(pack));
  await fs.writeText(storage.fileUri(id, TRAY_FILE), 'tray');
  for (const s of pack.stickers) await fs.writeText(storage.fileUri(id, s.file), 'img');
}

describe('removeLegacyStarterPacks', () => {
  it('removes the starter pack folders so loading reports no quarantine', async () => {
    const { fs, storage } = setup();
    await writeLegacyStarterPack(fs, storage, 'bundled.starter-basics');
    await writeLegacyStarterPack(fs, storage, 'bundled.starter-moves');

    await removeLegacyStarterPacks(fs, storage);

    expect(await fs.exists(storage.packDirUri('bundled.starter-basics'))).toBe(false);
    expect(await fs.exists(storage.packDirUri('bundled.starter-moves'))).toBe(false);
    expect([...fs.files.keys()].filter((f) => f.includes('bundled.'))).toEqual([]);
    expect(await storage.loadAll()).toEqual({ packs: [], quarantined: [] });
  });

  it('removes leftover staging folders from interrupted starter pack installs', async () => {
    const { fs, storage } = setup();
    const staging = joinPath(storage.packsDirUri, '.staging-bundled.starter-moves');
    await fs.writeText(joinPath(staging, 'm1.webp'), 'img');

    await removeLegacyStarterPacks(fs, storage);

    expect(await fs.exists(staging)).toBe(false);
  });

  it('leaves user packs and unrelated folders untouched', async () => {
    const { fs, storage } = setup();
    await writeLegacyStarterPack(fs, storage, 'bundled.starter-basics');
    const mine = makePack({ id: 'mine', origin: 'user' });
    const lookalike = makePack({ id: 'bundled.starter-basics-copy', origin: 'user' });
    await storage.save(mine);
    await storage.save(lookalike);
    await fs.writeText(storage.fileUri('mine', TRAY_FILE), 'tray');
    const otherStaging = joinPath(storage.packsDirUri, '.staging-other');
    await fs.writeText(joinPath(otherStaging, 'x.webp'), 'img');

    await removeLegacyStarterPacks(fs, storage);

    expect(fs.files.get(storage.fileUri('mine', TRAY_FILE))).toBe('tray');
    expect(await fs.exists(otherStaging)).toBe(true);
    const { packs, quarantined } = await storage.loadAll();
    expect(packs.map((p) => p.id).sort()).toEqual(['bundled.starter-basics-copy', 'mine']);
    expect(quarantined).toEqual([]);
  });

  it('is a no-op when there is nothing to clean up, including a missing packs folder', async () => {
    const { fs, storage } = setup();
    await removeLegacyStarterPacks(fs, storage);
    await storage.save(makePack({ id: 'mine' }));
    const before = new Map(fs.files);

    await removeLegacyStarterPacks(fs, storage);
    await removeLegacyStarterPacks(fs, storage);

    expect(fs.files).toEqual(before);
  });
});
