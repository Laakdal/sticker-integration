import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components';
import { DefaultAuthorField } from '@/features/settings';
import { useSettingsStore } from '@/store/settingsStore';

export default function NewPacksSettingsScreen() {
  const lastPublisher = useSettingsStore((s) => s.lastPublisher);
  const setSetting = useSettingsStore((s) => s.setSetting);

  return (
    <Screen scroll>
      <View style={styles.group}>
        <DefaultAuthorField value={lastPublisher} onSave={(author) => setSetting('lastPublisher', author)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ group: { padding: 16 } });
