/** Timing rules shared by the animated editor and the native encoder (spec §7). Keep in sync with Timeline.kt. */
export type Playback = 'normal' | 'reverse' | 'boomerang';

export const MAX_EFFECTIVE_DURATION_MS = 10_000;
export const AUTO_FPS_CAP = 20;

export interface EffectiveDurationInput {
  trimStartMs: number;
  trimEndMs: number;
  speed: number;
  playback: Playback;
}

/** (trimEnd − trimStart) ÷ speed × (boomerang ? 2 : 1), in ms. */
export function effectiveDurationMs({ trimStartMs, trimEndMs, speed, playback }: EffectiveDurationInput): number {
  const windowMs = Math.max(0, trimEndMs - trimStartMs);
  return (windowMs / speed) * (playback === 'boomerang' ? 2 : 1);
}

/** True when encodeAnimated accepts the timing (≤ 10 s); the editor blocks "Encode" otherwise. */
export function isWithinDurationLimit(input: EffectiveDurationInput): boolean {
  return effectiveDurationMs(input) <= MAX_EFFECTIVE_DURATION_MS;
}

/** What fps 'auto' resolves to for a probe() fps: rounded, capped at 20, at least 1; unknown rates use the cap. */
export function resolveAutoFps(sourceFps: number): number {
  if (!Number.isFinite(sourceFps) || sourceFps <= 0) return AUTO_FPS_CAP;
  return Math.min(AUTO_FPS_CAP, Math.max(1, Math.round(sourceFps)));
}
