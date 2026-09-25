import { useCallback, useEffect, useRef, useState } from 'react';

import type { Pack } from '@/domain/types';
import type { PackDetailsPatch } from '@/store/createPacksStore';

export type DetailsField = 'name' | 'publisher';
type Details = Record<DetailsField, string>;

export const DETAILS_FIELDS: readonly DetailsField[] = ['name', 'publisher'];
export const DETAILS_COMMIT_DELAY_MS = 400;

const detailsOf = (pack: Pack): Details => ({ name: pack.name, publisher: pack.publisher });

/**
 * Local draft of a pack's name/author. Edits are committed (trimmed, only when changed)
 * `DETAILS_COMMIT_DELAY_MS` after typing stops, immediately on blur or `flush()`, and on unmount.
 * Canonical changes from the store are taken per field, and only for a field the user is not editing,
 * so a save round-trip never overwrites in-progress typing.
 */
export function usePackDetailsDraft(pack: Pack, onSave: (patch: PackDetailsPatch) => unknown) {
  const [values, setValues] = useState<Details>(() => detailsOf(pack));
  const [synced, setSynced] = useState<Details>(() => detailsOf(pack));
  const [focused, setFocused] = useState<DetailsField | null>(null);
  const [pending, setPending] = useState<ReadonlySet<DetailsField>>(() => new Set());

  // Adjust local state when the canonical details change, during render (no effect needed).
  if (pack.name !== synced.name || pack.publisher !== synced.publisher) {
    const next = { ...values };
    for (const field of DETAILS_FIELDS) {
      const editing = field === focused || pending.has(field);
      if (pack[field] !== synced[field] && !editing) next[field] = pack[field];
    }
    setSynced(detailsOf(pack));
    setValues(next);
  }

  // Timers and the unmount flush run outside render, so they read the latest values through a ref.
  const latest = useRef({ values, pack, onSave });
  useEffect(() => {
    latest.current = { values, pack, onSave };
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async (): Promise<void> => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const { values: current, pack: canonical, onSave: save } = latest.current;
    const patch: PackDetailsPatch = {};
    for (const field of DETAILS_FIELDS) {
      const trimmed = current[field].trim();
      if (trimmed !== canonical[field]) patch[field] = trimmed;
    }
    setPending(new Set());
    if (Object.keys(patch).length > 0) await save(patch);
  }, []);

  useEffect(
    () => () => {
      void flush();
    },
    [flush],
  );

  const change = useCallback(
    (field: DetailsField, text: string) => {
      setValues((v) => ({ ...v, [field]: text }));
      latest.current = { ...latest.current, values: { ...latest.current.values, [field]: text } };
      setPending((p) => new Set(p).add(field));
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), DETAILS_COMMIT_DELAY_MS);
    },
    [flush],
  );

  const focus = useCallback((field: DetailsField) => setFocused(field), []);

  const blur = useCallback(
    (field: DetailsField) => {
      setFocused((f) => (f === field ? null : f));
      setValues((v) => ({ ...v, [field]: v[field].trim() }));
      void flush();
    },
    [flush],
  );

  return { values, change, focus, blur, flush };
}
