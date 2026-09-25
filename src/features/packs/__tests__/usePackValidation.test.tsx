import { act, renderHook } from '@testing-library/react-native';

import type { Pack } from '@/domain/types';
import { usePackValidation } from '@/features/packs/hooks/usePackValidation';
import { makePack } from '@/test-utils/fixtures';

const mockFileSize = jest.fn();
jest.mock('@/store/packsStore', () => ({ packStorage: { fileSize: (...args: unknown[]) => mockFileSize(...args) } }));

function deferred() {
  let resolve: (size: number | null) => void = () => {};
  const promise = new Promise<number | null>((r) => (resolve = r));
  return { promise, resolve };
}

const codes = (issues: { code: string }[]) => issues.map((i) => i.code);

beforeEach(() => mockFileSize.mockReset());

describe('usePackValidation', () => {
  it('keeps the last tray facts while a changed tray reloads', async () => {
    const first = deferred();
    const second = deferred();
    mockFileSize.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const pack = makePack({ imageDataVersion: 1 });
    const { result, rerender } = await renderHook((p: Pack) => usePackValidation(p), { initialProps: pack });
    await act(async () => first.resolve(1000));
    expect(codes(result.current.issues)).not.toContain('TRAY_MISSING');

    await rerender({ ...pack, imageDataVersion: 2 });
    expect(result.current.loading).toBe(true);
    expect(codes(result.current.issues)).not.toContain('TRAY_MISSING');

    await act(async () => second.resolve(null));
    expect(result.current.loading).toBe(false);
    expect(codes(result.current.issues)).toContain('TRAY_MISSING');
  });

  it('does not reuse tray facts from a different pack', async () => {
    const other = deferred();
    mockFileSize.mockResolvedValueOnce(1000).mockReturnValueOnce(other.promise);
    const { result, rerender } = await renderHook((p: Pack) => usePackValidation(p), { initialProps: makePack({ id: 'a' }) });
    await act(async () => {});
    expect(codes(result.current.issues)).not.toContain('TRAY_MISSING');

    await rerender(makePack({ id: 'b' }));
    expect(codes(result.current.issues)).toContain('TRAY_MISSING');
    await act(async () => other.resolve(1000));
  });
});
