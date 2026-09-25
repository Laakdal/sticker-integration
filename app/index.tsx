import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { FAB } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { Screen } from '@/components';
import { PackList } from '@/features/packs';
import { selectBundledPacks, selectMyPacks } from '@/store/createPacksStore';
import { usePacksStore } from '@/store/packsStore';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const myPacks = usePacksStore(useShallow(selectMyPacks));
  const bundledPacks = usePacksStore(useShallow(selectBundledPacks));
  const quarantined = usePacksStore((s) => s.quarantined);
  const createPack = usePacksStore((s) => s.createPack);
  const [creating, setCreating] = useState(false);

  async function onCreate() {
    setCreating(true);
    try {
      const pack = await createPack({ name: 'My sticker pack', publisher: 'Me' });
      router.push({ pathname: '/pack/[id]', params: { id: pack.id } });
    } finally {
      setCreating(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Sticker Maker' }} />
      <PackList
        myPacks={myPacks}
        bundledPacks={bundledPacks}
        quarantined={quarantined}
        onOpenPack={(id) => router.push({ pathname: '/pack/[id]', params: { id } })}
      />
      <FAB icon="plus" label="New pack" style={[styles.fab, { bottom: 24 + insets.bottom }]} onPress={onCreate} loading={creating} disabled={creating} />
    </Screen>
  );
}

const styles = StyleSheet.create({ fab: { position: 'absolute', right: 16 } });
