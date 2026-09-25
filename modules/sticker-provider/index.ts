import { requireNativeModule } from 'expo';

/** Why an add ended in `error`: WhatsApp missing, the launch failed, or WhatsApp rejected the pack. */
export type AddErrorReason = 'not_installed' | 'launch_failed' | 'validation';
export type AddResult = { status: 'added' | 'cancelled' | 'error'; message?: string; reason?: AddErrorReason };
export type AppStatus = { installed: boolean; added: boolean };
export type WhatsAppStatus = { consumer: AppStatus; business: AppStatus };

interface StickerProviderNative {
  addToWhatsApp(packId: string, name: string): Promise<AddResult>;
  getWhatsAppStatus(packId: string): Promise<WhatsAppStatus>;
}

const native = requireNativeModule<StickerProviderNative>('StickerProvider');

/** Launches WhatsApp's "Add sticker pack" flow. Rejects with code BUSY if one is already open. */
export function addToWhatsApp(packId: string, name: string): Promise<AddResult> {
  return native.addToWhatsApp(packId, name);
}

export function getWhatsAppStatus(packId: string): Promise<WhatsAppStatus> {
  return native.getWhatsAppStatus(packId);
}
