import { LIMITS, PACK_ID_PATTERN } from '@/domain/limits';
import type { InspectResult, Pack, Sticker, TrayFacts } from '@/domain/types';

export type ValidationCode =
  | 'PACK_TOO_FEW_STICKERS'
  | 'PACK_TOO_MANY_STICKERS'
  | 'PACK_ID_INVALID'
  | 'PACK_NAME_REQUIRED'
  | 'PACK_NAME_TOO_LONG'
  | 'PACK_PUBLISHER_REQUIRED'
  | 'PACK_PUBLISHER_TOO_LONG'
  | 'TRAY_MISSING'
  | 'TRAY_TOO_LARGE'
  | 'TRAY_WRONG_SIZE'
  | 'URL_INVALID'
  | 'EMAIL_INVALID'
  | 'STICKER_TYPE_MISMATCH'
  | 'STICKER_TOO_LARGE'
  | 'STICKER_EMOJI_REQUIRED'
  | 'STICKER_TOO_MANY_EMOJIS'
  | 'STICKER_A11Y_TOO_LONG'
  | 'FILE_WRONG_FORMAT'
  | 'FILE_WRONG_DIMENSIONS'
  | 'FILE_TOO_LARGE'
  | 'FILE_TYPE_MISMATCH'
  | 'FRAME_TOO_SHORT'
  | 'ANIMATION_TOO_LONG';

export interface ValidationIssue {
  code: ValidationCode;
  message: string;
  stickerId?: string;
}

const URL_PATTERN = /^https?:\/\/[^\s/$.?#][^\s]*$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const kb = (bytes: number) => `${Math.floor(bytes / 1024)} KB`;
const maxBytesFor = (animated: boolean) => (animated ? LIMITS.animatedMaxBytes : LIMITS.staticMaxBytes);

export function isValidPackId(id: string): boolean {
  return PACK_ID_PATTERN.test(id);
}

function checkText(
  issues: ValidationIssue[],
  value: string,
  label: string,
  requiredCode: ValidationCode,
  tooLongCode: ValidationCode,
) {
  if (value.trim().length === 0) {
    issues.push({ code: requiredCode, message: `${label} is required.` });
  } else if (value.length > LIMITS.maxTextLength) {
    issues.push({ code: tooLongCode, message: `${label} must be at most ${LIMITS.maxTextLength} characters.` });
  }
}

export function validatePack(pack: Pack, tray: TrayFacts | null): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const count = pack.stickers.length;

  if (count < LIMITS.minStickers) {
    issues.push({
      code: 'PACK_TOO_FEW_STICKERS',
      message: `Add at least ${LIMITS.minStickers} stickers (${count}/${LIMITS.minStickers}).`,
    });
  }
  if (count > LIMITS.maxStickers) {
    issues.push({
      code: 'PACK_TOO_MANY_STICKERS',
      message: `A pack can hold at most ${LIMITS.maxStickers} stickers (${count}/${LIMITS.maxStickers}).`,
    });
  }
  if (!isValidPackId(pack.id)) {
    issues.push({ code: 'PACK_ID_INVALID', message: 'Pack id may only contain letters, digits, _ . and -.' });
  }
  checkText(issues, pack.name, 'Pack name', 'PACK_NAME_REQUIRED', 'PACK_NAME_TOO_LONG');
  checkText(issues, pack.publisher, 'Author', 'PACK_PUBLISHER_REQUIRED', 'PACK_PUBLISHER_TOO_LONG');

  if (!tray) {
    issues.push({ code: 'TRAY_MISSING', message: 'Add a tray icon.' });
  } else {
    if (tray.sizeBytes > LIMITS.trayMaxBytes) {
      issues.push({ code: 'TRAY_TOO_LARGE', message: `Tray icon is ${kb(tray.sizeBytes)}; the limit is 50 KB.` });
    }
    if (
      tray.width !== undefined &&
      (tray.width !== LIMITS.trayDimension || tray.height !== LIMITS.trayDimension)
    ) {
      issues.push({ code: 'TRAY_WRONG_SIZE', message: 'Tray icon must be 96×96 pixels.' });
    }
  }

  for (const url of [pack.publisherWebsite, pack.privacyPolicyWebsite, pack.licenseAgreementWebsite]) {
    if (url && !URL_PATTERN.test(url)) {
      issues.push({ code: 'URL_INVALID', message: `"${url}" is not a valid http(s) link.` });
    }
  }
  if (pack.publisherEmail && !EMAIL_PATTERN.test(pack.publisherEmail)) {
    issues.push({ code: 'EMAIL_INVALID', message: `"${pack.publisherEmail}" is not a valid email.` });
  }

  for (const sticker of pack.stickers) {
    issues.push(...validateSticker(sticker, pack.animated));
  }
  return issues;
}

