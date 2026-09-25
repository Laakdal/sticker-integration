import { Asset } from 'expo-asset';

import { bundledPacks, BUNDLED_PACKS_VERSION } from '../../../../assets/bundled-packs';
import { resolveLocalAssetUri } from '@/services/assetUri';
import { installBundledPacks } from '@/services/bundledPacks';
import { runBootstrap } from '@/services/bootstrap';
import { expoFileStore } from '@/services/fs/expoFileStore';
import { packStorage, usePacksStore } from '@/store/packsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useBootstrapRunner } from './useBootstrapRunner';

function resolveAssetUri(moduleId: number): Promise<string> {
  return resolveLocalAssetUri(Asset.fromModule(moduleId));
}

function bootstrapApp() {
  const settings = useSettingsStore.getState();
  return runBootstrap({
    installedVersion: settings.bundledPacksVersion,
    targetVersion: BUNDLED_PACKS_VERSION,
    install: () => installBundledPacks(bundledPacks, { fs: expoFileStore, storage: packStorage, resolveAssetUri }),
    markInstalled: (v) => settings.setSetting('bundledPacksVersion', v),
    loadPacks: () => usePacksStore.getState().load(),
  });
}

/** Installs bundled packs when outdated, then loads packs. Load errors block the app until `retry()` succeeds. */
export function useBootstrap() {
  return useBootstrapRunner(bootstrapApp);
}
