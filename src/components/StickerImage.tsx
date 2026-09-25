import { Image } from 'expo-image';

interface Props {
  uri: string;
  size: number;
  /** Changes whenever the file on disk may have changed (e.g. pack.imageDataVersion). */
  version?: number;
  /** Plays animated stickers; Plan 5 wires this to the reduce-motion setting. */
  animate?: boolean;
  accessibilityLabel?: string;
}

export function StickerImage({ uri, size, version = 0, animate = true, accessibilityLabel }: Props) {
  return (
    <Image
      source={{ uri, cacheKey: `${uri}#${version}` }}
      style={{ width: size, height: size }}
      contentFit="contain"
      autoplay={animate}
      cachePolicy="memory"
      recyclingKey={`${uri}#${version}`}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
