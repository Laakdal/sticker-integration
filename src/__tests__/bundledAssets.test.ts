import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { parsePack } from '@/services/packSchema';
import { validatePack } from '@/services/validation';

const dir = join(__dirname, '..', '..', 'assets', 'bundled-packs', 'starter-basics');

function pngSize(file: string) {
  const b = readFileSync(file);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

function webpSize(file: string) {
  const b = readFileSync(file);
  expect(b.toString('ascii', 0, 4)).toBe('RIFF');
  expect(b.toString('ascii', 8, 12)).toBe('WEBP');
  const chunk = b.toString('ascii', 12, 16);
  if (chunk === 'VP8 ') return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
  if (chunk === 'VP8L') {
    const bits = b.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  // VP8X: 24-bit canvas width-1 / height-1 at offsets 24 and 27
  return { width: b.readUIntLE(24, 3) + 1, height: b.readUIntLE(27, 3) + 1 };
}

describe('bundled starter pack', () => {
  const pack = parsePack(JSON.parse(readFileSync(join(dir, 'pack.json'), 'utf8')));

  it('is a valid bundled pack', () => {
    expect(pack).not.toBeNull();
    expect(pack!.origin).toBe('bundled');
    const tray = { sizeBytes: statSync(join(dir, 'tray.png')).size, ...pngSize(join(dir, 'tray.png')) };
    expect(validatePack(pack!, tray)).toEqual([]);
  });

  it('ships 512×512 WebP stickers whose recorded sizes match the files', () => {
    for (const s of pack!.stickers) {
      const file = join(dir, s.file);
      expect(webpSize(file)).toEqual({ width: 512, height: 512 });
      expect(statSync(file).size).toBe(s.sizeBytes);
    }
  });
});
