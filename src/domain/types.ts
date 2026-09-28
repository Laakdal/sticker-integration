export type PackOrigin = 'user' | 'imported';

export interface Sticker {
  id: string;
  /** File name inside the pack folder, e.g. `<id>.webp`. */
  file: string;
  /** 1–3 emojis; each array element is one (possibly composite) emoji. */
  emojis: string[];
  accessibilityText?: string;
  animated: boolean;
  sizeBytes: number;
  /** True when `.src/<id>/` holds editor sources for re-editing. */
  editable: boolean;
}

export interface Pack {
  /** 1–128 chars of [A-Za-z0-9_.-]; also the WhatsApp identifier. */
  id: string;
  name: string;
  publisher: string;
  trayIcon: string;
  /** Fixed by the first sticker; every sticker must match. */
  animated: boolean;
  stickers: Sticker[];
  imageDataVersion: number;
  avoidCache: boolean;
  publisherEmail?: string;
  publisherWebsite?: string;
  privacyPolicyWebsite?: string;
  licenseAgreementWebsite?: string;
  origin: PackOrigin;
  createdAt: string;
  updatedAt: string;
}

/** Facts about an image file, as returned by the native `inspect()` (Plan 2). */
export interface InspectResult {
  width: number;
  height: number;
  animated: boolean;
  frameCount: number;
  frameDurationsMs: number[];
  sizeBytes: number;
  format: string;
}

export interface TrayFacts {
  sizeBytes: number;
  width?: number;
  height?: number;
}
