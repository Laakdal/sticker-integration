import { useCallback, useEffect, useRef, useState } from 'react';

export const TEXT_DRAFT_COMMIT_DELAY_MS = 400;

/**
 * Local draft of a saved text setting. Edits are committed trimmed (only when changed)
 * `TEXT_DRAFT_COMMIT_DELAY_MS` after typing stops, immediately on blur, and on unmount.
 * A new saved value (e.g. the author changed from the "New pack" dialog) replaces the draft
 * unless the user is editing it.
 */
export function useTextDraft(value: string, onSave: (next: string) => void) {
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);
  const [focused, setFocused] = useState(false);
  const [pending, setPending] = useState(false);

  // Adjust the draft when the saved value changes, during render (no effect needed).
  if (value !== synced) {
    setSynced(value);
    if (!focused && !pending) setDraft(value);
  }

  // Timers and the unmount flush run outside render, so they read the latest values through a ref.
  const latest = useRef({ draft, value, onSave });
  useEffect(() => {
    latest.current = { draft, value, onSave };
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setPending(false);
    const { draft: current, value: saved, onSave: save } = latest.current;
    const trimmed = current.trim();
    if (trimmed !== saved) save(trimmed);
  }, []);

  useEffect(() => () => flush(), [flush]);

  const change = useCallback(
    (text: string) => {
      setDraft(text);
      latest.current = { ...latest.current, draft: text };
      setPending(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, TEXT_DRAFT_COMMIT_DELAY_MS);
    },
    [flush],
  );

  const focus = useCallback(() => setFocused(true), []);

  const blur = useCallback(() => {
    setFocused(false);
    setDraft((d) => d.trim());
    flush();
  }, [flush]);

  return { draft, change, focus, blur };
}
