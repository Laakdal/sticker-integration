import { Drawer, type DrawerContentComponentProps } from 'expo-router/drawer';
import { useWindowDimensions } from 'react-native';
import { Appbar, useTheme } from 'react-native-paper';

import { AppDrawerContent, type DrawerDestination } from '@/components';
import type { AppTheme } from '@/theme';

const DESTINATIONS: DrawerDestination[] = [
  { route: 'index', label: 'Sticker packs', icon: 'sticker-emoji' },
  { route: 'settings', label: 'Settings', icon: 'cog-outline' },
];

function DrawerContent({ state, navigation }: DrawerContentComponentProps) {
  const activeRoute = state.routes[state.index]?.name;
  return (
    <AppDrawerContent
      title="Sticker Maker"
      destinations={DESTINATIONS}
      activeRoute={activeRoute}
      // Like the stock drawer: picking the current screen just closes the drawer.
      onNavigate={(route) => (route === activeRoute ? navigation.closeDrawer() : navigation.navigate(route))}
    />
  );
}

/** Top-level screens share a drawer; detail screens (e.g. `pack/[id]`) are pushed above it by the root Stack. */
export default function DrawerLayout() {
  const { colors } = useTheme<AppTheme>();
  const { width } = useWindowDimensions();

  return (
    <Drawer
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.onSurface,
        headerLeft: () => (
          <Appbar.Action icon="menu" accessibilityLabel="Open navigation menu" onPress={() => navigation.toggleDrawer()} />
        ),
        // M3 modal navigation drawer: surfaceContainerLow sheet, rounded trailing corners.
        drawerStyle: {
          backgroundColor: colors.surfaceContainerLow,
          width: Math.min(360, Math.round(width * 0.85)),
          borderTopRightRadius: 16,
          borderBottomRightRadius: 16,
        },
        overlayColor: colors.backdrop,
        sceneStyle: { backgroundColor: colors.background },
      })}
    >
      <Drawer.Screen name="index" options={{ title: 'Sticker Maker' }} />
      <Drawer.Screen name="settings" options={{ title: 'Settings' }} />
    </Drawer>
  );
}
