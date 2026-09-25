import {
  isValidPackId,
  validatePack,
  validateSticker,
  validateStickerFile,
  type ValidationIssue,
} from '@/services/validation';
import type { InspectResult } from '@/domain/types';
import { makePack, makeSticker } from '@/test-utils/fixtures';

const goodTray = { sizeBytes: 10_000, width: 96, height: 96 };
const codes = (issues: ValidationIssue[]) => issues.map((i) => i.code);

describe('validatePack', () => {
  it('accepts a valid pack', () => {
    expect(validatePack(makePack(), goodTray)).toEqual([]);
  });

  it('requires at least 3 stickers', () => {
    const issues = validatePack(makePack({}, 2), goodTray);
    expect(codes(issues)).toEqual(['PACK_TOO_FEW_STICKERS']);
    expect(issues[0]?.message).toContain('2/3');
  });

  it('allows at most 30 stickers', () => {
    expect(validatePack(makePack({}, 30), goodTray)).toEqual([]);
    expect(codes(validatePack(makePack({}, 31), goodTray))).toEqual(['PACK_TOO_MANY_STICKERS']);
  });

  it('requires a name and publisher, trimmed', () => {
    expect(codes(validatePack(makePack({ name: '   ', publisher: '' }), goodTray))).toEqual([
      'PACK_NAME_REQUIRED',
      'PACK_PUBLISHER_REQUIRED',
    ]);
  });

  it('limits name and publisher to 128 characters', () => {
    const long = 'a'.repeat(129);
    expect(codes(validatePack(makePack({ name: long, publisher: long }), goodTray))).toEqual([
      'PACK_NAME_TOO_LONG',
      'PACK_PUBLISHER_TOO_LONG',
    ]);
    expect(validatePack(makePack({ name: 'a'.repeat(128) }), goodTray)).toEqual([]);
  });

  it('measures length in UTF-16 units like WhatsApp', () => {
    expect(validatePack(makePack({ name: '😀'.repeat(64) }), goodTray)).toEqual([]); // 128 units
    expect(codes(validatePack(makePack({ name: '😀'.repeat(65) }), goodTray))).toEqual(['PACK_NAME_TOO_LONG']);
  });

  it('rejects invalid ids', () => {
    expect(codes(validatePack(makePack({ id: 'my pack!' }), goodTray))).toEqual(['PACK_ID_INVALID']);
  });

  it('requires a tray icon within limits', () => {
    expect(codes(validatePack(makePack(), null))).toEqual(['TRAY_MISSING']);
    expect(codes(validatePack(makePack(), { sizeBytes: 51_201 }))).toEqual(['TRAY_TOO_LARGE']);
    expect(validatePack(makePack(), { sizeBytes: 51_200 })).toEqual([]);
    expect(codes(validatePack(makePack(), { sizeBytes: 100, width: 100, height: 100 }))).toEqual([
      'TRAY_WRONG_SIZE',
    ]);
  });

  it('validates optional links and email', () => {
    const pack = makePack({ publisherWebsite: 'ftp://x.com', publisherEmail: 'nope', privacyPolicyWebsite: 'https://ok.example/p' });
    expect(codes(validatePack(pack, goodTray))).toEqual(['URL_INVALID', 'EMAIL_INVALID']);
  });

  it('reports sticker issues with the sticker id', () => {
    const bad = makeSticker({ id: 'bad', emojis: [] });
    const pack = makePack();
    pack.stickers.push(bad);
    const issues = validatePack(pack, goodTray);
    expect(issues).toEqual([expect.objectContaining({ code: 'STICKER_EMOJI_REQUIRED', stickerId: 'bad' })]);
  });
});

