import { useState } from 'react';
import { View } from 'react-native';
import { HelperText, TextInput } from 'react-native-paper';

import { useTextDraft } from '../hooks/useTextDraft';

interface Props {
  label: string;
  /** The saved override; empty means the key from .env is used. */
  value: string;
  /** Whether the build has a key for this provider in .env. */
  envKeyFound: boolean;
  onSave: (key: string) => void;
}

export function ApiKeyField({ label, value, envKeyFound, onSave }: Props) {
  const { draft, change, focus, blur } = useTextDraft(value, onSave);
  const [visible, setVisible] = useState(false);

  return (
    <View>
      <TextInput
        mode="outlined"
        label={label}
        accessibilityLabel={label}
        value={draft}
        onChangeText={change}
        onFocus={focus}
        onBlur={blur}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        right={
          <TextInput.Icon
            icon={visible ? 'eye-off' : 'eye'}
            accessibilityLabel={`${visible ? 'Hide' : 'Show'} ${label}`}
            forceTextInputFocus={false}
            onPress={() => setVisible((v) => !v)}
          />
        }
      />
      {draft.length === 0 ? (
        <HelperText type="info">{`Empty: uses the key from .env (${envKeyFound ? '.env key found' : 'no .env key'})`}</HelperText>
      ) : null}
    </View>
  );
}
