import { useCallback, useRef, useState } from 'react';

import type { Pack } from '@/domain/types';
import type { ValidationIssue } from '@/services/validation';
import { addToWhatsApp } from '@modules/sticker-provider';

import { describeAddResult } from '../whatsappStatus';

const issuesMessage = (count: number) => `Fix ${count} ${count === 1 ? 'issue' : 'issues'} before adding to WhatsApp.`;

export function useAddToWhatsApp(pack: Pack | undefined, issues: ValidationIssue[]) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const inFlight = useRef(false);

  /** `force` re-sends the pack even when every installed WhatsApp already has it (Update). */
  const add = useCallback(async ({ force = false }: { force?: boolean } = {}) => {
    if (!pack || inFlight.current) return;
    if (issues.length > 0) {
      setMessage(issuesMessage(issues.length));
      return;
    }
    inFlight.current = true;
    setPending(true);
    try {
      setMessage(describeAddResult(await addToWhatsApp(pack.id, pack.name, { force }), force));
    } catch (e) {
      const code = (e as { code?: string }).code;
      setMessage(code === 'BUSY' ? 'WhatsApp is already open for another pack.' : `Could not open WhatsApp: ${(e as Error).message}`);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }, [pack, issues]);

  return { add, pending, message, clearMessage: () => setMessage(null) };
}
