import { List, Switch } from 'react-native-paper';

interface Props {
  reduceMotion: boolean;
  onChangeReduceMotion: (reduceMotion: boolean) => void;
}

export function DisplaySettings({ reduceMotion, onChangeReduceMotion }: Props) {
  return (
    <List.Item
      title="Reduce motion"
      description="Show animated stickers as still images"
      onPress={() => onChangeReduceMotion(!reduceMotion)}
      right={() => <Switch accessibilityLabel="Reduce motion" value={reduceMotion} onValueChange={onChangeReduceMotion} />}
    />
  );
}
