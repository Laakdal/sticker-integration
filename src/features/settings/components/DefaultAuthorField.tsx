import { View } from 'react-native';
import { HelperText, TextInput } from 'react-native-paper';

import { LIMITS } from '@/domain/limits';
import { useTextDraft } from '../hooks/useTextDraft';

interface Props {
  value: string;
  onSave: (author: string) => void;
}

export function DefaultAuthorField({ value, onSave }: Props) {
  const { draft, change, focus, blur } = useTextDraft(value, onSave);

  return (
    <View>
      <TextInput
        mode="outlined"
        label="Default author"
        accessibilityLabel="Default author"
        value={draft}
        onChangeText={change}
        onFocus={focus}
        onBlur={blur}
        maxLength={LIMITS.maxTextLength}
        autoCapitalize="words"
      />
      <HelperText type="info">Pre-fills the author when you create a pack</HelperText>
    </View>
  );
}
