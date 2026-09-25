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
});
