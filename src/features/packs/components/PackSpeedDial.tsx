import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Dialog, FAB, Portal, Text } from 'react-native-paper';

import type { ValidationIssue } from '@/services/validation';

interface Props {
  /** The pack is already in an installed WhatsApp: the action re-sends it as an update. */
  added: boolean;
  issues: ValidationIssue[];
  /** A WhatsApp request is in flight; the WhatsApp action ignores presses until it ends. */
  pending: boolean;
  onAddSticker: () => void;
  onAdd: (options: { force: boolean }) => void;
}

/**
 * The pack screen's "+" speed dial: add a sticker, or add/update the pack in WhatsApp. When the
 * pack still has issues, the WhatsApp action lists them instead of calling WhatsApp.
 * FAB.Group fills its parent, pads itself by the safe-area insets and themes its own backdrop.
 */
export function PackSpeedDial({ added, issues, pending, onAddSticker, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [showIssues, setShowIssues] = useState(false);
  const whatsappLabel = added ? 'Update in WhatsApp' : 'Add to WhatsApp';

  function onWhatsApp() {
    if (pending) return;
    if (issues.length > 0) setShowIssues(true);
    else onAdd({ force: added });
  }

  return (
    <>
      <FAB.Group
        open={open}
        visible
        icon={open ? 'close' : 'plus'}
        accessibilityLabel="Pack actions"
        onStateChange={({ open: next }) => setOpen(next)}
        actions={[
          { icon: 'sticker-plus-outline', label: 'Add sticker', onPress: onAddSticker },
          { icon: 'whatsapp', label: whatsappLabel, onPress: onWhatsApp },
        ]}
      />
      <Portal>
        <Dialog visible={showIssues} onDismiss={() => setShowIssues(false)}>
          <Dialog.Title>Not ready for WhatsApp yet</Dialog.Title>
          <Dialog.Content style={styles.list}>
            {issues.map((issue, i) => (
              <View key={`${issue.code}-${issue.stickerId ?? i}`} style={styles.issueRow}>
                <Text variant="bodyMedium">{'•'}</Text>
                <Text variant="bodyMedium" style={styles.issueText}>
                  {issue.message}
                </Text>
              </View>
            ))}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowIssues(false)}>OK</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  list: { gap: 6 },
  issueRow: { flexDirection: 'row', gap: 8 },
  issueText: { flex: 1 },
});
