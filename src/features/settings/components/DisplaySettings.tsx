import { View } from 'react-native';
import { List, Switch } from 'react-native-paper';

interface Props {
  useDynamicColor: boolean;
  /** Whether the device provides wallpaper colours (Android 12 or newer). */
  dynamicColorSupported: boolean;
  onChangeUseDynamicColor: (useDynamicColor: boolean) => void;
  reduceMotion: boolean;
  onChangeReduceMotion: (reduceMotion: boolean) => void;
}

export function DisplaySettings({
  useDynamicColor,
  dynamicColorSupported,
  onChangeUseDynamicColor,
  reduceMotion,
  onChangeReduceMotion,
}: Props) {
  return (
    <View>
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
