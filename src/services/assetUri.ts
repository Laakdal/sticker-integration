/** The slice of expo-asset's `Asset` that `resolveLocalAssetUri` relies on. */
export interface DownloadableAsset {
  uri: string;
  localUri: string | null;
  downloaded: boolean;
  downloadAsync(): Promise<unknown>;
}

const ANDROID_RES_PREFIX = 'file:///android_res/';

function isLocalFile(uri: string | null): uri is string {
  return !!uri && uri.startsWith('file://') && !uri.startsWith(ANDROID_RES_PREFIX);
}

/**
 * Returns a `file://` URI holding the asset's bytes, copying it into the cache when needed.
 *
 * In release builds (no expo-updates) expo-asset reports bundled images as already "downloaded"
 * with `localUri` set to a scheme-less Android drawable resource name, which file APIs cannot
 * read. Clearing that state makes `downloadAsync()` ask the native ExpoAsset module to copy the
 * resource into the cache directory, which yields a real `file://` URI.
 */
export async function resolveLocalAssetUri(asset: DownloadableAsset): Promise<string> {
  if (isLocalFile(asset.localUri)) return asset.localUri;
  if (asset.downloaded) {
    asset.downloaded = false;
    asset.localUri = null;
  }
  await asset.downloadAsync();
  if (!asset.localUri) throw new Error(`Asset ${asset.uri} has no local URI after download`);
  if (!isLocalFile(asset.localUri)) throw new Error(`Asset ${asset.uri} resolved to ${asset.localUri}, which is not a local file`);
  return asset.localUri;
}
