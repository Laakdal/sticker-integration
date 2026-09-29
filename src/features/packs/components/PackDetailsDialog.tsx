import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Dialog, HelperText, Portal, TextInput } from 'react-native-paper';

import { LIMITS } from '@/domain/limits';

export interface PackDetailsValues {
  name: string;
  publisher: string;
}

interface Props {
  visible: boolean;
  title: string;
  confirmLabel: string;
  /** The fields start from these values each time the dialog opens. */
  initialName: string;
  initialPublisher: string;
  pending?: boolean;
  onCancel: () => void;
  /** Receives trimmed values. */
  onConfirm: (values: PackDetailsValues) => void;
}

/**
 * Pack name + author dialog, shared by "New pack" and "Rename pack". Confirm stays disabled while
 * either trimmed field is empty or nothing differs from the initial values.
 */
export function PackDetailsDialog({ visible, title, confirmLabel, initialName, initialPublisher, pending = false, onCancel, onConfirm }: Props) {
  const [name, setName] = useState(initialName);
  const [publisher, setPublisher] = useState(initialPublisher);
  // Resets the draft to the initial values each time the dialog opens. Detecting the visibility
  // change during render avoids an effect that would only exist to call setState.
  const [syncedVisible, setSyncedVisible] = useState(visible);
  if (visible !== syncedVisible) {
    setSyncedVisible(visible);
    if (visible) {
      setName(initialName);
      setPublisher(initialPublisher);
    }
  }

  const trimmedName = name.trim();
  const trimmedPublisher = publisher.trim();
  const changed = trimmedName !== initialName || trimmedPublisher !== initialPublisher;
  const canConfirm = trimmedName.length > 0 && trimmedPublisher.length > 0 && changed;

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onCancel}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content style={styles.content}>
          <View>
            <TextInput
              mode="outlined"
              label="Pack name"
              accessibilityLabel="Pack name"
              value={name}
              onChangeText={setName}
              maxLength={LIMITS.maxTextLength}
            />
            <HelperText type="info" style={styles.counter}>{`${name.length}/${LIMITS.maxTextLength}`}</HelperText>
          </View>
          <View>
            <TextInput
              mode="outlined"
              label="Author"
              accessibilityLabel="Author"
              value={publisher}
              onChangeText={setPublisher}
              maxLength={LIMITS.maxTextLength}
            />
            <HelperText type="info" style={styles.counter}>{`${publisher.length}/${LIMITS.maxTextLength}`}</HelperText>
          </View>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onCancel}>Cancel</Button>
          <Button
            onPress={() => onConfirm({ name: trimmedName, publisher: trimmedPublisher })}
            disabled={!canConfirm || pending}
            loading={pending}
          >
            {confirmLabel}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({ content: { gap: 4 }, counter: { textAlign: 'right' } });