describe('validateSticker', () => {
  it('rejects a type mismatch with the pack', () => {
    expect(codes(validateSticker(makeSticker({ animated: true, sizeBytes: 1000 }), false))).toEqual([
      'STICKER_TYPE_MISMATCH',
    ]);
  });

  it('enforces size limits by type (KB = 1024 bytes)', () => {
    expect(validateSticker(makeSticker({ sizeBytes: 102_400 }), false)).toEqual([]);
    expect(codes(validateSticker(makeSticker({ sizeBytes: 102_401 }), false))).toEqual(['STICKER_TOO_LARGE']);
    expect(validateSticker(makeSticker({ animated: true, sizeBytes: 512_000 }), true)).toEqual([]);
    expect(codes(validateSticker(makeSticker({ animated: true, sizeBytes: 512_001 }), true))).toEqual([
      'STICKER_TOO_LARGE',
    ]);
  });

  it('requires 1–3 emojis', () => {
    expect(codes(validateSticker(makeSticker({ emojis: [] }), false))).toEqual(['STICKER_EMOJI_REQUIRED']);
    expect(codes(validateSticker(makeSticker({ emojis: ['😀', '😁', '😂', '🤣'] }), false))).toEqual([
      'STICKER_TOO_MANY_EMOJIS',
    ]);
  });

  it('counts composite emojis as one each', () => {
    expect(validateSticker(makeSticker({ emojis: ['👨‍👩‍👧', '👍🏽', '🇮🇩'] }), false)).toEqual([]);
  });

  it('limits accessibility text by type', () => {
    const text126 = 'a'.repeat(126);
    expect(codes(validateSticker(makeSticker({ accessibilityText: text126 }), false))).toEqual([
      'STICKER_A11Y_TOO_LONG',
    ]);
    expect(validateSticker(makeSticker({ animated: true, accessibilityText: text126 }), true)).toEqual([]);
    expect(
      codes(validateSticker(makeSticker({ animated: true, accessibilityText: 'a'.repeat(256) }), true)),
    ).toEqual(['STICKER_A11Y_TOO_LONG']);
  });
});

describe('validateStickerFile', () => {
  const staticFacts: InspectResult = {
    width: 512, height: 512, animated: false, frameCount: 1, frameDurationsMs: [], sizeBytes: 50_000, format: 'webp',
  };
  const animatedFacts: InspectResult = {
    width: 512, height: 512, animated: true, frameCount: 3, frameDurationsMs: [100, 100, 100], sizeBytes: 300_000, format: 'webp',
  };

  it('accepts compliant files', () => {
    expect(validateStickerFile(staticFacts, false)).toEqual([]);
    expect(validateStickerFile(animatedFacts, true)).toEqual([]);
  });

  it('rejects wrong format, dimensions and size', () => {
    expect(codes(validateStickerFile({ ...staticFacts, format: 'png' }, false))).toEqual(['FILE_WRONG_FORMAT']);
    expect(codes(validateStickerFile({ ...staticFacts, width: 500 }, false))).toEqual(['FILE_WRONG_DIMENSIONS']);
    expect(codes(validateStickerFile({ ...staticFacts, sizeBytes: 102_401 }, false))).toEqual(['FILE_TOO_LARGE']);
  });

  it('rejects type mismatch', () => {
    expect(codes(validateStickerFile(animatedFacts, false))).toEqual(['FILE_TYPE_MISMATCH']);
  });

  it('enforces frame timing rules', () => {
    expect(codes(validateStickerFile({ ...animatedFacts, frameDurationsMs: [5, 100] }, true))).toEqual([
      'FRAME_TOO_SHORT',
    ]);
    expect(
      codes(validateStickerFile({ ...animatedFacts, frameDurationsMs: [5000, 5001] }, true)),
    ).toEqual(['ANIMATION_TOO_LONG']);
  });
});

describe('isValidPackId', () => {
  it('matches the WhatsApp identifier pattern', () => {
    expect(isValidPackId('abc_1.2-3')).toBe(true);
    expect(isValidPackId('')).toBe(false);
    expect(isValidPackId('a'.repeat(129))).toBe(false);
    expect(isValidPackId('a/b')).toBe(false);
  });
});
