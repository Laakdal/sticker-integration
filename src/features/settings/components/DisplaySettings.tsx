import { StyleSheet, View } from 'react-native';

import type { ThemeMode } from '@/store/createSettingsStore';
import { THEME_OPTIONS } from '../options';
import { List, SegmentedButtons, Switch } from 'react-native-paper';

interface Props {
  themeMode: ThemeMode;
  onChangeThemeMode: (themeMode: ThemeMode) => void;
  useDynamicColor: boolean;
  /** Whether the device provides wallpaper colours (Android 12 or newer). */
  dynamicColorSupported: boolean;
  onChangeUseDynamicColor: (useDynamicColor: boolean) => void;
  reduceMotion: boolean;
  onChangeReduceMotion: (reduceMotion: boolean) => void;
}

export function DisplaySettings({
  themeMode,
  onChangeThemeMode,
  useDynamicColor,
  dynamicColorSupported,
  onChangeUseDynamicColor,
  reduceMotion,
  onChangeReduceMotion,
}: Props) {
  return (
    <View>
      <List.Section title="Theme">
        <View style={styles.picker}>
          <SegmentedButtons value={themeMode} onValueChange={(v) => onChangeThemeMode(v as ThemeMode)} buttons={THEME_OPTIONS} />
        </View>
      </List.Section>
      <List.Item
        title="Use wallpaper colours"
        description={dynamicColorSupported ? 'Android 12 or newer' : 'Needs Android 12 or newer'}
        disabled={!dynamicColorSupported}
        onPress={() => onChangeUseDynamicColor(!useDynamicColor)}
        right={() => (
          <Switch
            accessibilityLabel="Use wallpaper colours"
            value={dynamicColorSupported && useDynamicColor}
            disabled={!dynamicColorSupported}
            onValueChange={onChangeUseDynamicColor}
          />
        )}
      />
      <List.Item
        title="Reduce motion"
        description="Show animated stickers as still images"
        onPress={() => onChangeReduceMotion(!reduceMotion)}
        right={() => <Switch accessibilityLabel="Reduce motion" value={reduceMotion} onValueChange={onChangeReduceMotion} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({ picker: { paddingHorizontal: 16 } });
