import { runBootstrap } from '@/services/bootstrap';

function deps(overrides: Partial<Parameters<typeof runBootstrap>[0]> = {}) {
  const calls: string[] = [];
  return {
    calls,
    value: {
      installedVersion: 0,
      targetVersion: 1,
      install: async () => void calls.push('install'),
      markInstalled: (v: number) => void calls.push(`mark:${v}`),
      loadPacks: async () => void calls.push('load'),
      ...overrides,
    },
  };
}

describe('runBootstrap', () => {
  it('installs bundled packs when outdated, then loads', async () => {
    const { calls, value } = deps();
    expect(await runBootstrap(value)).toEqual({ installError: null, loadError: null });
    expect(calls).toEqual(['install', 'mark:1', 'load']);
  });

  it('skips installation when up to date', async () => {
    const { calls, value } = deps({ installedVersion: 1 });
    await runBootstrap(value);
    expect(calls).toEqual(['load']);
  });

  it('still loads packs when installation fails, and does not mark it installed', async () => {
    const { calls, value } = deps({
      install: async () => {
        throw new Error('disk full');
      },
    });
    const result = await runBootstrap(value);
    expect(result.installError?.message).toBe('disk full');
    expect(calls).toEqual(['load']);
  });
});

describe('runBootstrap load failures', () => {
  it('reports a loadPacks failure instead of rejecting', async () => {
    const { value } = deps({
      loadPacks: async () => {
        throw new Error('storage unreadable');
      },
    });
    const result = await runBootstrap(value);
    expect(result.loadError?.message).toBe('storage unreadable');
    expect(result.installError).toBeNull();
  });

  it('wraps non-Error load failures', async () => {
    const { value } = deps({ loadPacks: () => Promise.reject('boom') });
    expect((await runBootstrap(value)).loadError?.message).toBe('boom');
  });
});
