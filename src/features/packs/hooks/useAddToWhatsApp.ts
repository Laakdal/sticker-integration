import { useCallback, useRef, useState } from 'react';

import type { Pack } from '@/domain/types';
import type { ValidationIssue } from '@/services/validation';
import { addToWhatsApp } from '@modules/sticker-provider';

import { describeAddResult } from '../whatsappStatus';

export function useAddToWhatsApp(pack: Pack | undefined, issues: ValidationIssue[]) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const inFlight = useRef(false);

  const add = useCallback(async () => {
    if (!pack || inFlight.current) return;
    if (issues.length > 0) {
      setMessage(`Fix ${issues.length} ${issues.length === 1 ? 'issue' : 'issues'} before adding to WhatsApp.`);
      return;
    }
    inFlight.current = true;
    setPending(true);
    try {
      setMessage(describeAddResult(await addToWhatsApp(pack.id, pack.name)));
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
