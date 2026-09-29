import { useCallback, useRef, useState } from 'react';

import type { Pack } from '@/domain/types';
import type { ValidationIssue } from '@/services/validation';
import { addToWhatsApp } from '@modules/sticker-provider';

import { describeAddResult } from '../whatsappStatus';

export interface AddToWhatsAppOptions {
  /** Commits pending edits; awaited before anything is sent to WhatsApp. */
  flush?: () => Promise<void>;
  /** Reads the committed pack after `flush` (the rendered `pack` may be stale by then). */
  readLatest?: () => Pack | undefined;
  /** Validates the committed pack; defaults to the `issues` passed to the hook. */
  validate?: (pack: Pack) => ValidationIssue[];
}

const issuesMessage = (count: number) => `Fix ${count} ${count === 1 ? 'issue' : 'issues'} before adding to WhatsApp.`;

export function useAddToWhatsApp(pack: Pack | undefined, issues: ValidationIssue[], options: AddToWhatsAppOptions = {}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const inFlight = useRef(false);
  const { flush, readLatest, validate } = options;

  /** `force` re-sends the pack even when every installed WhatsApp already has it (Update). */
  const add = useCallback(async ({ force = false }: { force?: boolean } = {}) => {
    if (!pack || inFlight.current) return;
    if (!flush && issues.length > 0) {
      setMessage(issuesMessage(issues.length));
      return;
    }
    inFlight.current = true;
    setPending(true);
    try {
      if (flush) {
        try {
          await flush();
        } catch (e) {
          setMessage(`Could not save your changes: ${(e as Error).message}`);
          return;
        }
      }
      const target = (flush && readLatest?.()) || pack;
      const targetIssues = validate ? validate(target) : issues;
      if (targetIssues.length > 0) {
        setMessage(issuesMessage(targetIssues.length));
        return;
      }
      setMessage(describeAddResult(await addToWhatsApp(target.id, target.name, { force }), force));
    } catch (e) {
      const code = (e as { code?: string }).code;
      setMessage(code === 'BUSY' ? 'WhatsApp is already open for another pack.' : `Could not open WhatsApp: ${(e as Error).message}`);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }, [pack, issues, flush, readLatest, validate]);

  return { add, pending, message, clearMessage: () => setMessage(null) };
}
