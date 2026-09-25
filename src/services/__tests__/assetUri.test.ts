import { resolveLocalAssetUri, type DownloadableAsset } from '@/services/assetUri';

/** Mimics expo-asset: `downloadAsync` is a no-op once `downloaded` is true. */
function fakeAsset(init: Partial<DownloadableAsset>, downloadTo: string | null): DownloadableAsset & { downloads: number } {
  const asset = {
    uri: 'http://localhost:8081/assets/s1.webp',
    localUri: null as string | null,
    downloaded: false,
    downloads: 0,
    ...init,
    async downloadAsync() {
      if (asset.downloaded) return asset;
      asset.downloads += 1;
      asset.localUri = downloadTo;
      asset.downloaded = true;
      return asset;
    },
  };
  return asset;
}

describe('resolveLocalAssetUri', () => {
  it('returns an already-local file:// URI without downloading', async () => {
    const asset = fakeAsset({ localUri: 'file:///cache/s1.webp', downloaded: true }, null);
    expect(await resolveLocalAssetUri(asset)).toBe('file:///cache/s1.webp');
    expect(asset.downloads).toBe(0);
  });

  it('downloads a Metro (http) asset to a local file', async () => {
    const asset = fakeAsset({}, 'file:///cache/ExponentAsset-abc.webp');
    expect(await resolveLocalAssetUri(asset)).toBe('file:///cache/ExponentAsset-abc.webp');
    expect(asset.downloads).toBe(1);
  });

  it('forces a copy for a scheme-less Android resource name that expo-asset marked as downloaded', async () => {
    const name = 'assets_bundledpacks_starterbasics_s1';
    const asset = fakeAsset({ uri: name, localUri: name, downloaded: true }, 'file:///cache/ExponentAsset-def.webp');
    expect(await resolveLocalAssetUri(asset)).toBe('file:///cache/ExponentAsset-def.webp');
    expect(asset.downloads).toBe(1);
  });

  it('fails when the download yields no local URI', async () => {
    const asset = fakeAsset({}, null);
    await expect(resolveLocalAssetUri(asset)).rejects.toThrow('has no local URI');
  });

  it('fails when the download still yields a non-file URI', async () => {
    const asset = fakeAsset({}, 'assets_still_a_resource');
    await expect(resolveLocalAssetUri(asset)).rejects.toThrow('not a local file');
  });
});
