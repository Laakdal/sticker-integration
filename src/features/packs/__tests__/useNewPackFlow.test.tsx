import { act, renderHook } from '@testing-library/react-native';

import type { Pack } from '@/domain/types';
import { useNewPackFlow } from '@/features/packs/hooks/useNewPackFlow';
import { makePack } from '@/test-utils/fixtures';

async function setup(createPack: (values: { name: string; publisher: string }) => Promise<Pack>, lastPublisher = '') {
  const setLastPublisher = jest.fn();
  const view = await renderHook(() => useNewPackFlow({ createPack, lastPublisher, setLastPublisher }));
  return { ...view, setLastPublisher };
}

describe('useNewPackFlow', () => {
  it('starts closed, opens and closes without creating anything', async () => {
    const createPack = jest.fn();
    const { result } = await setup(createPack);
    expect(result.current.visible).toBe(false);
    await act(async () => result.current.open());
    expect(result.current.visible).toBe(true);
    await act(async () => result.current.close());
    expect(result.current.visible).toBe(false);
    expect(createPack).not.toHaveBeenCalled();
  });

  it('exposes the last used publisher as the initial author', async () => {
    const { result } = await setup(jest.fn(), 'Jane');
    expect(result.current.initialPublisher).toBe('Jane');
  });

  it('creates the pack, remembers the author, and closes the dialog', async () => {
    const pack = makePack({ id: 'p1', name: 'Cats', publisher: 'Jane' });
    const createPack = jest.fn().mockResolvedValue(pack);
    const { result, setLastPublisher } = await setup(createPack);
    await act(async () => result.current.open());
    let created: Pack | undefined;
    await act(async () => {
      created = await result.current.create({ name: 'Cats', publisher: 'Jane' });
    });
    expect(createPack).toHaveBeenCalledWith({ name: 'Cats', publisher: 'Jane' });
    expect(setLastPublisher).toHaveBeenCalledWith('Jane');
    expect(result.current.visible).toBe(false);
    expect(created).toEqual(pack);
  });

  it('reports a failure without closing the dialog, and lets it be cleared', async () => {
    const createPack = jest.fn().mockRejectedValue(new Error('disk full'));
    const { result, setLastPublisher } = await setup(createPack);
    await act(async () => result.current.open());
    await act(async () => {
      await result.current.create({ name: 'Cats', publisher: 'Jane' });
    });
    expect(result.current.error).toBe('disk full');
    expect(result.current.visible).toBe(true);
    expect(setLastPublisher).not.toHaveBeenCalled();
    await act(async () => result.current.clearError());
    expect(result.current.error).toBeNull();
  });

  it('ignores a second create while one is in flight', async () => {
    let finish: (p: Pack) => void = () => {};
    const createPack = jest.fn(() => new Promise<Pack>((r) => (finish = r)));
    const { result } = await setup(createPack);
    await act(async () => {
      void result.current.create({ name: 'Cats', publisher: 'Jane' });
      void result.current.create({ name: 'Cats', publisher: 'Jane' });
    });
    expect(createPack).toHaveBeenCalledTimes(1);
    await act(async () => finish(makePack({ id: 'p1' })));
  });
});