export function validateSticker(sticker: Sticker, packAnimated: boolean): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const stickerId = sticker.id;

  if (sticker.animated !== packAnimated) {
    issues.push({
      code: 'STICKER_TYPE_MISMATCH',
      stickerId,
      message: packAnimated
        ? 'This pack is animated; every sticker must be animated.'
        : 'This pack is static; every sticker must be static.',
    });
  }
  const maxBytes = maxBytesFor(sticker.animated);
  if (sticker.sizeBytes > maxBytes) {
    issues.push({
      code: 'STICKER_TOO_LARGE',
      stickerId,
      message: `Sticker is ${kb(sticker.sizeBytes)}; the limit is ${kb(maxBytes)}.`,
    });
  }
  if (sticker.emojis.length < LIMITS.minEmojis) {
    issues.push({ code: 'STICKER_EMOJI_REQUIRED', stickerId, message: 'Tag this sticker with at least one emoji.' });
  } else if (sticker.emojis.length > LIMITS.maxEmojis) {
    issues.push({ code: 'STICKER_TOO_MANY_EMOJIS', stickerId, message: 'A sticker can have at most 3 emojis.' });
  }
  const a11yMax = sticker.animated ? LIMITS.animatedA11yMaxLength : LIMITS.staticA11yMaxLength;
  if (sticker.accessibilityText && sticker.accessibilityText.length > a11yMax) {
    issues.push({
      code: 'STICKER_A11Y_TOO_LONG',
      stickerId,
      message: `Accessibility text must be at most ${a11yMax} characters.`,
    });
  }
  return issues;
}

export function validateStickerFile(facts: InspectResult, expectAnimated: boolean): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (facts.format !== 'webp') {
    issues.push({ code: 'FILE_WRONG_FORMAT', message: `Stickers must be WebP (got ${facts.format}).` });
  }
  if (facts.width !== LIMITS.stickerDimension || facts.height !== LIMITS.stickerDimension) {
    issues.push({ code: 'FILE_WRONG_DIMENSIONS', message: `Stickers must be 512×512 (got ${facts.width}×${facts.height}).` });
  }
  const maxBytes = maxBytesFor(facts.animated);
  if (facts.sizeBytes > maxBytes) {
    issues.push({ code: 'FILE_TOO_LARGE', message: `File is ${kb(facts.sizeBytes)}; the limit is ${kb(maxBytes)}.` });
  }
  if (facts.animated !== expectAnimated) {
    issues.push({ code: 'FILE_TYPE_MISMATCH', message: expectAnimated ? 'Expected an animated sticker.' : 'Expected a static sticker.' });
  }
  if (facts.animated) {
    if (facts.frameDurationsMs.some((d) => d < LIMITS.minFrameDurationMs)) {
      issues.push({ code: 'FRAME_TOO_SHORT', message: 'Every frame must last at least 8 ms.' });
    }
    const total = facts.frameDurationsMs.reduce((sum, d) => sum + d, 0);
    if (total > LIMITS.maxAnimationDurationMs) {
      issues.push({ code: 'ANIMATION_TOO_LONG', message: 'Animated stickers can last at most 10 seconds.' });
    }
  }
  return issues;
}
