import { FlashList } from '@shopify/flash-list';
import { Banner } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, SectionHeader } from '@/components';
import type { Pack } from '@/domain/types';

import { PackCard } from './PackCard';

type Row =
  | { type: 'header'; key: string; title: string }
  | { type: 'pack'; key: string; pack: Pack }
  | { type: 'empty'; key: string };

interface Props {
  myPacks: Pack[];
  bundledPacks: Pack[];
  quarantined: string[];
  onOpenPack: (packId: string) => void;
}

export function PackList({ myPacks, bundledPacks, quarantined, onOpenPack }: Props) {
  const insets = useSafeAreaInsets();
  const rows: Row[] = [
    { type: 'header', key: 'h-mine', title: 'My packs' },
    ...(myPacks.length
      ? myPacks.map((pack): Row => ({ type: 'pack', key: pack.id, pack }))
      : [{ type: 'empty', key: 'empty' } as const]),
    ...(bundledPacks.length
      ? [
          { type: 'header', key: 'h-bundled', title: 'Starter packs' } as const,
          ...bundledPacks.map((pack): Row => ({ type: 'pack', key: pack.id, pack })),
        ]
      : []),
  ];

  return (
    <FlashList
      data={rows}
      keyExtractor={(row) => row.key}
      getItemType={(row) => row.type}
      contentContainerStyle={{ paddingBottom: 96 + insets.bottom }}
      ListHeaderComponent={
        <Banner visible={quarantined.length > 0} icon="alert">
          {`${quarantined.length} ${quarantined.length === 1 ? 'pack' : 'packs'} could not be read and were moved to quarantine.`}
        </Banner>
      }
      renderItem={({ item }) => {
        switch (item.type) {
          case 'header':
            return <SectionHeader title={item.title} />;
          case 'empty':
            return <EmptyState icon="sticker-plus-outline" title="No packs yet" body="Tap New pack to create your first sticker pack." />;
          case 'pack':
            return <PackCard pack={item.pack} onPress={() => onOpenPack(item.pack.id)} />;
        }
      }}
    />
  );
}
