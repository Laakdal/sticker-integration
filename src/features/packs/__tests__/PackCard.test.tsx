import { fireEvent, screen } from '@testing-library/react-native';

import { PackCard } from '@/features/packs/components/PackCard';
import { makePack } from '@/test-utils/fixtures';
import { renderWithProviders } from '@/test-utils/render';

jest.mock('@modules/sticker-provider', () => ({
  getWhatsAppStatus: jest.fn().mockResolvedValue({
    consumer: { installed: true, added: true },
    business: { installed: false, added: false },
  }),
}));
jest.mock('expo-router', () => ({ useFocusEffect: (cb: () => void) => require('react').useEffect(cb, [cb]) }));
jest.mock('@/store/packsStore', () => ({ packStorage: { fileUri: (id: string, f: string) => `file:///p/${id}/${f}` } }));

describe('PackCard', () => {
  it('shows name, author, count and added badge but no pack type', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<PackCard pack={makePack({ name: 'Cats', publisher: 'Ana', animated: true }, 5)} onPress={onPress} />);
    expect(screen.getByText('Cats')).toBeTruthy();
    expect(screen.getByText('Ana · 5 stickers')).toBeTruthy();
    expect(screen.queryByText('Animated')).toBeNull();
    expect(screen.queryByText('Static')).toBeNull();
    expect(await screen.findByText('Added')).toBeTruthy();
    await fireEvent.press(screen.getByText('Cats'));
    expect(onPress).toHaveBeenCalled();
  });

  it('uses singular for one sticker and hides the badge when not added', async () => {
    const { getWhatsAppStatus } = jest.requireMock('@modules/sticker-provider');
    getWhatsAppStatus.mockResolvedValueOnce({ consumer: { installed: true, added: false }, business: { installed: false, added: false } });
    await renderWithProviders(<PackCard pack={makePack({ publisher: 'Ana' }, 1)} onPress={jest.fn()} />);
    expect(screen.getByText('Ana · 1 sticker')).toBeTruthy();
    await screen.findByText('My Pack');
    expect(screen.queryByText('Added')).toBeNull();
  });
});
