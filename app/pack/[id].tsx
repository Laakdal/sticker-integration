import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Appbar, Snackbar, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmDialog, EmptyState, Screen, StickerImage } from '@/components';
import {
  AddToWhatsAppButton,
  isAddedAnywhere,
  PackDetailsForm,
  type PackDetailsFormHandle,
  StickerDetailsSheet,
  StickerGrid,
  useAddToWhatsApp,
  usePack,
  usePackValidation,
  useWhatsAppStatus,
} from '@/features/packs';
import { packStorage, usePacksStore } from '@/store/packsStore';

/** Room under the last row of stickers for the FAB (56 dp tall, 24 dp above the bottom) plus a gap. */
const FAB_CLEARANCE = 96;

export default function PackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pack = usePack(id);
  const { issues, validate } = usePackValidation(pack);
  const detailsRef = useRef<PackDetailsFormHandle>(null);
  const whatsapp = useAddToWhatsApp(pack, issues, {
    flush: () => detailsRef.current?.flush() ?? Promise.resolve(),
    readLatest: () => usePacksStore.getState().packs[id],
    validate,
  });
  const { status, refresh: refreshStatus } = useWhatsAppStatus(id, pack?.imageDataVersion ?? 0);
  const actions = usePacksStore.getState();
  const [openStickerId, setOpenStickerId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!pack) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Pack' }} />
        <EmptyState icon="package-variant-remove" title="This pack no longer exists" />
      </Screen>
    );
  }

  const openSticker = pack.stickers.find((s) => s.id === openStickerId) ?? null;
  const run = (task: Promise<unknown>) => task.catch((e: Error) => setError(e.message));
  const snackbar = whatsapp.message ?? error;
  const added = isAddedAnywhere(status);

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          title: pack.name,
          headerRight: () => <Appbar.Action icon="delete-outline" accessibilityLabel="Delete pack" onPress={() => setConfirmDelete(true)} />,
        }}
      />
      <Screen scroll contentStyle={{ paddingBottom: FAB_CLEARANCE + insets.bottom }}>
        <View style={styles.section}>
          <View style={styles.trayRow}>
            <StickerImage uri={packStorage.fileUri(pack.id, pack.trayIcon)} size={64} version={pack.imageDataVersion} animate={false} accessibilityLabel="Tray icon" />
            <Text variant="bodySmall" style={styles.trayHint}>
              {added ? 'Added to WhatsApp' : 'Tray icon shown in the WhatsApp sticker tray'}
            </Text>
          </View>
          <PackDetailsForm ref={detailsRef} pack={pack} onSave={(patch) => run(actions.updateDetails(pack.id, patch))} />
          <StickerGrid
            pack={pack}
            onReorder={(ids) => run(actions.reorderStickers(pack.id, ids))}
            onOpenSticker={setOpenStickerId}
          />
        </View>
      </Screen>
      <AddToWhatsAppButton
        added={added}
        issues={issues}
        pending={whatsapp.pending}
        onAdd={({ force }) => whatsapp.add({ force }).then(() => refreshStatus())}
        style={[styles.fab, { bottom: 24 + insets.bottom }]}
      />
      <StickerDetailsSheet
        pack={pack}
        sticker={openSticker}
        onDismiss={() => setOpenStickerId(null)}
        onSave={(patch) => {
          if (openSticker) run(actions.updateSticker(pack.id, openSticker.id, patch));
          setOpenStickerId(null);
        }}
        onDelete={() => {
          if (openSticker) run(actions.removeSticker(pack.id, openSticker.id));
          setOpenStickerId(null);
        }}
      />
      <ConfirmDialog
        visible={confirmDelete}
        title="Delete this pack?"
        body="The pack and its stickers are removed from this app. WhatsApp keeps any copy it already has until you remove it there."
        confirmLabel="Delete pack"
        destructive
        onDismiss={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          run(actions.deletePack(pack.id).then(() => router.back()));
        }}
      />
      <Snackbar
        visible={!!snackbar}
        onDismiss={() => {
          whatsapp.clearMessage();
          setError(null);
        }}
        duration={4000}
      >
        {snackbar ?? ''}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  section: { padding: 16, gap: 12 },
  trayRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  trayHint: { flex: 1, opacity: 0.7 },
  fab: { position: 'absolute', right: 16 },
});
