import type { AddResult, WhatsAppStatus } from '@modules/sticker-provider';

export function isAddedAnywhere(status: WhatsAppStatus | null): boolean {
  if (!status) return false;
  return (status.consumer.installed && status.consumer.added) || (status.business.installed && status.business.added);
}

export function describeAddResult(result: AddResult): string {
  switch (result.status) {
    case 'added':
      return 'Sticker pack added to WhatsApp.';
    case 'cancelled':
      return 'Sticker pack was not added.';
    case 'error':
      if (result.reason === 'not_installed') return result.message ?? 'WhatsApp is not installed.';
      if (result.reason === 'launch_failed') return result.message ?? 'WhatsApp could not be opened.';
      // 'validation' (or an older native build without a reason): WhatsApp's own message, verbatim.
      return result.message ? `WhatsApp rejected the pack: ${result.message}` : 'WhatsApp rejected the pack.';
  }
}
