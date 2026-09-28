import type { Pack, PackOrigin, Sticker } from '@/domain/types';

const ORIGINS: readonly PackOrigin[] = ['user', 'imported'];

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const optStr = (v: unknown): v is string | undefined => v === undefined || isStr(v);
/** A plain file name: no path separators and not `.`/`..`. */
const isFileName = (v: unknown): v is string => isStr(v) && v.length > 0 && !/[\\/]/.test(v) && v !== '.' && v !== '..';

function parseSticker(raw: unknown): Sticker | null {
  if (!isObj(raw)) return null;
  const { id, file, emojis, accessibilityText, animated, sizeBytes, editable } = raw;
  if (!isStr(id) || !isFileName(file) || !Array.isArray(emojis) || !emojis.every(isStr)) return null;
  if (!optStr(accessibilityText) || !isBool(animated) || !isNum(sizeBytes) || !isBool(editable)) return null;
  const sticker: Sticker = { id, file, emojis: [...emojis], animated, sizeBytes, editable };
  if (accessibilityText !== undefined) sticker.accessibilityText = accessibilityText;
  return sticker;
}

export function parsePack(raw: unknown): Pack | null {
  if (!isObj(raw)) return null;
  const r = raw;
  if (!isStr(r.id) || !isStr(r.name) || !isStr(r.publisher) || !isFileName(r.trayIcon)) return null;
  if (!isBool(r.animated) || !Array.isArray(r.stickers) || !isNum(r.imageDataVersion)) return null;
  if (!isBool(r.avoidCache) || !isStr(r.createdAt) || !isStr(r.updatedAt)) return null;
  if (!isStr(r.origin) || !ORIGINS.includes(r.origin as PackOrigin)) return null;
  const optional = ['publisherEmail', 'publisherWebsite', 'privacyPolicyWebsite', 'licenseAgreementWebsite'] as const;
  if (!optional.every((k) => optStr(r[k]))) return null;

  const stickers: Sticker[] = [];
  for (const s of r.stickers) {
    const sticker = parseSticker(s);
    if (!sticker) return null;
    stickers.push(sticker);
  }

  const pack: Pack = {
    id: r.id,
    name: r.name,
    publisher: r.publisher,
    trayIcon: r.trayIcon,
    animated: r.animated,
    stickers,
    imageDataVersion: r.imageDataVersion,
    avoidCache: r.avoidCache,
    origin: r.origin as PackOrigin,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
  for (const k of optional) {
    const value = r[k];
    if (isStr(value)) pack[k] = value;
  }
  return pack;
}

export function serializePack(pack: Pack): string {
  return JSON.stringify(pack, null, 2);
}
