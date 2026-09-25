import { fireEvent, screen } from '@testing-library/react-native';

import { StickerDetailsSheet } from '@/features/packs/components/StickerDetailsSheet';
import { makePack, makeSticker } from '@/test-utils/fixtures';
import { renderWithProviders } from '@/test-utils/render';

jest.mock('rn-emoji-keyboard', () => ({ __esModule: true, default: () => null }));
jest.mock('@/store/packsStore', () => ({ packStorage: { fileUri: () => 'file:///x' } }));

describe('StickerDetailsSheet', () => {
  const sticker = makeSticker({ id: 's1', emojis: ['😀', '🔥'], accessibilityText: 'hi' });
  const pack = makePack({ stickers: [sticker] });

  it('saves edited emojis and accessibility text', async () => {
    const onSave = jest.fn();
    await renderWithProviders(
      <StickerDetailsSheet pack={pack} sticker={sticker} readOnly={false} onSave={onSave} onDelete={jest.fn()} onDismiss={jest.fn()} />,
    );
    await fireEvent.press(screen.getByLabelText('Remove 🔥'));
    await fireEvent.changeText(screen.getByLabelText('Accessibility text'), 'waving hello');
    await fireEvent.press(screen.getByText('Save'));
    expect(onSave).toHaveBeenCalledWith({ emojis: ['😀'], accessibilityText: 'waving hello' });
  });

  it('asks for confirmation before deleting', async () => {
    const onDelete = jest.fn();
    await renderWithProviders(
      <StickerDetailsSheet pack={pack} sticker={sticker} readOnly={false} onSave={jest.fn()} onDelete={onDelete} onDismiss={jest.fn()} />,
    );
    await fireEvent.press(screen.getByText('Delete'));
    expect(onDelete).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText('Delete sticker'));
    expect(onDelete).toHaveBeenCalled();
  });

  it('hides editing controls when read-only', async () => {
    await renderWithProviders(
      <StickerDetailsSheet pack={pack} sticker={sticker} readOnly onSave={jest.fn()} onDelete={jest.fn()} onDismiss={jest.fn()} />,
    );
    expect(screen.queryByText('Save')).toBeNull();
    expect(screen.queryByText('Delete')).toBeNull();
    expect(screen.getByText('😀 🔥')).toBeTruthy();
  });
});
