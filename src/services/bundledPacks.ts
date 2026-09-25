import { joinPath, type FileStore } from './fs/FileStore';
import { PACK_FILE, type PackStorage } from './packStorage';
import { parsePack, serializePack } from './packSchema';

export interface BundledPackSource {
  /** Parsed pack.json contents (Metro `require` of a .json file). */
  pack: unknown;
  /** File name → Metro asset module id. */
  files: Record<string, number>;
}

export interface BundledInstallDeps {
  fs: FileStore;
  storage: PackStorage;
  resolveAssetUri: (moduleId: number) => Promise<string>;
}

/** Copies each bundled pack into a staging folder, then swaps it into place. */
export async function installBundledPacks(sources: BundledPackSource[], deps: BundledInstallDeps): Promise<string[]> {
  const { fs, storage, resolveAssetUri } = deps;
  const installed: string[] = [];

  for (const source of sources) {
    const pack = parsePack(source.pack);
    if (!pack || pack.origin !== 'bundled') throw new Error('Invalid bundled pack');
    for (const name of [pack.trayIcon, ...pack.stickers.map((s) => s.file)]) {
      if (source.files[name] === undefined) throw new Error(`Bundled pack ${pack.id} is missing ${name}`);
    }

    const staging = joinPath(storage.packsDirUri, `.staging-${pack.id}`);
    await fs.remove(staging);
    await fs.ensureDir(staging);
    for (const [name, moduleId] of Object.entries(source.files)) {
      await fs.copy(await resolveAssetUri(moduleId), joinPath(staging, name));
    }
    await fs.writeText(joinPath(staging, PACK_FILE), serializePack(pack));

    await storage.remove(pack.id);
    await fs.moveDir(staging, storage.packDirUri(pack.id));
    installed.push(pack.id);
  }
  return installed;
}
