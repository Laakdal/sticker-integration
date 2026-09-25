import { StyleSheet, View } from 'react-native';
import { Card, Chip, Text } from 'react-native-paper';

import { StickerImage } from '@/components';
import type { Pack } from '@/domain/types';
import { packStorage } from '@/store/packsStore';

import { useWhatsAppStatus } from '../hooks/useWhatsAppStatus';
import { isAddedAnywhere } from '../whatsappStatus';
import { WhatsAppBadge } from './WhatsAppBadge';

const PREVIEW_COUNT = 5;

export function PackCard({ pack, onPress }: { pack: Pack; onPress: () => void }) {
  const { status } = useWhatsAppStatus(pack.id, pack.imageDataVersion);
  const count = pack.stickers.length;
  return (
    <Card mode="elevated" style={styles.card} onPress={onPress} accessibilityLabel={`Open ${pack.name}`}>
      <Card.Content style={styles.content}>
        <View style={styles.header}>
          <StickerImage uri={packStorage.fileUri(pack.id, pack.trayIcon)} size={48} version={pack.imageDataVersion} animate={false} />
          <View style={styles.titles}>
            <Text variant="titleMedium" numberOfLines={1}>
              {pack.name}
            </Text>
            <Text variant="bodySmall" numberOfLines={1}>
              {`${pack.publisher} · ${count} ${count === 1 ? 'sticker' : 'stickers'}`}
            </Text>
          </View>
        </View>
        <View style={styles.previews}>
          {pack.stickers.slice(0, PREVIEW_COUNT).map((s) => (
            <StickerImage key={s.id} uri={packStorage.fileUri(pack.id, s.file)} size={52} version={pack.imageDataVersion} />
          ))}
        </View>
        <View style={styles.chips}>
          <Chip compact>{pack.animated ? 'Animated' : 'Static'}</Chip>
          <WhatsAppBadge added={isAddedAnywhere(status)} />
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 12 },
  content: { gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titles: { flex: 1 },
  previews: { flexDirection: 'row', gap: 8 },
  chips: { flexDirection: 'row', gap: 8 },
});
