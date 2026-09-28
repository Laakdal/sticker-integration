import { StyleSheet, View } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';

import type { ContentRating } from '@/store/createSettingsStore';

const RATINGS: { value: ContentRating; label: string }[] = [
  { value: 'g', label: 'G' },
  { value: 'pg', label: 'PG' },
  { value: 'pg-13', label: 'PG-13' },
  { value: 'r', label: 'R' },
];

interface Props {
  value: ContentRating;
  onChange: (rating: ContentRating) => void;
}

export function ContentRatingPicker({ value, onChange }: Props) {
  return (
    <View style={styles.root}>
      <Text variant="bodyMedium">Content rating</Text>
      <SegmentedButtons value={value} onValueChange={(v) => onChange(v as ContentRating)} buttons={RATINGS} />
    </View>
  );
}

const styles = StyleSheet.create({ root: { gap: 8 } });
