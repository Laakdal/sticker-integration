import { ScrollView, StyleSheet } from 'react-native';
import { Drawer, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface DrawerDestination {
  /** The drawer route name, e.g. `index` or `settings`. */
  route: string;
  label: string;
  icon: string;
}

interface Props {
  title: string;
  destinations: DrawerDestination[];
  activeRoute: string | undefined;
  onNavigate: (route: string) => void;
}

/**
 * M3 navigation drawer content: starts below the status bar, a title headline, then one
 * 56 dp item per destination inset 12 dp from the sheet (Paper's MD3 Drawer.Item), the active one
 * on secondaryContainer.
 */
export function AppDrawerContent({ title, destinations, activeRoute, onNavigate }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <ScrollView
      testID="app-drawer"
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }}
    >
      <Text variant="titleSmall" style={[styles.title, { color: colors.onSurfaceVariant }]}>
        {title}
      </Text>
      {destinations.map(({ route, label, icon }) => (
        <Drawer.Item
          key={route}
          label={label}
          accessibilityLabel={label}
          icon={icon}
          active={route === activeRoute}
          onPress={() => onNavigate(route)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // M3: the headline lines up with the item labels (12 dp inset + 16 dp item padding).
  title: { paddingHorizontal: 28, paddingVertical: 16 },
});
