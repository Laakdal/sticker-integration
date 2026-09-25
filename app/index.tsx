import { Stack, useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';
import { FAB, Snackbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { Screen } from '@/components';
import { PackList, useAsyncAction } from '@/features/packs';
import { selectBundledPacks, selectMyPacks } from '@/store/createPacksStore';
import { usePacksStore } from '@/store/packsStore';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const myPacks = usePacksStore(useShallow(selectMyPacks));
  const bundledPacks = usePacksStore(useShallow(selectBundledPacks));
  const quarantined = usePacksStore((s) => s.quarantined);
  const createPack = usePacksStore((s) => s.createPack);
  const create = useAsyncAction(() => createPack({ name: 'My sticker pack', publisher: 'Me' }));

  async function onCreate() {
    const pack = await create.run();
    if (pack) router.push({ pathname: '/pack/[id]', params: { id: pack.id } });
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
      <FAB
        icon="plus"
        label="New pack"
        style={[styles.fab, { bottom: 24 + insets.bottom }]}
        onPress={onCreate}
        loading={create.pending}
        disabled={create.pending}
      />
      <Snackbar visible={!!create.error} onDismiss={create.clearError} duration={4000}>
        {create.error ? `Could not create a pack: ${create.error}` : ''}
      </Snackbar>
    </Screen>
  );
}

const styles = StyleSheet.create({ fab: { position: 'absolute', right: 16 } });
