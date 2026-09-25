const KB = 1024;

export const LIMITS = {
  minStickers: 3,
  maxStickers: 30,
  maxTextLength: 128,
  stickerDimension: 512,
  trayDimension: 96,
  staticMaxBytes: 100 * KB,
  animatedMaxBytes: 500 * KB,
  trayMaxBytes: 50 * KB,
  minFrameDurationMs: 8,
  maxAnimationDurationMs: 10_000,
  minEmojis: 1,
  maxEmojis: 3,
  staticA11yMaxLength: 125,
  animatedA11yMaxLength: 255,
} as const;

export const PACK_ID_PATTERN = /^[A-Za-z0-9_.-]{1,128}$/;
