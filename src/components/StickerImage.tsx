import { Image } from 'expo-image';

import { useReduceMotion } from '@/store/settingsStore';

interface Props {
  uri: string;
  size: number;
  /** Changes whenever the file on disk may have changed (e.g. pack.imageDataVersion). */
  version?: number;
  /** Forces playback of animated stickers on or off; defaults to playing unless reduce motion is on. */
  animate?: boolean;
  accessibilityLabel?: string;
}

export function StickerImage({ uri, size, version = 0, animate, accessibilityLabel }: Props) {
  const reduceMotion = useReduceMotion();
  return (
    <Image
      source={{ uri, cacheKey: `${uri}#${version}` }}
      style={{ width: size, height: size }}
      contentFit="contain"
      autoplay={animate ?? !reduceMotion}
      cachePolicy="memory"
      recyclingKey={`${uri}#${version}`}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
