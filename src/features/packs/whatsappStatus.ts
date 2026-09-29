import type { AddResult, WhatsAppStatus } from '@modules/sticker-provider';

export function isAddedAnywhere(status: WhatsAppStatus | null): boolean {
  if (!status) return false;
  return (status.consumer.installed && status.consumer.added) || (status.business.installed && status.business.added);
}

/** `update` words the outcome of re-sending a pack WhatsApp already has. */
export function describeAddResult(result: AddResult, update = false): string {
  switch (result.status) {
    case 'added':
      return update ? 'Sticker pack updated in WhatsApp.' : 'Sticker pack added to WhatsApp.';
    case 'cancelled':
      return update ? 'Sticker pack was not updated.' : 'Sticker pack was not added.';
    case 'error':
      if (result.reason === 'not_installed') return result.message ?? 'WhatsApp is not installed.';
      if (result.reason === 'launch_failed') return result.message ?? 'WhatsApp could not be opened.';
      // 'validation' (or an older native build without a reason): WhatsApp's own message, verbatim.
      return result.message ? `WhatsApp rejected the pack: ${result.message}` : 'WhatsApp rejected the pack.';
  }
}
