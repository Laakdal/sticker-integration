import { StyleSheet, View } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';

import type { GifProviderId } from '@/store/createSettingsStore';

const PROVIDERS: { value: GifProviderId; label: string }[] = [
  { value: 'klipy', label: 'Klipy' },
  { value: 'giphy', label: 'Giphy' },
];

interface Props {
  value: GifProviderId;
  onChange: (provider: GifProviderId) => void;
}

export function ProviderSettings({ value, onChange }: Props) {
  return (
    <View style={styles.root}>
      <Text variant="bodyMedium">Provider</Text>
      <SegmentedButtons value={value} onValueChange={(v) => onChange(v as GifProviderId)} buttons={PROVIDERS} />
    </View>
  );
}

const styles = StyleSheet.create({ root: { gap: 8 } });
