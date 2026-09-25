import { NativeModule, requireNativeModule } from 'expo';

import type { Playback } from './src/timing';

export * from './src/timing';

export type SourceType = 'gif' | 'webp' | 'mp4';
export type Speed = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2;
export type Rotation = 0 | 90 | 180 | 270;
export type FrameMode = 'fill' | 'fit';
export type Priority = 'smooth' | 'sharp';

/** Normalized crop rectangle (0–1) in the source's rotated/flipped coordinates; must lie inside the source. */
export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * `encodeAnimated` options (spec §7). Transform order: rotate clockwise by `rotation`, then mirror (`flipH`
 * left↔right, `flipV` top↔bottom), then crop with `crop` and frame with `mode` onto 512×512.
 * `fps` is 'auto' (source rate, capped at 20) or a whole number 5–30. `jobId` must be unique per job.
 * Paths may be absolute paths or file:// URIs; `source` may also be a content:// URI.
 */
export interface EncodeAnimatedOptions {
  source: string;
  sourceType: SourceType;
  crop: CropRect;
  mode: FrameMode;
  trimStartMs: number;
  trimEndMs: number;
  speed: Speed;
  playback: Playback;
  rotation: Rotation;
  flipH: boolean;
  flipV: boolean;
  fps: 'auto' | number;
  priority: Priority;
  outPath: string;
  jobId: string;
}

export interface EncodeAnimatedResult {
  sizeBytes: number;
  frames: number;
  durationMs: number;
  quality: number;
  fps: number;
}

export interface ProbeResult {
  width: number;
  height: number;
  durationMs: number;
  fps: number;
  frameCount: number;
}

export interface EncodeStaticResult {
  sizeBytes: number;
  quality: number;
  lossless: boolean;
}

export interface TrayIconResult {
  sizeBytes: number;
}

/**
 * Facts about an image file. Must stay identical to `InspectResult` in src/domain/types.ts (Plan 1);
 * src/__tests__/webpEncoderTypes.test.ts checks both directions once both exist.
 */
export interface InspectResult {
  width: number;
  height: number;
  animated: boolean;
  frameCount: number;
  frameDurationsMs: number[];
  sizeBytes: number;
  format: string;
}

/** `pass` is 0 while decoding and 1, 2, … for each size-fitting encode pass. */
export interface ProgressEvent {
  jobId: string;
  stage: 'decode' | 'encode';
  pass: number;
  fraction: number;
}

/** `code` of a rejected promise. `CANCELLED` should be handled silently (spec §13). */
export const ERROR_CODES = [
  'DECODE_FAILED',
  'OUT_OF_MEMORY',
  'TOO_LARGE',
  'CANCELLED',
  'IO_ERROR',
  'INSUFFICIENT_STORAGE',
  'INVALID_OPTIONS',
] as const;
export type WebpEncoderErrorCode = (typeof ERROR_CODES)[number];

type WebpEncoderEvents = {
  onProgress: (event: ProgressEvent) => void;
};

declare class WebpEncoderNativeModule extends NativeModule<WebpEncoderEvents> {
  encodeAnimated(opts: EncodeAnimatedOptions): Promise<EncodeAnimatedResult>;
  probe(source: string, sourceType: SourceType): Promise<ProbeResult>;
  encodeStatic(inputPath: string, outPath: string): Promise<EncodeStaticResult>;
  makeTrayIcon(inputPath: string, outPath: string): Promise<TrayIconResult>;
  inspect(path: string): Promise<InspectResult>;
  cancel(jobId: string): void;
}

let nativeModule: WebpEncoderNativeModule | null = null;

/** Loaded on first use, so importing the pure helpers (e.g. in Jest) never needs the native module. */
function native(): WebpEncoderNativeModule {
  nativeModule ??= requireNativeModule<WebpEncoderNativeModule>('WebpEncoder');
  return nativeModule;
}

export function encodeAnimated(opts: EncodeAnimatedOptions): Promise<EncodeAnimatedResult> {
  return native().encodeAnimated(opts);
}

export function probe(source: string, sourceType: SourceType): Promise<ProbeResult> {
  return native().probe(source, sourceType);
}

export function encodeStatic(inputPath: string, outPath: string): Promise<EncodeStaticResult> {
  return native().encodeStatic(inputPath, outPath);
}

export function makeTrayIcon(inputPath: string, outPath: string): Promise<TrayIconResult> {
  return native().makeTrayIcon(inputPath, outPath);
}

export function inspect(path: string): Promise<InspectResult> {
  return native().inspect(path);
}

/**
 * Cancels a running or queued `encodeAnimated` job. `cancel()` itself returns void; the pending
 * `encodeAnimated` promise for that job id is what rejects, with code `CANCELLED`.
 */
export function cancel(jobId: string): void {
  native().cancel(jobId);
}

/** Subscribes to `onProgress` events of one job. Call `remove()` when the job settles. */
export function addProgressListener(jobId: string, listener: (event: ProgressEvent) => void): { remove(): void } {
  const subscription = native().addListener('onProgress', (event: ProgressEvent) => {
    if (event.jobId === jobId) listener(event);
  });
  return { remove: () => subscription.remove() };
}
