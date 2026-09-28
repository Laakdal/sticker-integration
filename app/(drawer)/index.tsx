import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';
import { FAB, Snackbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { Screen } from '@/components';
import { NewPackDialog, PackList, useNewPackFlow } from '@/features/packs';
import { selectBundledPacks, selectMyPacks } from '@/store/createPacksStore';
import { usePacksStore } from '@/store/packsStore';
import { useSettingsStore } from '@/store/settingsStore';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const myPacks = usePacksStore(useShallow(selectMyPacks));
  const bundledPacks = usePacksStore(useShallow(selectBundledPacks));
  const quarantined = usePacksStore((s) => s.quarantined);
  const createPack = usePacksStore((s) => s.createPack);
  const lastPublisher = useSettingsStore((s) => s.lastPublisher);
  const setSetting = useSettingsStore((s) => s.setSetting);
  const newPack = useNewPackFlow({
    createPack,
    lastPublisher,
    setLastPublisher: (publisher) => setSetting('lastPublisher', publisher),
  });

  async function onCreate(values: { name: string; publisher: string }) {
    const pack = await newPack.create(values);
    if (pack) router.push({ pathname: '/pack/[id]', params: { id: pack.id } });
  }

  return (
    <Screen>
      <PackList
        myPacks={myPacks}
        bundledPacks={bundledPacks}
        quarantined={quarantined}
        onOpenPack={(id) => router.push({ pathname: '/pack/[id]', params: { id } })}
      />
      <FAB icon="plus" label="New pack" style={[styles.fab, { bottom: 24 + insets.bottom }]} onPress={newPack.open} />
      <NewPackDialog
        visible={newPack.visible}
        initialPublisher={newPack.initialPublisher}
        pending={newPack.pending}
        onCancel={newPack.close}
        onCreate={onCreate}
      />
      <Snackbar visible={!!newPack.error} onDismiss={newPack.clearError} duration={4000}>
        {newPack.error ? `Could not create a pack: ${newPack.error}` : ''}
      </Snackbar>
    </Screen>
  );
}

const styles = StyleSheet.create({ fab: { position: 'absolute', right: 16 } });
