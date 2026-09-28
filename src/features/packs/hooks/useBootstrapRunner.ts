import { useCallback, useEffect, useState } from 'react';

import { toError, type BootstrapResult } from '@/services/bootstrap';

export interface BootstrapState extends BootstrapResult {
  ready: boolean;
  retry: () => void;
}

/**
 * Runs `run` on mount and again on each `retry()`; `ready` is false while an attempt is in flight.
 * `run` must be a stable function (module-level or memoised) — a new identity starts a new attempt.
 */
export function useBootstrapRunner(run: () => Promise<BootstrapResult>): BootstrapState {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<(BootstrapResult & { attempt: number }) | null>(null);

  useEffect(() => {
    let cancelled = false;
    run()
      .catch((e: unknown): BootstrapResult => ({ loadError: toError(e) }))
      .then((result) => {
        if (!cancelled) setSettled({ ...result, attempt });
      });
    return () => {
      cancelled = true;
    };
  }, [run, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  const ready = settled?.attempt === attempt;
  return {
    ready,
    loadError: ready ? settled.loadError : null,
    retry,
  };
}
