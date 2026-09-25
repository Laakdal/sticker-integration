import type { Pack } from '@/domain/types';
import { usePacksStore } from '@/store/packsStore';

export function usePack(packId: string): Pack | undefined {
  return usePacksStore((s) => s.packs[packId]);
}
