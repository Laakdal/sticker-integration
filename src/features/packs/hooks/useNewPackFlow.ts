import { useCallback, useRef, useState } from 'react';

import type { Pack } from '@/domain/types';

import { useAsyncAction } from './useAsyncAction';

export interface NewPackValues {
  name: string;
  publisher: string;
}

export interface UseNewPackFlowOptions {
  createPack: (values: NewPackValues) => Promise<Pack>;
  /** The author last used to create a pack; offered as the dialog's default. */
  lastPublisher: string;
  setLastPublisher: (publisher: string) => void;
}

/**
 * Orchestrates the "New pack" dialog: tracks whether it's open, remembers the last author
 * used, and creates the pack (with double-tap protection) only once the user confirms.
 */
export function useNewPackFlow({ createPack, lastPublisher, setLastPublisher }: UseNewPackFlowOptions) {
  const [visible, setVisible] = useState(false);
  const pendingValues = useRef<NewPackValues | null>(null);

  const action = useAsyncAction(async () => {
    const values = pendingValues.current;
    if (!values) return undefined;
    return createPack(values);
  });
  const { run } = action;

  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);

  const create = useCallback(
    async (values: NewPackValues) => {
      pendingValues.current = values;
      const pack = await run();
      if (pack) {
        setLastPublisher(values.publisher);
        setVisible(false);
      }
      return pack;
    },
    [run, setLastPublisher],
  );

  return {
    visible,
    open,
    close,
    initialPublisher: lastPublisher,
    pending: action.pending,
    error: action.error,
    clearError: action.clearError,
    create,
  };
}
