import type { Pack, Sticker } from '@/domain/types';

let counter = 0;

export function makeSticker(overrides: Partial<Sticker> = {}): Sticker {
  counter += 1;
  const id = overrides.id ?? `st${counter}`;
  return {
    id,
    file: `${id}.webp`,
    emojis: ['😀'],
    animated: false,
    sizeBytes: 20_000,
    editable: false,
    ...overrides,
  };
}

export function makePack(overrides: Partial<Pack> = {}, stickerCount = 3): Pack {
  const animated = overrides.animated ?? false;
  return {
    id: 'pack_1',
    name: 'My Pack',
    publisher: 'Me',
    trayIcon: 'tray.png',
    animated,
    stickers: Array.from({ length: stickerCount }, () => makeSticker({ animated })),
    imageDataVersion: 1,
    avoidCache: false,
    origin: 'user',
    createdAt: '2026-09-25T00:00:00.000Z',
    updatedAt: '2026-09-25T00:00:00.000Z',
    ...overrides,
  };
}
