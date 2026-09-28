import { runBootstrap } from '@/services/bootstrap';
import { usePacksStore } from '@/store/packsStore';
import { useBootstrapRunner } from './useBootstrapRunner';

function bootstrapApp() {
  return runBootstrap({
    loadPacks: () => usePacksStore.getState().load(),
  });
}

/** Loads packs. Load errors block the app until `retry()` succeeds. */
export function useBootstrap() {
  return useBootstrapRunner(bootstrapApp);
}
