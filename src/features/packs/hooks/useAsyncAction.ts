import { useCallback, useRef, useState } from 'react';

/**
 * Wraps an async task for a button: ignores calls while one is in flight (double taps),
 * exposes `pending` for disabling the control, and turns failures into an `error` message.
 * `run` resolves to the task's result, or `undefined` if it was skipped or failed.
 */
export function useAsyncAction<T>(task: () => Promise<T>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const run = useCallback(async (): Promise<T | undefined> => {
    if (inFlight.current) return undefined;
    inFlight.current = true;
    setPending(true);
    try {
      return await task();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return undefined;
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }, [task]);

  const clearError = useCallback(() => setError(null), []);
  return { run, pending, error, clearError };
}
