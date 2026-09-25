import { Asset } from 'expo-asset';
import { useEffect, useState } from 'react';

import { bundledPacks, BUNDLED_PACKS_VERSION } from '../../../../assets/bundled-packs';
import { installBundledPacks } from '@/services/bundledPacks';
import { runBootstrap } from '@/services/bootstrap';
import { expoFileStore } from '@/services/fs/expoFileStore';
import { packStorage, usePacksStore } from '@/store/packsStore';
import { useSettingsStore } from '@/store/settingsStore';

async function resolveAssetUri(moduleId: number): Promise<string> {
  const asset = Asset.fromModule(moduleId);
  await asset.downloadAsync();
  if (!asset.localUri) throw new Error(`Asset ${moduleId} has no local URI`);
  return asset.localUri;
}

export function useBootstrap() {
  const [state, setState] = useState<{ ready: boolean; installError: Error | null }>({ ready: false, installError: null });

  useEffect(() => {
    const settings = useSettingsStore.getState();
    runBootstrap({
      installedVersion: settings.bundledPacksVersion,
      targetVersion: BUNDLED_PACKS_VERSION,
      install: () => installBundledPacks(bundledPacks, { fs: expoFileStore, storage: packStorage, resolveAssetUri }),
      markInstalled: (v) => settings.setSetting('bundledPacksVersion', v),
      loadPacks: () => usePacksStore.getState().load(),
    }).then(({ installError }) => setState({ ready: true, installError }));
  }, []);

  return state;
}
