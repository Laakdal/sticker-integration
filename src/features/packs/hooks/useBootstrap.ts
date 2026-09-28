import { runBootstrap } from '@/services/bootstrap';
import { expoFileStore } from '@/services/fs/expoFileStore';
import { removeLegacyStarterPacks } from '@/services/legacyStarterPacks';
import { packStorage, usePacksStore } from '@/store/packsStore';
import { useBootstrapRunner } from './useBootstrapRunner';

function bootstrapApp() {
  return runBootstrap({
    cleanUp: () => removeLegacyStarterPacks(expoFileStore, packStorage),
    loadPacks: () => usePacksStore.getState().load(),
  });
}

/** Removes old starter packs, then loads packs. Load errors block the app until `retry()` succeeds. */
export function useBootstrap() {
  return useBootstrapRunner(bootstrapApp);
}
