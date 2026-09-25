import type { InspectResult as DomainInspectResult } from '@/domain/types';
import type { InspectResult as NativeInspectResult } from '@modules/webp-encoder';

// Compile-time check (tsc runs in `npm test`): the native inspect() result and the domain type are interchangeable.
const toDomain = (r: NativeInspectResult): DomainInspectResult => r;
const toNative = (r: DomainInspectResult): NativeInspectResult => r;

describe('webp-encoder types', () => {
  it('native InspectResult is interchangeable with the domain InspectResult', () => {
    const facts: NativeInspectResult = {
      width: 512,
      height: 512,
      animated: false,
      frameCount: 1,
      frameDurationsMs: [],
      sizeBytes: 1,
      format: 'webp',
    };
    expect(toNative(toDomain(facts))).toBe(facts);
  });
});
