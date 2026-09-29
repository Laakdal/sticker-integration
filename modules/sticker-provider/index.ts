import { requireNativeModule } from 'expo';

/** Why an add ended in `error`: WhatsApp missing, the launch failed, or WhatsApp rejected the pack. */
export type AddErrorReason = 'not_installed' | 'launch_failed' | 'validation';
export type AddResult = { status: 'added' | 'cancelled' | 'error'; message?: string; reason?: AddErrorReason };
export type AppStatus = { installed: boolean; added: boolean };
export type WhatsAppStatus = { consumer: AppStatus; business: AppStatus };
/** `force` launches WhatsApp even when every installed WhatsApp already has the pack, so it is sent again. */
export type AddOptions = { force?: boolean };

interface StickerProviderNative {
  addToWhatsApp(packId: string, name: string, options: AddOptions): Promise<AddResult>;
  getWhatsAppStatus(packId: string): Promise<WhatsAppStatus>;
}

const native = requireNativeModule<StickerProviderNative>('StickerProvider');

/**
 * Launches WhatsApp's "Add sticker pack" flow. Rejects with code BUSY if one is already open.
 * Without `force`, resolves `added` without launching when every installed WhatsApp already has the pack.
 */
export function addToWhatsApp(packId: string, name: string, options: AddOptions = {}): Promise<AddResult> {
  return native.addToWhatsApp(packId, name, { force: options.force ?? false });
}

export function getWhatsAppStatus(packId: string): Promise<WhatsAppStatus> {
  return native.getWhatsAppStatus(packId);
}
