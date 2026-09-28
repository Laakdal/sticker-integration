import type { GifProviderId } from '@/store/createSettingsStore';

/**
 * The API key compiled in from `.env` for a provider ('' when absent). Each variable is read
 * by its literal name so Expo can inline it into the bundle.
 */
export function envGifApiKey(provider: GifProviderId): string {
  const key = provider === 'klipy' ? process.env.EXPO_PUBLIC_KLIPY_API_KEY : process.env.EXPO_PUBLIC_GIPHY_API_KEY;
  return key?.trim() ?? '';
}
