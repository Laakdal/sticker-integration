import { runBootstrap } from '@/services/bootstrap';

describe('runBootstrap', () => {
  it('loads packs', async () => {
    const loadPacks = jest.fn().mockResolvedValue(undefined);
    expect(await runBootstrap({ loadPacks })).toEqual({ loadError: null });
    expect(loadPacks).toHaveBeenCalledTimes(1);
  });

  it('reports a loadPacks failure instead of rejecting', async () => {
    const result = await runBootstrap({
      loadPacks: async () => {
        throw new Error('storage unreadable');
      },
    });
    expect(result.loadError?.message).toBe('storage unreadable');
  });

  it('wraps non-Error load failures', async () => {
    expect((await runBootstrap({ loadPacks: () => Promise.reject('boom') })).loadError?.message).toBe('boom');
  });
});
