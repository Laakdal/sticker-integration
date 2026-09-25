import { StyleSheet, View } from 'react-native';
import Sortable from 'react-native-sortables';

import { EmptyState } from '@/components';
import type { Pack, Sticker } from '@/domain/types';
import { validateSticker } from '@/services/validation';
import { packStorage } from '@/store/packsStore';

import { StickerTile } from './StickerTile';

interface Props {
  pack: Pack;
  readOnly: boolean;
  onReorder: (orderedIds: string[]) => void;
  onOpenSticker: (stickerId: string) => void;
}

export function StickerGrid({ pack, readOnly, onReorder, onOpenSticker }: Props) {
  if (pack.stickers.length === 0) {
    return <EmptyState icon="sticker-outline" title="No stickers yet" />;
  }
  return (
    <View style={styles.root}>
      <Sortable.Grid<Sticker>
        data={pack.stickers}
        columns={4}
        rowGap={8}
        columnGap={8}
        sortEnabled={!readOnly}
        keyExtractor={(s) => s.id}
        onDragEnd={({ data }) => {
          const ids = data.map((s) => s.id);
          if (ids.join() !== pack.stickers.map((s) => s.id).join()) onReorder(ids);
        }}
        renderItem={({ item }) => (
          <StickerTile
            uri={packStorage.fileUri(pack.id, item.file)}
            version={pack.imageDataVersion}
            hasIssue={validateSticker(item, pack.animated).length > 0}
            onPress={() => onOpenSticker(item.id)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({ root: { paddingVertical: 8 } });
