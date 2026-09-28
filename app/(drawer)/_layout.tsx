import { Drawer } from 'expo-router/drawer';
import { Appbar, Icon, useTheme } from 'react-native-paper';

/** Top-level screens share a drawer; detail screens (e.g. `pack/[id]`) are pushed above it by the root Stack. */
export default function DrawerLayout() {
  const { colors } = useTheme();

  return (
    <Drawer
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.onSurface,
        headerLeft: () => (
          <Appbar.Action icon="menu" accessibilityLabel="Open navigation menu" onPress={() => navigation.toggleDrawer()} />
        ),
        drawerStyle: { backgroundColor: colors.surface },
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.onSurfaceVariant,
        overlayColor: colors.backdrop,
        sceneStyle: { backgroundColor: colors.background },
      })}
    >
      <Drawer.Screen
        name="index"
        options={{
          title: 'Sticker Maker',
          drawerLabel: 'Sticker packs',
          drawerIcon: ({ color, size }) => <Icon source="sticker-emoji" color={String(color)} size={size} />,
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          title: 'Settings',
          drawerIcon: ({ color, size }) => <Icon source="cog-outline" color={String(color)} size={size} />,
        }}
      />
    </Drawer>
  );
}
