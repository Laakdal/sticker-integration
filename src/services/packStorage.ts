import type { Pack } from '@/domain/types';

import { joinPath, type FileStore } from './fs/FileStore';
import { parsePack, serializePack } from './packSchema';

export const PACK_FILE = 'pack.json';
export const TRAY_FILE = 'tray.png';
const TMP_SUFFIX = '.tmp';

export interface LoadResult {
  packs: Pack[];
  /** Folder names moved to quarantine during this load. */
  quarantined: string[];
}

export interface PackStorage {
  rootUri: string;
  packsDirUri: string;
  packDirUri(packId: string): string;
  fileUri(packId: string, fileName: string): string;
  loadAll(): Promise<LoadResult>;
  save(pack: Pack): Promise<void>;
  remove(packId: string): Promise<void>;
  removeFile(packId: string, fileName: string): Promise<void>;
  copyFiles(fromId: string, toId: string, fileNames: string[]): Promise<void>;
  fileSize(packId: string, fileName: string): Promise<number | null>;
}

export function createPackStorage(fs: FileStore, rootUri: string): PackStorage {
  const packsDirUri = joinPath(rootUri, 'packs');
  const quarantineDirUri = joinPath(rootUri, 'quarantine');
  const packDirUri = (packId: string) => joinPath(packsDirUri, packId);
  const fileUri = (packId: string, fileName: string) => joinPath(packDirUri(packId), fileName);

  async function quarantine(dirName: string) {
    await fs.ensureDir(quarantineDirUri);
    let target = joinPath(quarantineDirUri, dirName);
    if (await fs.exists(target)) target = joinPath(quarantineDirUri, `${dirName}-${Date.now()}`);
    await fs.moveDir(joinPath(packsDirUri, dirName), target);
  }

  async function readPackDir(dirName: string): Promise<Pack | null> {
    const jsonUri = fileUri(dirName, PACK_FILE);
    const tmpUri = jsonUri + TMP_SUFFIX;
    if (!(await fs.exists(jsonUri))) {
      if (!(await fs.exists(tmpUri))) return null;
      await fs.move(tmpUri, jsonUri);
    }
    let raw: unknown;
    try {
      raw = JSON.parse(await fs.readText(jsonUri));
    } catch {
      return null;
    }
    const pack = parsePack(raw);
    return pack && pack.id === dirName ? pack : null;
  }

  return {
    rootUri,
    packsDirUri,
    packDirUri,
    fileUri,

    async loadAll() {
      await fs.ensureDir(packsDirUri);
      const packs: Pack[] = [];
      const quarantined: string[] = [];
      for (const dirName of await fs.listDirs(packsDirUri)) {
        if (dirName.startsWith('.')) continue;
        const pack = await readPackDir(dirName);
        if (pack) {
          packs.push(pack);
        } else {
          await quarantine(dirName);
          quarantined.push(dirName);
        }
      }
      return { packs, quarantined };
    },

    async save(pack) {
      await fs.ensureDir(packDirUri(pack.id));
      const jsonUri = fileUri(pack.id, PACK_FILE);
      await fs.writeText(jsonUri + TMP_SUFFIX, serializePack(pack));
      await fs.move(jsonUri + TMP_SUFFIX, jsonUri);
    },

    async remove(packId) {
      await fs.remove(packDirUri(packId));
    },

    async removeFile(packId, fileName) {
      await fs.remove(fileUri(packId, fileName));
    },

    async copyFiles(fromId, toId, fileNames) {
      await fs.ensureDir(packDirUri(toId));
      for (const name of fileNames) {
        await fs.copy(fileUri(fromId, name), fileUri(toId, name));
      }
    },

    async fileSize(packId, fileName) {
      return fs.size(fileUri(packId, fileName));
    },
  };
}
