import { fireEvent, screen } from '@testing-library/react-native';

import { EmojiTagger } from '@/features/editor/shared/EmojiTagger';
import { renderWithProviders } from '@/test-utils/render';

jest.mock('rn-emoji-keyboard', () => {
  const { Pressable, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ open, onEmojiSelected }: { open: boolean; onEmojiSelected: (e: { emoji: string }) => void }) =>
      open ? (
        <Pressable onPress={() => onEmojiSelected({ emoji: '🔥' })}>
          <Text>pick-fire</Text>
        </Pressable>
      ) : null,
  };
});

describe('EmojiTagger', () => {
  it('adds a picked emoji', async () => {
    const onChange = jest.fn();
    await renderWithProviders(<EmojiTagger value={['😀']} onChange={onChange} />);
    await fireEvent.press(screen.getByText('Add emoji'));
    await fireEvent.press(screen.getByText('pick-fire'));
    expect(onChange).toHaveBeenCalledWith(['😀', '🔥']);
  });

  it('ignores duplicates', async () => {
    const onChange = jest.fn();
    await renderWithProviders(<EmojiTagger value={['🔥']} onChange={onChange} />);
    await fireEvent.press(screen.getByText('Add emoji'));
    await fireEvent.press(screen.getByText('pick-fire'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes an emoji and disables adding at 3', async () => {
    const onChange = jest.fn();
    await renderWithProviders(<EmojiTagger value={['😀', '😁', '👍🏽']} onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Add emoji' })).toBeDisabled();
    await fireEvent.press(screen.getByLabelText('Remove 👍🏽'));
    expect(onChange).toHaveBeenCalledWith(['😀', '😁']);
  });

  it('explains the requirement when empty', async () => {
    await renderWithProviders(<EmojiTagger value={[]} onChange={jest.fn()} />);
    expect(screen.getByText('Add 1–3 emojis so WhatsApp can suggest this sticker.')).toBeTruthy();
  });
});
