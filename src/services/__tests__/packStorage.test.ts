import { createPackStorage, PACK_FILE } from '@/services/packStorage';
import { serializePack } from '@/services/packSchema';
import { createMemoryFileStore } from '@/test-utils/memoryFileStore';
import { makePack } from '@/test-utils/fixtures';

const ROOT = 'file:///data/files';

function setup() {
  const fs = createMemoryFileStore();
  const storage = createPackStorage(fs, ROOT);
  return { fs, storage };
}

describe('packStorage', () => {
  it('builds URIs under packs/', () => {
    const { storage } = setup();
    expect(storage.packsDirUri).toBe('file:///data/files/packs');
    expect(storage.fileUri('p1', 'a.webp')).toBe('file:///data/files/packs/p1/a.webp');
  });

  it('saves atomically and loads packs back', async () => {
    const { fs, storage } = setup();
    const pack = makePack({ id: 'p1' });
    await storage.save(pack);
    expect(fs.files.has(`${ROOT}/packs/p1/${PACK_FILE}.tmp`)).toBe(false);
    expect(await storage.loadAll()).toEqual({ packs: [pack], quarantined: [] });
  });

  it('recovers a pack whose last save stopped after writing the temp file', async () => {
    const { fs, storage } = setup();
    const pack = makePack({ id: 'p1' });
    await fs.writeText(`${ROOT}/packs/p1/${PACK_FILE}.tmp`, serializePack(pack));
    const result = await storage.loadAll();
    expect(result.packs).toEqual([pack]);
    expect(fs.files.has(`${ROOT}/packs/p1/${PACK_FILE}`)).toBe(true);
    expect(fs.files.has(`${ROOT}/packs/p1/${PACK_FILE}.tmp`)).toBe(false);
  });

  it('quarantines unreadable packs and keeps loading the rest', async () => {
    const { fs, storage } = setup();
    await storage.save(makePack({ id: 'good' }));
    await fs.writeText(`${ROOT}/packs/broken/${PACK_FILE}`, '{not json');
    await fs.writeText(`${ROOT}/packs/invalid/${PACK_FILE}`, '{"id": 1}');
    await fs.writeText(`${ROOT}/packs/empty/a.webp`, 'x');
    const result = await storage.loadAll();
    expect(result.packs.map((p) => p.id)).toEqual(['good']);
    expect(result.quarantined.sort()).toEqual(['broken', 'empty', 'invalid']);
    expect(fs.files.has(`${ROOT}/quarantine/broken/${PACK_FILE}`)).toBe(true);
    expect(await fs.exists(`${ROOT}/packs/broken`)).toBe(false);
  });

  it('quarantines a pack whose folder name differs from its id', async () => {
    const { fs, storage } = setup();
    await fs.writeText(`${ROOT}/packs/folder/${PACK_FILE}`, serializePack(makePack({ id: 'other' })));
    expect((await storage.loadAll()).quarantined).toEqual(['folder']);
  });

  it('does not overwrite an earlier quarantined folder with the same name', async () => {
    const { fs, storage } = setup();
    await fs.writeText(`${ROOT}/quarantine/broken/${PACK_FILE}`, 'old');
    await fs.writeText(`${ROOT}/packs/broken/${PACK_FILE}`, 'new');
    await storage.loadAll();
    const names = await fs.listDirs(`${ROOT}/quarantine`);
    expect(names).toHaveLength(2);
  });

  it('ignores staging directories that start with a dot', async () => {
    const { fs, storage } = setup();
    await fs.writeText(`${ROOT}/packs/.staging-x/${PACK_FILE}`, 'partial');
    expect(await storage.loadAll()).toEqual({ packs: [], quarantined: [] });
  });

  it('removes packs and files, copies files, reports sizes', async () => {
    const { fs, storage } = setup();
    await storage.save(makePack({ id: 'a' }));
    await fs.writeText(storage.fileUri('a', 's.webp'), '12345');
    expect(await storage.fileSize('a', 's.webp')).toBe(5);
    expect(await storage.fileSize('a', 'missing.webp')).toBeNull();

    await storage.copyFiles('a', 'b', ['s.webp']);
    expect(fs.files.get(storage.fileUri('b', 's.webp'))).toBe('12345');

    await storage.removeFile('a', 's.webp');
    expect(await storage.fileSize('a', 's.webp')).toBeNull();

    await storage.remove('a');
    expect(await fs.exists(storage.packDirUri('a'))).toBe(false);
  });
});
