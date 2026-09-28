import { create } from 'zustand';

import { LIMITS } from '@/domain/limits';
import type { Pack, Sticker } from '@/domain/types';
import { TRAY_FILE, type PackStorage } from '@/services/packStorage';

export type PackDetailsPatch = Partial<
  Pick<Pack, 'name' | 'publisher' | 'publisherEmail' | 'publisherWebsite' | 'privacyPolicyWebsite' | 'licenseAgreementWebsite'>
>;
export type StickerPatch = Partial<Pick<Sticker, 'emojis' | 'accessibilityText'>>;

export class PackNotFoundError extends Error {
  constructor(packId: string) {
    super(`Pack not found: ${packId}`);
    this.name = 'PackNotFoundError';
  }
}
export class PackFullError extends Error {
  constructor() {
    super(`A pack can hold at most ${LIMITS.maxStickers} stickers.`);
    this.name = 'PackFullError';
  }
}
export class PackTypeMismatchError extends Error {
  constructor(packAnimated: boolean) {
    super(packAnimated ? 'This pack is animated; add animated stickers only.' : 'This pack is static; add static stickers only.');
    this.name = 'PackTypeMismatchError';
  }
}

export interface PacksDeps {
  storage: PackStorage;
  newId: () => string;
  now: () => Date;
}

export interface PacksState {
  packs: Record<string, Pack>;
  quarantined: string[];
  loaded: boolean;
  load(): Promise<void>;
  createPack(input: { name: string; publisher: string }): Promise<Pack>;
  updateDetails(packId: string, patch: PackDetailsPatch): Promise<void>;
  addSticker(packId: string, sticker: Sticker): Promise<void>;
  updateSticker(packId: string, stickerId: string, patch: StickerPatch): Promise<void>;
  removeSticker(packId: string, stickerId: string): Promise<void>;
  reorderStickers(packId: string, orderedIds: string[]): Promise<void>;
  /** Call after `tray.png` was replaced on disk so WhatsApp refreshes it. */
  touchTray(packId: string): Promise<void>;
  deletePack(packId: string): Promise<void>;
}

export function createPacksStore({ storage, newId, now }: PacksDeps) {
  /** Per-pack promise chain: mutations of one pack run strictly in call order. */
  const queues = new Map<string, Promise<unknown>>();
  function enqueue<T>(packId: string, task: () => Promise<T>): Promise<T> {
    const previous = queues.get(packId) ?? Promise.resolve();
    const run = previous.catch(() => undefined).then(task);
    queues.set(packId, run);
    return run;
  }

  return create<PacksState>()((set, get) => {
    function requirePack(packId: string): Pack {
      const pack = get().packs[packId];
      if (!pack) throw new PackNotFoundError(packId);
      return pack;
    }

    /** Applies `mutate` to the latest state of the pack, saves it, then publishes it. */
    function commit(packId: string, mutate: (pack: Pack) => Pack): Promise<Pack> {
      return enqueue(packId, async () => {
        const current = requirePack(packId);
        const next: Pack = {
          ...mutate(current),
          imageDataVersion: current.imageDataVersion + 1,
          updatedAt: now().toISOString(),
        };
        await storage.save(next);
        set((s) => ({ packs: { ...s.packs, [packId]: next } }));
        return next;
      });
    }

    return {
      packs: {},
      quarantined: [],
      loaded: false,

      async load() {
        const { packs, quarantined } = await storage.loadAll();
        set({ packs: Object.fromEntries(packs.map((p) => [p.id, p])), quarantined, loaded: true });
      },

      async createPack({ name, publisher }) {
        const timestamp = now().toISOString();
        const pack: Pack = {
          id: newId(),
          name,
          publisher,
          trayIcon: TRAY_FILE,
          animated: false,
          stickers: [],
          imageDataVersion: 1,
          avoidCache: false,
          origin: 'user',
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        await storage.save(pack);
        set((s) => ({ packs: { ...s.packs, [pack.id]: pack } }));
        return pack;
      },

      async updateDetails(packId, patch) {
        await commit(packId, (pack) => ({ ...pack, ...patch }));
      },

      async addSticker(packId, sticker) {
        await commit(packId, (pack) => {
          if (pack.stickers.length >= LIMITS.maxStickers) throw new PackFullError();
          if (pack.stickers.length > 0 && pack.animated !== sticker.animated) {
            throw new PackTypeMismatchError(pack.animated);
          }
          return { ...pack, animated: pack.stickers.length === 0 ? sticker.animated : pack.animated, stickers: [...pack.stickers, sticker] };
        });
      },

      async updateSticker(packId, stickerId, patch) {
        await commit(packId, (pack) => ({
          ...pack,
          stickers: pack.stickers.map((s) => (s.id === stickerId ? { ...s, ...patch } : s)),
        }));
      },

      async removeSticker(packId, stickerId) {
        let removed: Sticker | undefined;
        await commit(packId, (pack) => {
          removed = pack.stickers.find((s) => s.id === stickerId);
          return { ...pack, stickers: pack.stickers.filter((s) => s.id !== stickerId) };
        });
        if (removed) {
          await storage.removeFile(packId, removed.file);
          await storage.removeFile(packId, `.src/${removed.id}`);
        }
      },

      async reorderStickers(packId, orderedIds) {
        await commit(packId, (pack) => {
          const byId = new Map(pack.stickers.map((s) => [s.id, s]));
          const valid =
            orderedIds.length === pack.stickers.length &&
            new Set(orderedIds).size === orderedIds.length &&
            orderedIds.every((id) => byId.has(id));
          if (!valid) throw new Error('Invalid sticker order');
          return { ...pack, stickers: orderedIds.map((id) => byId.get(id)!) };
        });
      },

      async touchTray(packId) {
        await commit(packId, (pack) => pack);
      },

      async deletePack(packId) {
        requirePack(packId);
        await enqueue(packId, async () => {
          await storage.remove(packId);
          set((s) => {
            const { [packId]: _deleted, ...rest } = s.packs;
            return { packs: rest };
          });
        });
      },
    };
  });
}

export const selectMyPacks = (state: PacksState): Pack[] =>
  Object.values(state.packs).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
