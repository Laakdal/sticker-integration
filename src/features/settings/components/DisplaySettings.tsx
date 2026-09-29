import { useState } from 'react';
import { View } from 'react-native';

import type { ThemeMode } from '@/store/createSettingsStore';
import { List, Menu, Switch } from 'react-native-paper';

import { optionLabel, THEME_OPTIONS } from '../options';

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
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View>
      <Menu
        visible={menuOpen}
        onDismiss={() => setMenuOpen(false)}
        anchorPosition="bottom"
        anchor={
          <List.Item
            title="Theme"
            description={optionLabel(THEME_OPTIONS, themeMode)}
            accessibilityRole="button"
            onPress={() => setMenuOpen(true)}
            right={(props) => <List.Icon {...props} icon="menu-down" />}
          />
        }
      >
        {THEME_OPTIONS.map(({ value, label }) => (
          <Menu.Item
            key={value}
            title={label}
            trailingIcon={value === themeMode ? 'check' : undefined}
            onPress={() => {
              onChangeThemeMode(value);
              setMenuOpen(false);
            }}
          />
        ))}
      </Menu>
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
