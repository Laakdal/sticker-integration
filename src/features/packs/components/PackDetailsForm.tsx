import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, TextInput } from 'react-native-paper';

import { LIMITS } from '@/domain/limits';
import type { Pack } from '@/domain/types';
import type { PackDetailsPatch } from '@/store/createPacksStore';

type Field = 'name' | 'publisher';
const LABELS: Record<Field, string> = { name: 'Pack name', publisher: 'Author' };
const detailsOf = (pack: Pack) => ({ name: pack.name, publisher: pack.publisher });

export function PackDetailsForm({ pack, readOnly, onSave }: { pack: Pack; readOnly: boolean; onSave: (patch: PackDetailsPatch) => void }) {
  const [values, setValues] = useState(detailsOf(pack));
  // Keeps local edits in sync with the canonical pack details (e.g. after our own trimmed
  // save round-trips through the store) without an effect: React's recommended alternative
  // to "adjust state when a prop changes" is to detect the change during render.
  const [synced, setSynced] = useState(detailsOf(pack));
  if (pack.name !== synced.name || pack.publisher !== synced.publisher) {
    setSynced(detailsOf(pack));
    setValues(detailsOf(pack));
  }

  function commit(field: Field) {
    const trimmed = values[field].trim();
    if (trimmed !== pack[field]) onSave({ [field]: trimmed });
  }

  return (
    <View style={styles.root}>
      {(['name', 'publisher'] as const).map((field) => (
        <View key={field}>
          <TextInput
            mode="outlined"
            label={LABELS[field]}
            accessibilityLabel={LABELS[field]}
            value={values[field]}
            onChangeText={(text) => setValues((v) => ({ ...v, [field]: text }))}
            onBlur={() => commit(field)}
            maxLength={LIMITS.maxTextLength}
            disabled={readOnly}
          />
          <HelperText type="info" style={styles.counter}>{`${values[field].length}/${LIMITS.maxTextLength}`}</HelperText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ root: { gap: 4 }, counter: { textAlign: 'right' } });
