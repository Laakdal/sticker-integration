import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Dialog, HelperText, Portal, TextInput } from 'react-native-paper';

import { LIMITS } from '@/domain/limits';

interface Props {
  visible: boolean;
  /** Pre-fills the author field; the pack name always starts empty. */
  initialPublisher: string;
  pending: boolean;
  onCancel: () => void;
  onCreate: (values: { name: string; publisher: string }) => void;
}

export function NewPackDialog({ visible, initialPublisher, pending, onCancel, onCreate }: Props) {
  const [name, setName] = useState('');
  const [publisher, setPublisher] = useState(initialPublisher);
  // Resets the draft to a blank name and the current default author each time the dialog
  // opens. Detecting the visibility change during render avoids an effect that would only
  // exist to call setState.
  const [syncedVisible, setSyncedVisible] = useState(visible);
  if (visible !== syncedVisible) {
    setSyncedVisible(visible);
    if (visible) {
      setName('');
      setPublisher(initialPublisher);
    }
  }

  const trimmedName = name.trim();
  const trimmedPublisher = publisher.trim();
  const canCreate = trimmedName.length > 0 && trimmedPublisher.length > 0;

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onCancel}>
        <Dialog.Title>New pack</Dialog.Title>
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
          <Button onPress={() => onCreate({ name: trimmedName, publisher: trimmedPublisher })} disabled={!canCreate || pending} loading={pending}>
            Create
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({ content: { gap: 4 }, counter: { textAlign: 'right' } });
