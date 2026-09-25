import { effectiveDurationMs, isWithinDurationLimit, MAX_EFFECTIVE_DURATION_MS, resolveAutoFps } from '../timing';

const base = { trimStartMs: 1000, trimEndMs: 5000, speed: 1, playback: 'normal' as const };

describe('effectiveDurationMs', () => {
  it('divides the trim window by the speed', () => {
    expect(effectiveDurationMs(base)).toBe(4000);
    expect(effectiveDurationMs({ ...base, speed: 2 })).toBe(2000);
    expect(effectiveDurationMs({ ...base, speed: 0.5 })).toBe(8000);
    expect(effectiveDurationMs({ trimStartMs: 0, trimEndMs: 3000, speed: 0.75, playback: 'reverse' })).toBe(4000);
  });

  it('doubles for boomerang only', () => {
    expect(effectiveDurationMs({ ...base, playback: 'boomerang' })).toBe(8000);
    expect(effectiveDurationMs({ ...base, playback: 'reverse' })).toBe(4000);
  });

  it('treats an inverted window as empty', () => {
    expect(effectiveDurationMs({ ...base, trimEndMs: 500 })).toBe(0);
  });
});

describe('isWithinDurationLimit', () => {
  it('allows exactly 10 s and rejects anything longer', () => {
    expect(MAX_EFFECTIVE_DURATION_MS).toBe(10_000);
    expect(isWithinDurationLimit({ ...base, trimStartMs: 0, trimEndMs: 10_000 })).toBe(true);
    expect(isWithinDurationLimit({ ...base, trimStartMs: 0, trimEndMs: 10_001 })).toBe(false);
    expect(isWithinDurationLimit({ ...base, trimStartMs: 0, trimEndMs: 6_000, playback: 'boomerang' })).toBe(false);
    expect(isWithinDurationLimit({ ...base, trimStartMs: 0, trimEndMs: 12_000, speed: 2 })).toBe(true);
    expect(isWithinDurationLimit({ ...base, trimStartMs: 0, trimEndMs: 5_001, speed: 0.5 })).toBe(false);
  });
});

describe('resolveAutoFps', () => {
  it('is the source rate rounded, capped at 20, at least 1 (same as native)', () => {
    expect(resolveAutoFps(30)).toBe(20);
    expect(resolveAutoFps(10)).toBe(10);
    expect(resolveAutoFps(12.5)).toBe(13);
    expect(resolveAutoFps(12.49)).toBe(12);
    expect(resolveAutoFps(0.4)).toBe(1);
    expect(resolveAutoFps(0)).toBe(20);
    expect(resolveAutoFps(Number.NaN)).toBe(20);
  });
});
