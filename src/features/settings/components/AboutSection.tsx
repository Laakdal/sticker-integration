import Constants from 'expo-constants';
import { List } from 'react-native-paper';

export function AboutSection() {
  const name = Constants.expoConfig?.name ?? 'Sticker Maker';
  const version = Constants.expoConfig?.version ?? 'unknown';
  return (
    <List.Item
      title={name}
      description={`Version ${version}`}
      left={(props) => <List.Icon {...props} icon="information-outline" />}
    />
  );
}
