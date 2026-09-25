import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { BUNDLED_PACKS_VERSION, bundledPacks } from '../../assets/bundled-packs';
import type { InspectResult, Pack } from '@/domain/types';
import { parsePack } from '@/services/packSchema';
import { validatePack, validateStickerFile } from '@/services/validation';

const root = join(__dirname, '..', '..', 'assets', 'bundled-packs');
const PACK_DIRS = ['starter-basics', 'starter-moves'];

function loadPack(dir: string): Pack {
  const pack = parsePack(JSON.parse(readFileSync(join(root, dir, 'pack.json'), 'utf8')));
  if (!pack) throw new Error(`${dir}/pack.json does not parse`);
  return pack;
}

function pngSize(file: string) {
  const b = readFileSync(file);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

/** Walks a WebP file's RIFF chunks: canvas size, animation flag and per-frame durations. */
function webpFacts(file: string): InspectResult {
  const b = readFileSync(file);
  expect(b.toString('ascii', 0, 4)).toBe('RIFF');
  expect(b.toString('ascii', 8, 12)).toBe('WEBP');
  let width = 0;
  let height = 0;
  let animated = false;
  const durations: number[] = [];
  for (let offset = 12; offset + 8 <= b.length; ) {
    const tag = b.toString('ascii', offset, offset + 4);
    const size = b.readUInt32LE(offset + 4);
    const data = offset + 8;
    if (tag === 'VP8X') {
      animated = (b.readUInt8(data) & 0x02) !== 0;
      width = b.readUIntLE(data + 4, 3) + 1;
      height = b.readUIntLE(data + 7, 3) + 1;
    } else if (tag === 'VP8 ' && width === 0) {
      width = b.readUInt16LE(data + 6) & 0x3fff;
      height = b.readUInt16LE(data + 8) & 0x3fff;
    } else if (tag === 'VP8L' && width === 0) {
      const bits = b.readUInt32LE(data + 1);
      width = (bits & 0x3fff) + 1;
      height = ((bits >> 14) & 0x3fff) + 1;
    } else if (tag === 'ANMF') {
      durations.push(b.readUIntLE(data + 12, 3));
    }
    offset = data + size + (size % 2);
  }
  return {
    width,
    height,
    animated,
    frameCount: animated ? durations.length : 1,
    frameDurationsMs: animated ? durations : [],
    sizeBytes: b.length,
    format: 'webp',
  };
}

describe.each(PACK_DIRS)('bundled pack %s', (dir) => {
  const pack = loadPack(dir);

  it('is a valid bundled pack', () => {
    expect(pack.origin).toBe('bundled');
    const tray = join(root, dir, pack.trayIcon);
    expect(validatePack(pack, { sizeBytes: statSync(tray).size, ...pngSize(tray) })).toEqual([]);
  });

  it('ships sticker files that pass WhatsApp file validation and match pack.json', () => {
    for (const sticker of pack.stickers) {
      const facts = webpFacts(join(root, dir, sticker.file));
      expect(validateStickerFile(facts, pack.animated)).toEqual([]);
      expect(facts.sizeBytes).toBe(sticker.sizeBytes);
      expect(facts.animated).toBe(sticker.animated);
    }
  });

  it('derives imageDataVersion from BUNDLED_PACKS_VERSION so installed apps re-copy it after a bump', () => {
    expect(pack.imageDataVersion).toBe(BUNDLED_PACKS_VERSION);
  });
});

describe('bundled manifest', () => {
  it('includes an animated starter pack with at least 3 stickers', () => {
    const moves = loadPack('starter-moves');
    expect(moves.animated).toBe(true);
    expect(moves.stickers.length).toBeGreaterThanOrEqual(3);
  });

  it('lists both packs, each pinned to BUNDLED_PACKS_VERSION', () => {
    const ids = bundledPacks.map((source) => parsePack(source.pack)?.id);
    expect(ids).toEqual(expect.arrayContaining(['bundled.starter-basics', 'bundled.starter-moves']));
    for (const source of bundledPacks) {
      expect(parsePack(source.pack)?.imageDataVersion).toBe(BUNDLED_PACKS_VERSION);
    }
  });
});
