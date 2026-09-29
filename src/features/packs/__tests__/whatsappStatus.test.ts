import { describeAddResult, isAddedAnywhere } from '@/features/packs/whatsappStatus';

const app = (installed: boolean, added: boolean) => ({ installed, added });

describe('whatsappStatus', () => {
  it('reports added when any installed WhatsApp has the pack', () => {
    expect(isAddedAnywhere(null)).toBe(false);
    expect(isAddedAnywhere({ consumer: app(true, false), business: app(false, false) })).toBe(false);
    expect(isAddedAnywhere({ consumer: app(true, false), business: app(true, true) })).toBe(true);
  });

  it('describes add results', () => {
    expect(describeAddResult({ status: 'added' })).toBe('Sticker pack added to WhatsApp.');
    expect(describeAddResult({ status: 'cancelled' })).toBe('Sticker pack was not added.');
    expect(describeAddResult({ status: 'error', message: 'Bad tray' })).toBe('WhatsApp rejected the pack: Bad tray');
    expect(describeAddResult({ status: 'error' })).toBe('WhatsApp rejected the pack.');
  });

  it('describes update results', () => {
    expect(describeAddResult({ status: 'added' }, true)).toBe('Sticker pack updated in WhatsApp.');
    expect(describeAddResult({ status: 'cancelled' }, true)).toBe('Sticker pack was not updated.');
    expect(describeAddResult({ status: 'error', message: 'Bad tray' }, true)).toBe('WhatsApp rejected the pack: Bad tray');
  });

  it('shows native launch problems without blaming the pack', () => {
    expect(describeAddResult({ status: 'error', reason: 'not_installed', message: 'WhatsApp is not installed.' })).toBe('WhatsApp is not installed.');
    expect(describeAddResult({ status: 'error', reason: 'not_installed' })).toBe('WhatsApp is not installed.');
    expect(describeAddResult({ status: 'error', reason: 'launch_failed', message: 'WhatsApp could not be opened.' })).toBe(
      'WhatsApp could not be opened.',
    );
    expect(describeAddResult({ status: 'error', reason: 'launch_failed' })).toBe('WhatsApp could not be opened.');
  });

  it('shows WhatsApp validation errors verbatim after the rejected prefix', () => {
    expect(describeAddResult({ status: 'error', reason: 'validation', message: 'Tray image too large' })).toBe(
      'WhatsApp rejected the pack: Tray image too large',
    );
  });
});
