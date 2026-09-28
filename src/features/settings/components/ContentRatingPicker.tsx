import { StyleSheet, View } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';

import type { ContentRating } from '@/store/createSettingsStore';
import { RATING_OPTIONS } from '../options';

interface Props {
  value: ContentRating;
  onChange: (rating: ContentRating) => void;
}

/** The rating value picker; rendered under its own "Content rating" `List.Section` header. */
export function ContentRatingPicker({ value, onChange }: Props) {
  return (
    <View style={styles.root}>
      <SegmentedButtons value={value} onValueChange={(v) => onChange(v as ContentRating)} buttons={RATING_OPTIONS} />
    </View>
  );
}

const styles = StyleSheet.create({ root: { paddingHorizontal: 16 } });
