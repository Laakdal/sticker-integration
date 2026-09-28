import { act, renderHook } from '@testing-library/react-native';

import { useBootstrapRunner } from '@/features/packs/hooks/useBootstrapRunner';
import type { BootstrapResult } from '@/services/bootstrap';

function deferred() {
  let resolve: (value: BootstrapResult) => void = () => {};
  const promise = new Promise<BootstrapResult>((r) => (resolve = r));
  return { promise, resolve };
}

describe('useBootstrapRunner', () => {
  it('is not ready until the bootstrap settles', async () => {
    const pending = deferred();
    const run = () => pending.promise;
    const { result } = await renderHook(() => useBootstrapRunner(run));
    expect(result.current.ready).toBe(false);
    await act(async () => pending.resolve({ loadError: null }));
    expect(result.current).toMatchObject({ ready: true, loadError: null });
  });

  it('exposes a load error and recovers on retry', async () => {
    const first = deferred();
    const second = deferred();
    const run = jest.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result } = await renderHook(() => useBootstrapRunner(run));
    await act(async () => first.resolve({ loadError: new Error('storage unreadable') }));
    expect(result.current.ready).toBe(true);
    expect(result.current.loadError?.message).toBe('storage unreadable');

    await act(async () => result.current.retry());
    expect(run).toHaveBeenCalledTimes(2);
    expect(result.current.ready).toBe(false);

    await act(async () => second.resolve({ loadError: null }));
    expect(result.current).toMatchObject({ ready: true, loadError: null });
  });

  it('turns an unexpected rejection into a load error', async () => {
    const run = () => Promise.reject(new Error('crash'));
    const { result } = await renderHook(() => useBootstrapRunner(run));
    await act(async () => {});
    expect(result.current.ready).toBe(true);
    expect(result.current.loadError?.message).toBe('crash');
  });
});
