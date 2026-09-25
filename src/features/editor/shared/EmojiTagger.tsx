import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, HelperText } from 'react-native-paper';
import EmojiPicker, { type EmojiType } from 'rn-emoji-keyboard';

import { LIMITS } from '@/domain/limits';

export function EmojiTagger({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const full = value.length >= LIMITS.maxEmojis;

  function onPick({ emoji }: Pick<EmojiType, 'emoji'>) {
    setOpen(false);
    if (!value.includes(emoji) && !full) onChange([...value, emoji]);
  }

  return (
    <View style={styles.root}>
      <View style={styles.row}>
        {value.map((emoji) => (
          <Chip
            key={emoji}
            onClose={() => onChange(value.filter((e) => e !== emoji))}
            closeIconAccessibilityLabel={`Remove ${emoji}`}
          >
            {emoji}
          </Chip>
        ))}
        <Button icon="emoticon-plus-outline" mode="outlined" onPress={() => setOpen(true)} disabled={full} accessibilityLabel="Add emoji">
          Add emoji
        </Button>
      </View>
      {value.length === 0 ? (
        <HelperText type="error">Add 1–3 emojis so WhatsApp can suggest this sticker.</HelperText>
      ) : null}
      <EmojiPicker open={open} onClose={() => setOpen(false)} onEmojiSelected={onPick} />
    </View>
  );
}

const styles = StyleSheet.create({ root: { gap: 4 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' } });
