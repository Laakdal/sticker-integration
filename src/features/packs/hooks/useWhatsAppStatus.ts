import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { getWhatsAppStatus, type WhatsAppStatus } from '@modules/sticker-provider';

/** Re-queries WhatsApp whenever the screen gains focus or the pack changes. */
export function useWhatsAppStatus(packId: string, imageDataVersion: number) {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);

  const refresh = useCallback(() => {
    let active = true;
    getWhatsAppStatus(packId)
      .then((s) => active && setStatus(s))
      .catch(() => active && setStatus(null));
    return () => {
      active = false;
    };
    // imageDataVersion is a deliberate trigger: WhatsApp may need re-adding after edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packId, imageDataVersion]);

  useFocusEffect(refresh);
  return { status, refresh };
}
