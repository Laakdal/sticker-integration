import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, Modal, Portal, Text, TextInput, useTheme } from 'react-native-paper';

import { ConfirmDialog, StickerImage } from '@/components';
import { LIMITS } from '@/domain/limits';
import type { Pack, Sticker } from '@/domain/types';
import { EmojiTagger } from '@/features/editor';
import type { StickerPatch } from '@/store/createPacksStore';
import { packStorage } from '@/store/packsStore';

interface Props {
  pack: Pack;
  sticker: Sticker | null;
  onSave: (patch: StickerPatch) => void;
  onDelete: () => void;
  onDismiss: () => void;
}

export function StickerDetailsSheet({ pack, sticker, onSave, onDelete, onDismiss }: Props) {
  const { colors } = useTheme();
  const [emojis, setEmojis] = useState<string[]>(sticker?.emojis ?? []);
  const [a11y, setA11y] = useState(sticker?.accessibilityText ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Resets the edit buffers when a different sticker (or none) is opened. Detecting the
  // prop change during render avoids an effect that would only exist to call setState.
  const [syncedSticker, setSyncedSticker] = useState(sticker);
  if (sticker !== syncedSticker) {
    setSyncedSticker(sticker);
    setEmojis(sticker?.emojis ?? []);
    setA11y(sticker?.accessibilityText ?? '');
  }

  if (!sticker) return null;
  const a11yMax = sticker.animated ? LIMITS.animatedA11yMaxLength : LIMITS.staticA11yMaxLength;

  return (
    <Portal>
      <Modal visible onDismiss={onDismiss} contentContainerStyle={[styles.sheet, { backgroundColor: colors.surface }]}>
        <View style={styles.preview}>
          <StickerImage uri={packStorage.fileUri(pack.id, sticker.file)} size={160} version={pack.imageDataVersion} />
          <Text variant="labelSmall">{`${Math.ceil(sticker.sizeBytes / 1024)} KB · ${sticker.animated ? 'animated' : 'static'}`}</Text>
        </View>
        <EmojiTagger value={emojis} onChange={setEmojis} />
        <TextInput
          mode="outlined"
          label="Accessibility text"
          accessibilityLabel="Accessibility text"
          value={a11y}
          onChangeText={setA11y}
          maxLength={a11yMax}
          multiline
        />
        <HelperText type="info">{`Describes the sticker for screen readers. ${a11y.length}/${a11yMax}`}</HelperText>
        <View style={styles.actions}>
          <Button textColor={colors.error} onPress={() => setConfirmDelete(true)}>
            Delete
          </Button>
          <Button mode="contained" onPress={() => onSave({ emojis, accessibilityText: a11y.trim() || undefined })}>
            Save
          </Button>
        </View>
      </Modal>
      <ConfirmDialog
        visible={confirmDelete}
        title="Delete sticker?"
        body="This removes the sticker from the pack."
        confirmLabel="Delete sticker"
        destructive
        onConfirm={() => {
          setConfirmDelete(false);
          onDelete();
        }}
        onDismiss={() => setConfirmDelete(false)}
      />
    </Portal>
  );
}

const styles = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 20, gap: 12, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  preview: { alignItems: 'center', gap: 4 },
  actions: { flexDirection: 'row', justifyContent: 'space-between' },
});
