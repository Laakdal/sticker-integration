import { act, screen } from '@testing-library/react-native';

import { PackList } from '@/features/packs/components/PackList';
import { makePack } from '@/test-utils/fixtures';
import { renderWithProviders } from '@/test-utils/render';

jest.mock('@modules/sticker-provider', () => ({ getWhatsAppStatus: jest.fn().mockResolvedValue(null) }));
jest.mock('expo-router', () => ({ useFocusEffect: jest.fn() }));
jest.mock('@/store/packsStore', () => ({ packStorage: { fileUri: () => 'file:///x' } }));

// react-native-paper's Banner always runs its 250ms show/hide Animated.timing on mount
// (even when `visible` is false), so tests wait for it to settle inside `act` to avoid
// "not wrapped in act(...)" warnings from the animation's trailing frames.
async function flushBannerAnimation() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
  });
}

describe('PackList', () => {
  it('shows both sections', async () => {
    await renderWithProviders(
      <PackList
        myPacks={[makePack({ id: 'a', name: 'Mine' })]}
        bundledPacks={[makePack({ id: 'b', name: 'Starter', origin: 'bundled' })]}
        quarantined={[]}
        onOpenPack={jest.fn()}
      />,
    );
    await flushBannerAnimation();
    expect(screen.getByText('My packs')).toBeTruthy();
    expect(screen.getByText('Starter packs')).toBeTruthy();
    expect(screen.getByText('Mine')).toBeTruthy();
    expect(screen.getByText('Starter')).toBeTruthy();
  });

  it('shows an empty state when there are no user packs', async () => {
    await renderWithProviders(<PackList myPacks={[]} bundledPacks={[]} quarantined={[]} onOpenPack={jest.fn()} />);
    await flushBannerAnimation();
    expect(screen.getByText('No packs yet')).toBeTruthy();
  });

  it('warns about quarantined packs', async () => {
    await renderWithProviders(<PackList myPacks={[]} bundledPacks={[]} quarantined={['x', 'y']} onOpenPack={jest.fn()} />);
    await flushBannerAnimation();
    expect(screen.getByText(/2 packs could not be read/)).toBeTruthy();
  });
});
