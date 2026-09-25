import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Pack, TrayFacts } from '@/domain/types';
import { validatePack } from '@/services/validation';
import { packStorage } from '@/store/packsStore';

interface TrayResult {
  key: string;
  facts: TrayFacts | null;
}

const trayKey = (pack: Pack) => `${pack.id}:${pack.trayIcon}:${pack.imageDataVersion}`;

export function usePackValidation(pack: Pack | undefined) {
  const [tray, setTray] = useState<TrayResult | null>(null);
  const key = pack ? trayKey(pack) : null;

  useEffect(() => {
    if (!pack) return;
    let active = true;
    const resolvedKey = trayKey(pack);
    packStorage.fileSize(pack.id, pack.trayIcon).then((size) => {
      if (!active) return;
      setTray({ key: resolvedKey, facts: size === null ? null : { sizeBytes: size } });
    });
    return () => {
      active = false;
    };
  }, [pack?.id, pack?.trayIcon, pack?.imageDataVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  // `loading` and the applicable tray facts are derived from whether the last resolved
  // fetch matches the current pack, rather than tracked with their own setState calls in
  // the effect body (which would trip react-hooks/set-state-in-effect for no benefit).
  const loading = key !== null && tray?.key !== key;
  const trayFacts = tray?.key === key ? tray.facts : null;
  const validate = useCallback((p: Pack) => validatePack(p, trayFacts), [trayFacts]);
  const issues = useMemo(() => (pack ? validate(pack) : []), [pack, validate]);
  return { issues, loading, validate };
}
