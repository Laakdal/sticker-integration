import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppDrawerContent, type DrawerDestination } from '@/components';
import { lightTheme } from '@/theme';

const DESTINATIONS: DrawerDestination[] = [
  { route: 'index', label: 'Sticker packs', icon: 'sticker-emoji' },
  { route: 'settings', label: 'Settings', icon: 'cog-outline' },
];

// A phone with a 32 dp status bar.
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 32, left: 0, right: 0, bottom: 24 } };

function renderDrawer(activeRoute: string | undefined, onNavigate = jest.fn()) {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <PaperProvider theme={lightTheme}>
        <AppDrawerContent title="Sticker Maker" destinations={DESTINATIONS} activeRoute={activeRoute} onNavigate={onNavigate} />
      </PaperProvider>
    </SafeAreaProvider>,
  );
}

const item = (name: string) => screen.getByRole('button', { name });

describe('AppDrawerContent', () => {
  it('shows the app name above one item per destination', async () => {
    await renderDrawer('index');
    expect(screen.getByText('Sticker Maker')).toBeTruthy();
    expect(item('Sticker packs')).toBeTruthy();
    expect(item('Settings')).toBeTruthy();
  });

  it('marks the active destination with the secondary container colour', async () => {
    await renderDrawer('settings');
    expect(item('Settings')).toBeSelected();
    expect(item('Sticker packs')).not.toBeSelected();
    expect(item('Settings')).toHaveStyle({ backgroundColor: lightTheme.colors.secondaryContainer });
    // M3: 56 dp tall, 12 dp from the sheet edges.
    expect(item('Sticker packs')).toHaveStyle({ height: 56, marginLeft: 12, marginRight: 12 });
  });

  it('starts below the status bar', async () => {
    await renderDrawer('index');
    const content = StyleSheet.flatten(screen.getByTestId('app-drawer').props.contentContainerStyle);
    expect(content.paddingTop).toBeGreaterThanOrEqual(32);
    expect(content.paddingBottom).toBeGreaterThanOrEqual(24);
  });

  it('reports the destination that was pressed', async () => {
    const onNavigate = jest.fn();
    await renderDrawer('index', onNavigate);
    await fireEvent.press(item('Settings'));
    expect(onNavigate).toHaveBeenCalledWith('settings');
  });
});
