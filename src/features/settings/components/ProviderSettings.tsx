import { StyleSheet, View } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';

import type { GifProviderId } from '@/store/createSettingsStore';
import { PROVIDER_OPTIONS } from '../options';

interface Props {
  value: GifProviderId;
  onChange: (provider: GifProviderId) => void;
}

export function ProviderSettings({ value, onChange }: Props) {
  return (
    <View style={styles.root}>
      <Text variant="bodyMedium">Provider</Text>
      <SegmentedButtons value={value} onValueChange={(v) => onChange(v as GifProviderId)} buttons={PROVIDER_OPTIONS} />
    </View>
  );
}

const styles = StyleSheet.create({ root: { gap: 8 } });
