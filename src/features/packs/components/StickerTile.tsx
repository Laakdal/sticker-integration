import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';

import { StickerImage } from '@/components';

export const TILE_SIZE = 76;

export function StickerTile({ uri, version, hasIssue, onPress }: { uri: string; version: number; hasIssue: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={hasIssue ? 'Sticker with an issue' : 'Sticker'}>
      <View
        style={[
          styles.tile,
          { backgroundColor: colors.surfaceVariant, borderColor: hasIssue ? colors.error : 'transparent' },
        ]}
      >
        <StickerImage uri={uri} size={TILE_SIZE - 8} version={version} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { width: TILE_SIZE, height: TILE_SIZE, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
