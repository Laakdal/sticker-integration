import { act, renderHook } from '@testing-library/react-native';

import { useAsyncAction } from '@/features/packs/hooks/useAsyncAction';

describe('useAsyncAction', () => {
  it('runs the task once while a call is in flight', async () => {
    let finish: (v: string) => void = () => {};
    const task = jest.fn(() => new Promise<string>((r) => (finish = r)));
    const { result } = await renderHook(() => useAsyncAction(task));
    let first: Promise<string | undefined> = Promise.resolve(undefined);
    let second: Promise<string | undefined> = Promise.resolve(undefined);
    await act(async () => {
      first = result.current.run();
      second = result.current.run();
    });
    expect(task).toHaveBeenCalledTimes(1);
    expect(result.current.pending).toBe(true);
    expect(await second).toBeUndefined();
    await act(async () => finish('done'));
    expect(await first).toBe('done');
    expect(result.current.pending).toBe(false);
  });

  it('reports a failure as an error message and allows another attempt', async () => {
    const task = jest.fn().mockRejectedValueOnce(new Error('disk full')).mockResolvedValueOnce('ok');
    const { result } = await renderHook(() => useAsyncAction(task));
    await act(async () => {
      expect(await result.current.run()).toBeUndefined();
    });
    expect(result.current.error).toBe('disk full');
    expect(result.current.pending).toBe(false);
    await act(async () => result.current.clearError());
    expect(result.current.error).toBeNull();
    await act(async () => {
      expect(await result.current.run()).toBe('ok');
    });
    expect(task).toHaveBeenCalledTimes(2);
  });
});
