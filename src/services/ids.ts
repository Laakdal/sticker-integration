import { randomUUID } from 'expo-crypto';

/** Pack and sticker ids: UUID v4 — satisfies the WhatsApp identifier pattern. */
export function newId(): string {
  return randomUUID();
}
