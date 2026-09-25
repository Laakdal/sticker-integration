// Renders the committed webp-encoder instrumented-test fixtures with sharp (needs sharp >= 0.34 for join.animated).
// Run: node scripts/generate-encoder-fixtures.mjs
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'modules', 'webp-encoder', 'android', 'src', 'androidTest', 'assets');
mkdirSync(out, { recursive: true });

const hex = (r, g, b) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;

async function animated(file, frames, format, options) {
  const pngs = await Promise.all(frames.map((s) => sharp(Buffer.from(s)).png().toBuffer()));
  const image = sharp(pngs, { join: { animated: true } });
  const buffer = await (format === 'gif' ? image.gif(options) : image.webp(options)).toBuffer();
  writeFileSync(join(out, file), buffer);
  const meta = await sharp(buffer, { animated: true }).metadata();
  console.log(`${file}: ${meta.width}x${meta.pageHeight}, ${meta.pages} frames, delays ${JSON.stringify(meta.delay)}, ${buffer.length} bytes`);
  return meta;
}

// 320×240, 12 × 100 ms, transparent background, opaque red 80×80 square moving right 20 px per frame.
await animated(
  'transparent.gif',
  Array.from({ length: 12 }, (_, k) => svg(320, 240, `<rect x="${20 + 20 * k}" y="80" width="80" height="80" fill="#FF0000"/>`)),
  'gif',
  { delay: Array(12).fill(100), loop: 0 },
);

// 160×120, 150 × 100 ms = 15 s, opaque, colour changes every frame (for the 10 s limit and speed tests).
await animated(
  'long.gif',
  Array.from({ length: 150 }, (_, k) =>
    svg(160, 120, `<rect width="160" height="120" fill="${hex((k * 37) % 256, (k * 73) % 256, (k * 151) % 256)}"/><circle cx="${10 + (k % 14) * 10}" cy="60" r="10" fill="#FFFFFF"/>`),
  ),
  'gif',
  { delay: Array(150).fill(100), loop: 0 },
);

// 256×256, 8 × 100 ms; frame k is solid grey 16 + 32k so frame order can be read back from pixels.
await animated(
  'sequence.webp',
  Array.from({ length: 8 }, (_, k) => {
    const v = 16 + 32 * k;
    return svg(256, 256, `<rect width="256" height="256" fill="${hex(v, v, v)}"/>`);
  }),
  'webp',
  { lossless: true, delay: Array(8).fill(100), loop: 0 },
);

// 300×200, 2 × 500 ms; quadrants TL red, TR green, BL blue, BR yellow (centre dot differs per frame).
await animated(
  'asymmetric.webp',
  [0, 1].map((k) =>
    svg(
      300,
      200,
      '<rect x="0" y="0" width="150" height="100" fill="#FF0000"/><rect x="150" y="0" width="150" height="100" fill="#00FF00"/>' +
        '<rect x="0" y="100" width="150" height="100" fill="#0000FF"/><rect x="150" y="100" width="150" height="100" fill="#FFFF00"/>' +
        `<circle cx="150" cy="100" r="6" fill="${k ? '#FFFFFF' : '#000000'}"/>`,
    ),
  ),
  'webp',
  { lossless: true, delay: [500, 500], loop: 0 },
);

// 64×64, 3 frames with 0 ms durations (players show these at 100 ms).
const zeroDelayFile = join(out, 'zero-delay.webp');
const zero = await animated(
  'zero-delay.webp',
  ['#FF0000', '#00FF00', '#0000FF'].map((c) => svg(64, 64, `<rect width="64" height="64" fill="${c}"/>`)),
  'webp',
  { lossless: true, delay: [0, 0, 0], loop: 0 },
);
if (!zero.delay || zero.delay.some((d) => d !== 0)) {
  // Ruling (T8/C5): sharp/libvips rewrote the 0 ms ANMF delays on write. Patch the RIFF bytes directly instead
  // of trusting sharp's own (possibly normalizing) metadata reader, then verify from the raw bytes.
  patchAnmfDurationsToZero(zeroDelayFile);
  const { frameCount, durationsMs } = readAnmfDurationsMs(zeroDelayFile);
  if (frameCount !== 3 || durationsMs.some((d) => d !== 0)) {
    throw new Error(
      `zero-delay.webp still has non-zero ANMF durations after patching: frameCount=${frameCount} durationsMs=${JSON.stringify(durationsMs)}`,
    );
  }
  console.log(`zero-delay.webp: patched ${frameCount} ANMF chunk(s) to 0 ms delay (byte-level verified)`);
}

/**
 * Walks the top-level RIFF chunks of [buffer], calling `visit(fourCc, payloadStart, size)` for each. Chunk
 * layout: 4-byte FourCC + 4-byte LE size + payload, padded to even length. The 12-byte `RIFF....WEBP` file
 * header (validated by callers) precedes the chunk list.
 */
function forEachRiffChunk(buffer, visit) {
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const fourCc = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const payloadStart = offset + 8;
    visit(fourCc, payloadStart, size);
    offset = payloadStart + size + (size % 2);
  }
}

/** Sets every ANMF chunk's 24-bit little-endian Duration field (payload offset 12..14) to 0. */
function patchAnmfDurationsToZero(file) {
  const buffer = readFileSync(file);
  if (buffer.length < 12 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') {
    throw new Error(`${file} is not a RIFF/WEBP file`);
  }
  let patched = 0;
  forEachRiffChunk(buffer, (fourCc, payloadStart) => {
    if (fourCc === 'ANMF') {
      buffer.writeUIntLE(0, payloadStart + 12, 3);
      patched++;
    }
  });
  if (patched === 0) throw new Error(`${file} has no ANMF chunks to patch`);
  writeFileSync(file, buffer);
}

/** Reads ANMF frame count and each frame's 24-bit LE Duration field directly from the RIFF bytes. */
function readAnmfDurationsMs(file) {
  const buffer = readFileSync(file);
  const durationsMs = [];
  forEachRiffChunk(buffer, (fourCc, payloadStart) => {
    if (fourCc === 'ANMF') durationsMs.push(buffer.readUIntLE(payloadStart + 12, 3));
  });
  return { frameCount: durationsMs.length, durationsMs };
}
