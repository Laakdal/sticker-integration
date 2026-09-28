import { useImperativeHandle, type Ref } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, TextInput } from 'react-native-paper';

import { LIMITS } from '@/domain/limits';
import type { Pack } from '@/domain/types';
import type { PackDetailsPatch } from '@/store/createPacksStore';

import { DETAILS_FIELDS, usePackDetailsDraft, type DetailsField } from '../hooks/usePackDetailsDraft';

const LABELS: Record<DetailsField, string> = { name: 'Pack name', publisher: 'Author' };

export interface PackDetailsFormHandle {
  /** Commits any pending edit now; resolves once the save has finished. */
  flush(): Promise<void>;
}

export function PackDetailsForm({
  pack,
  onSave,
  ref,
}: {
  pack: Pack;
  onSave: (patch: PackDetailsPatch) => unknown;
  ref?: Ref<PackDetailsFormHandle>;
}) {
  const draft = usePackDetailsDraft(pack, onSave);
  useImperativeHandle(ref, () => ({ flush: draft.flush }), [draft.flush]);

  return (
    <View style={styles.root}>
      {DETAILS_FIELDS.map((field) => (
        <View key={field}>
          <TextInput
            mode="outlined"
            label={LABELS[field]}
            accessibilityLabel={LABELS[field]}
            value={draft.values[field]}
            onChangeText={(text) => draft.change(field, text)}
            onFocus={() => draft.focus(field)}
            onBlur={() => draft.blur(field)}
            maxLength={LIMITS.maxTextLength}
          />
          <HelperText type="info" style={styles.counter}>{`${draft.values[field].length}/${LIMITS.maxTextLength}`}</HelperText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ root: { gap: 4 }, counter: { textAlign: 'right' } });
