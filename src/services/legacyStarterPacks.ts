import { joinPath, type FileStore } from './fs/FileStore';
import type { PackStorage } from './packStorage';

/** Pack folders that app versions with bundled starter packs copied into `packs/`. */
export const LEGACY_STARTER_PACK_IDS = ['bundled.starter-basics', 'bundled.starter-moves'] as const;
/** Staging folders those versions used while copying a starter pack (`.staging-<packId>`). */
const LEGACY_STAGING_PREFIX = '.staging-bundled.';

/**
 * Deletes the starter packs that older app versions installed, plus any interrupted install
 * leftovers. Their pack.json has `origin: 'bundled'`, which no longer parses, so this must run
 * before packs are loaded or they would be quarantined. Only these exact folders are touched,
 * and it is a no-op once they are gone, so it is safe to run on every launch.
 */
export async function removeLegacyStarterPacks(fs: FileStore, storage: PackStorage): Promise<void> {
  for (const id of LEGACY_STARTER_PACK_IDS) await storage.remove(id);
  for (const dirName of await fs.listDirs(storage.packsDirUri)) {
    if (dirName.startsWith(LEGACY_STAGING_PREFIX)) await fs.remove(joinPath(storage.packsDirUri, dirName));
  }
}
