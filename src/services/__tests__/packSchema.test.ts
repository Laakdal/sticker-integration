import { parsePack, serializePack } from '@/services/packSchema';
import { makePack } from '@/test-utils/fixtures';

describe('packSchema', () => {
  it('round-trips a pack', () => {
    const pack = makePack({ publisherWebsite: 'https://x.example', stickers: [] });
    expect(parsePack(JSON.parse(serializePack(pack)))).toEqual(pack);
  });

  it('keeps optional sticker fields', () => {
    const pack = makePack();
    pack.stickers[0]!.accessibilityText = 'waving cat';
    expect(parsePack(JSON.parse(serializePack(pack)))?.stickers[0]?.accessibilityText).toBe('waving cat');
  });

  it.each([
    ['not an object', 'x'],
    ['missing id', { ...makePack(), id: undefined }],
    ['bad origin', { ...makePack(), origin: 'stolen' }],
    ['the retired bundled origin', { ...makePack(), origin: 'bundled' }],
    ['stickers not an array', { ...makePack(), stickers: 'no' }],
    ['sticker without emojis array', { ...makePack(), stickers: [{ id: 'a', file: 'a.webp', animated: false, sizeBytes: 1, editable: false }] }],
    ['sticker file with a slash', { ...makePack(), stickers: [{ id: 'a', file: '../a.webp', emojis: ['😀'], animated: false, sizeBytes: 1, editable: false }] }],
  ])('rejects %s', (_label, raw) => {
    expect(parsePack(raw)).toBeNull();
  });
});
