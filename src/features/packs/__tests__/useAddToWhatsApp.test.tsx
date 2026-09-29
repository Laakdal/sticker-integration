import { act, renderHook } from '@testing-library/react-native';

import { useAddToWhatsApp } from '@/features/packs/hooks/useAddToWhatsApp';
import { makePack } from '@/test-utils/fixtures';

// babel-jest's out-of-scope-variable guard for jest.mock() factories only exempts
// identifiers prefixed with "mock" (case-insensitive), so this must be named accordingly.
const mockAddToWhatsApp = jest.fn();
jest.mock('@modules/sticker-provider', () => ({ addToWhatsApp: (...args: unknown[]) => mockAddToWhatsApp(...args) }));

beforeEach(() => mockAddToWhatsApp.mockReset());

describe('useAddToWhatsApp', () => {
  it('does not call WhatsApp when the pack has issues', async () => {
    const { result } = await renderHook(() => useAddToWhatsApp(makePack(), [{ code: 'TRAY_MISSING', message: 'Add a tray icon.' }]));
    await act(() => result.current.add());
    expect(mockAddToWhatsApp).not.toHaveBeenCalled();
    expect(result.current.message).toBe('Fix 1 issue before adding to WhatsApp.');
  });

  it('adds a valid pack and reports the result', async () => {
    mockAddToWhatsApp.mockResolvedValue({ status: 'added' });
    const pack = makePack({ id: 'p1', name: 'Cats' });
    const { result } = await renderHook(() => useAddToWhatsApp(pack, []));
    await act(() => result.current.add());
    expect(mockAddToWhatsApp).toHaveBeenCalledWith('p1', 'Cats', { force: false });
    expect(result.current.message).toBe('Sticker pack added to WhatsApp.');
    expect(result.current.pending).toBe(false);
  });

  it('forces a re-send when updating a pack WhatsApp already has', async () => {
    mockAddToWhatsApp.mockResolvedValue({ status: 'added' });
    const { result } = await renderHook(() => useAddToWhatsApp(makePack({ id: 'p1', name: 'Cats' }), []));
    await act(() => result.current.add({ force: true }));
    expect(mockAddToWhatsApp).toHaveBeenCalledWith('p1', 'Cats', { force: true });
    expect(result.current.message).toBe('Sticker pack updated in WhatsApp.');
  });

  it('shows a message instead of crashing when a request is already open', async () => {
    mockAddToWhatsApp.mockRejectedValue(Object.assign(new Error('busy'), { code: 'BUSY' }));
    const { result } = await renderHook(() => useAddToWhatsApp(makePack(), []));
    await act(() => result.current.add());
    expect(result.current.message).toBe('WhatsApp is already open for another pack.');
  });

  it('ignores a second tap while pending', async () => {
    let resolve: (v: unknown) => void = () => {};
    mockAddToWhatsApp.mockReturnValue(new Promise((r) => (resolve = r)));
    const { result } = await renderHook(() => useAddToWhatsApp(makePack(), []));
    let first: Promise<void> = Promise.resolve();
    await act(() => {
      first = result.current.add();
    });
    await act(() => result.current.add());
    expect(mockAddToWhatsApp).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolve({ status: 'cancelled' });
      await first;
    });
  });

  it('flushes pending edits first and sends the committed values', async () => {
    mockAddToWhatsApp.mockResolvedValue({ status: 'added' });
    const order: string[] = [];
    const committed = makePack({ id: 'p1', name: 'Renamed' });
    const options = {
      flush: async () => void order.push('flush'),
      readLatest: () => (order.push('read'), committed),
      validate: () => [],
    };
    const { result } = await renderHook(() => useAddToWhatsApp(makePack({ id: 'p1', name: 'Old' }), [], options));
    await act(() => result.current.add());
    expect(order).toEqual(['flush', 'read']);
    expect(mockAddToWhatsApp).toHaveBeenCalledWith('p1', 'Renamed', { force: false });
  });

  it('re-validates the committed pack before calling WhatsApp', async () => {
    const options = {
      flush: async () => {},
      readLatest: () => makePack({ name: '' }),
      validate: () => [{ code: 'PACK_NAME_REQUIRED' as const, message: 'Add a pack name.' }],
    };
    const { result } = await renderHook(() => useAddToWhatsApp(makePack(), [], options));
    await act(() => result.current.add());
    expect(mockAddToWhatsApp).not.toHaveBeenCalled();
    expect(result.current.message).toBe('Fix 1 issue before adding to WhatsApp.');
    expect(result.current.pending).toBe(false);
  });

  it('reports a failed flush instead of adding', async () => {
    const options = { flush: () => Promise.reject(new Error('disk full')) };
    const { result } = await renderHook(() => useAddToWhatsApp(makePack(), [], options));
    await act(() => result.current.add());
    expect(mockAddToWhatsApp).not.toHaveBeenCalled();
    expect(result.current.message).toBe('Could not save your changes: disk full');
  });
});
