// Animated starter pack "Starter Moves" (original artwork), rendered frame by frame with sharp (>= 0.34).
// Called by scripts/generate-bundled-packs.mjs.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

import { BUNDLED_PACKS_VERSION } from './version.mjs';

const PACK_ID = 'bundled.starter-moves';
const DIR = 'starter-moves';
const ANIMATED_MAX = 500 * 1024;
const TRAY_MAX = 50 * 1024;
const FRAMES = 12;
const FRAME_MS = 80;

const stickers = [
  { id: 'm1', word: 'YAY', color: '#FFB300', motion: 'bounce', emojis: ['🎉'], a11y: 'Yellow face bouncing and cheering yay' },
  { id: 'm2', word: 'LOL', color: '#43A047', motion: 'shake', emojis: ['😂'], a11y: 'Green face shaking with laughter' },
  { id: 'm3', word: 'HI', color: '#1E88E5', motion: 'tilt', emojis: ['👋'], a11y: 'Blue face tilting side to side saying hi' },
  { id: 'm4', word: 'WOW', color: '#8E24AA', motion: 'pulse', emojis: ['😮'], a11y: 'Purple face growing and shrinking saying wow' },
];

function transformFor(motion, frame) {
  const phase = (frame / FRAMES) * Math.PI * 2;
  switch (motion) {
    case 'bounce':
      return `translate(0 ${Math.round(-30 * Math.abs(Math.sin(phase)))})`;
    case 'shake':
      return `translate(${Math.round(18 * Math.sin(phase * 2))} 0)`;
    case 'tilt':
      return `rotate(${Math.round(12 * Math.sin(phase))} 256 226)`;
    default: {
      const scale = (1 + 0.08 * Math.sin(phase)).toFixed(3);
      return `translate(256 226) scale(${scale}) translate(-256 -226)`;
    }
  }
}

function frameSvg({ word, color }, transform) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <g transform="${transform}">
    <circle cx="256" cy="226" r="180" fill="#FFFFFF"/>
    <circle cx="256" cy="226" r="164" fill="${color}"/>
    <circle cx="200" cy="196" r="22" fill="#3E2723"/>
    <circle cx="312" cy="196" r="22" fill="#3E2723"/>
    <path d="M186 282 Q256 350 326 282" stroke="#3E2723" stroke-width="18" fill="none" stroke-linecap="round"/>
  </g>
  <text x="256" y="480" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900"
        font-size="104" fill="${color}" stroke="#FFFFFF" stroke-width="14" paint-order="stroke">${word}</text>
</svg>`;
}

async function encodeAnimated(sticker) {
  const frames = await Promise.all(
    Array.from({ length: FRAMES }, (_, k) =>
      sharp(Buffer.from(frameSvg(sticker, transformFor(sticker.motion, k)))).png().toBuffer(),
    ),
  );
  for (let quality = 80; quality >= 30; quality -= 10) {
    const buf = await sharp(frames, { join: { animated: true } })
      .webp({ quality, effort: 6, loop: 0, delay: Array(FRAMES).fill(FRAME_MS) })
      .toBuffer();
    if (buf.length <= ANIMATED_MAX) return buf;
  }
  throw new Error(`Could not fit ${sticker.id} under 500 KB`);
}

/** Writes assets/bundled-packs/starter-moves/{pack.json,tray.png,m1..m4.webp} and returns its manifest entry. */
export async function generateStarterMoves(root, timestamp) {
  const outDir = join(root, DIR);
  mkdirSync(outDir, { recursive: true });
  const packStickers = [];
  for (const s of stickers) {
    const buf = await encodeAnimated(s);
    writeFileSync(join(outDir, `${s.id}.webp`), buf);
    packStickers.push({
      id: s.id, file: `${s.id}.webp`, emojis: s.emojis, accessibilityText: s.a11y,
      animated: true, sizeBytes: buf.length, editable: false,
    });
  }
  const tray = await sharp(Buffer.from(frameSvg(stickers[0], transformFor('bounce', 0))))
    .resize(96, 96)
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
  if (tray.length > TRAY_MAX) throw new Error('Tray icon over 50 KB');
  writeFileSync(join(outDir, 'tray.png'), tray);
  const pack = {
    id: PACK_ID, name: 'Starter Moves', publisher: 'Sticker Maker', trayIcon: 'tray.png', animated: true,
    stickers: packStickers, imageDataVersion: BUNDLED_PACKS_VERSION, avoidCache: false, origin: 'bundled',
    createdAt: timestamp, updatedAt: timestamp,
  };
  writeFileSync(join(outDir, 'pack.json'), JSON.stringify(pack, null, 2));
  return { dir: DIR, files: ['tray.png', ...packStickers.map((s) => s.file)] };
}
