import { FlashList } from '@shopify/flash-list';
import { StyleSheet, View } from 'react-native';
import { Banner } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, SectionHeader } from '@/components';
import type { Pack } from '@/domain/types';

import { PackCard } from './PackCard';

interface Props {
  myPacks: Pack[];
  quarantined: string[];
  onOpenPack: (packId: string) => void;
}

export function PackList({ myPacks, quarantined, onOpenPack }: Props) {
  const insets = useSafeAreaInsets();
  const banner = (
    <Banner visible={quarantined.length > 0} icon="alert">
      {`${quarantined.length} ${quarantined.length === 1 ? 'pack' : 'packs'} could not be read and were moved to quarantine.`}
    </Banner>
  );

  if (myPacks.length === 0) {
    return (
      <View style={styles.root}>
        {banner}
        <View style={[styles.emptyContainer, { paddingBottom: 96 + insets.bottom }]}>
          <EmptyState icon="sticker-plus-outline" title="No packs yet" body="Tap New pack to create your first sticker pack." />
        </View>
      </View>
    );
  }

  return (
    <FlashList
      data={myPacks}
      keyExtractor={(pack) => pack.id}
      contentContainerStyle={{ paddingBottom: 96 + insets.bottom }}
      ListHeaderComponent={
        <>
          {banner}
          <SectionHeader title="My packs" />
        </>
      }
      renderItem={({ item }) => <PackCard pack={item} onPress={() => onOpenPack(item.id)} />}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
