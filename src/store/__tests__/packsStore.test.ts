import { LIMITS } from '@/domain/limits';
import { createPackStorage, TRAY_FILE } from '@/services/packStorage';
import {
  createPacksStore,
  PackFullError,
  PackTypeMismatchError,
  ReadOnlyPackError,
  selectBundledPacks,
  selectMyPacks,
} from '@/store/createPacksStore';
import { createMemoryFileStore } from '@/test-utils/memoryFileStore';
import { makePack, makeSticker } from '@/test-utils/fixtures';

const ROOT = 'file:///data/files';

function setup() {
  const fs = createMemoryFileStore();
  const storage = createPackStorage(fs, ROOT);
  let n = 0;
  let clock = Date.parse('2026-09-25T10:00:00.000Z');
  const store = createPacksStore({
    storage,
    newId: () => `id${++n}`,
    now: () => new Date((clock += 1000)),
  });
  const onDisk = async (id: string) => JSON.parse(await fs.readText(storage.fileUri(id, 'pack.json')));
  return { fs, storage, store, onDisk };
}

describe('packs store', () => {
  it('loads packs and quarantined names from storage', async () => {
    const { storage, store, fs } = setup();
    await storage.save(makePack({ id: 'p1' }));
    await fs.writeText(`${ROOT}/packs/bad/pack.json`, 'nope');
    await store.getState().load();
    expect(Object.keys(store.getState().packs)).toEqual(['p1']);
    expect(store.getState().quarantined).toEqual(['bad']);
    expect(store.getState().loaded).toBe(true);
  });

  it('creates an empty user pack and saves it', async () => {
    const { store, onDisk } = setup();
    const pack = await store.getState().createPack({ name: 'Cats', publisher: 'Me' });
    expect(pack).toMatchObject({ id: 'id1', name: 'Cats', origin: 'user', stickers: [], imageDataVersion: 1, trayIcon: TRAY_FILE });
    expect(await onDisk('id1')).toEqual(pack);
  });

  it('bumps imageDataVersion and updatedAt on every mutation', async () => {
    const { store } = setup();
    const pack = await store.getState().createPack({ name: 'A', publisher: 'B' });
    await store.getState().updateDetails(pack.id, { name: 'A2' });
    const next = store.getState().packs[pack.id]!;
    expect(next.name).toBe('A2');
    expect(next.imageDataVersion).toBe(2);
    expect(next.updatedAt > pack.updatedAt).toBe(true);
  });

  it('fixes the pack type from the first sticker and rejects mismatches', async () => {
    const { store } = setup();
    const pack = await store.getState().createPack({ name: 'A', publisher: 'B' });
    await store.getState().addSticker(pack.id, makeSticker({ animated: true }));
    expect(store.getState().packs[pack.id]!.animated).toBe(true);
    await expect(store.getState().addSticker(pack.id, makeSticker({ animated: false }))).rejects.toBeInstanceOf(
      PackTypeMismatchError,
    );
  });

  it('rejects a sticker beyond the maximum', async () => {
    const { store } = setup();
    const pack = await store.getState().createPack({ name: 'A', publisher: 'B' });
    for (let i = 0; i < LIMITS.maxStickers; i++) await store.getState().addSticker(pack.id, makeSticker());
    await expect(store.getState().addSticker(pack.id, makeSticker())).rejects.toBeInstanceOf(PackFullError);
  });

  it('updates, reorders and removes stickers (including files and sources)', async () => {
    const { store, fs, storage } = setup();
    const pack = await store.getState().createPack({ name: 'A', publisher: 'B' });
    const [a, b, c] = [makeSticker({ id: 'a' }), makeSticker({ id: 'b' }), makeSticker({ id: 'c' })];
    for (const s of [a, b, c]) {
      await fs.writeText(storage.fileUri(pack.id, s.file), 'img');
      await store.getState().addSticker(pack.id, s);
    }
    await fs.writeText(storage.fileUri(pack.id, '.src/b/layers.json'), '{}');

    await store.getState().updateSticker(pack.id, 'a', { emojis: ['🔥'], accessibilityText: 'fire' });
    await store.getState().reorderStickers(pack.id, ['c', 'a', 'b']);
    await store.getState().removeSticker(pack.id, 'b');

    const stickers = store.getState().packs[pack.id]!.stickers;
    expect(stickers.map((s) => s.id)).toEqual(['c', 'a']);
    expect(stickers[1]).toMatchObject({ emojis: ['🔥'], accessibilityText: 'fire' });
    expect(await fs.exists(storage.fileUri(pack.id, 'b.webp'))).toBe(false);
    expect(await fs.exists(storage.fileUri(pack.id, '.src/b/layers.json'))).toBe(false);
  });

  it('rejects an order that is not a permutation', async () => {
    const { store } = setup();
    const pack = await store.getState().createPack({ name: 'A', publisher: 'B' });
    await store.getState().addSticker(pack.id, makeSticker({ id: 'a' }));
    await expect(store.getState().reorderStickers(pack.id, ['a', 'zzz'])).rejects.toThrow('Invalid sticker order');
  });

  it('treats bundled packs as read-only', async () => {
    const { store, storage } = setup();
    await storage.save(makePack({ id: 'bundled', origin: 'bundled' }));
    await store.getState().load();
    await expect(store.getState().updateDetails('bundled', { name: 'x' })).rejects.toBeInstanceOf(ReadOnlyPackError);
    await expect(store.getState().deletePack('bundled')).rejects.toBeInstanceOf(ReadOnlyPackError);
  });

  it('duplicates a pack with its files as an editable user pack', async () => {
    const { store, storage, fs } = setup();
    const source = makePack({ id: 'bundled', origin: 'bundled', name: 'N'.repeat(128) });
    await storage.save(source);
    await fs.writeText(storage.fileUri('bundled', TRAY_FILE), 'tray');
    for (const s of source.stickers) await fs.writeText(storage.fileUri('bundled', s.file), 'img');
    await store.getState().load();

    const copy = await store.getState().duplicatePack('bundled');
    expect(copy).toMatchObject({ id: 'id1', origin: 'user', imageDataVersion: 1 });
    expect(copy.name).toHaveLength(128);
    expect(copy.name.endsWith(' (copy)')).toBe(true);
    expect(copy.stickers.every((s) => !s.editable)).toBe(true);
    expect(fs.files.get(storage.fileUri('id1', TRAY_FILE))).toBe('tray');
    expect(fs.files.get(storage.fileUri('id1', source.stickers[0]!.file))).toBe('img');
  });

  it('deletes a user pack from disk and state', async () => {
    const { store, fs, storage } = setup();
    const pack = await store.getState().createPack({ name: 'A', publisher: 'B' });
    await store.getState().deletePack(pack.id);
    expect(store.getState().packs[pack.id]).toBeUndefined();
    expect(await fs.exists(storage.packDirUri(pack.id))).toBe(false);
  });

  it('serializes concurrent mutations so the last edit wins on disk', async () => {
    const { store, onDisk } = setup();
    const pack = await store.getState().createPack({ name: 'A', publisher: 'B' });
    await store.getState().addSticker(pack.id, makeSticker({ id: 'a' }));
    await store.getState().addSticker(pack.id, makeSticker({ id: 'b' }));
    await Promise.all([
      store.getState().updateDetails(pack.id, { name: 'first' }),
      store.getState().reorderStickers(pack.id, ['b', 'a']),
      store.getState().updateDetails(pack.id, { publisher: 'second' }),
    ]);
    const disk = await onDisk(pack.id);
    expect(disk).toMatchObject({ name: 'first', publisher: 'second', imageDataVersion: 6 });
    expect(disk.stickers.map((s: { id: string }) => s.id)).toEqual(['b', 'a']);
    expect(store.getState().packs[pack.id]).toEqual(disk);
  });

  it('selects my packs newest first and bundled packs by name', async () => {
    const { store, storage } = setup();
    await storage.save(makePack({ id: 'z', origin: 'bundled', name: 'Zed' }));
    await storage.save(makePack({ id: 'y', origin: 'bundled', name: 'Alpha' }));
    await store.getState().load();
    const first = await store.getState().createPack({ name: 'Old', publisher: 'B' });
    await store.getState().createPack({ name: 'New', publisher: 'B' });
    await store.getState().updateDetails(first.id, { name: 'Old but edited' });
    expect(selectMyPacks(store.getState()).map((p) => p.name)).toEqual(['Old but edited', 'New']);
    expect(selectBundledPacks(store.getState()).map((p) => p.name)).toEqual(['Alpha', 'Zed']);
  });
});
