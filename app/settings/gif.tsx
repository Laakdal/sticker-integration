import { StyleSheet, View } from 'react-native';
import { List } from 'react-native-paper';
import { useShallow } from 'zustand/react/shallow';

import { Screen } from '@/components';
import { ApiKeyField, ContentRatingPicker } from '@/features/settings';
import { useSettingsStore } from '@/store/settingsStore';

export default function GifSettingsScreen() {
  const settings = useSettingsStore(
    useShallow(({ klipyApiKey, giphyApiKey, contentRating }) => ({
      klipyApiKey,
      giphyApiKey,
      contentRating,
    })),
  );
  const setSetting = useSettingsStore((s) => s.setSetting);

  return (
    <Screen scroll>
      <List.Section title="Klipy">
        <View style={styles.group}>
          <ApiKeyField label="Klipy API key" value={settings.klipyApiKey} onSave={(key) => setSetting('klipyApiKey', key)} />
        </View>
      </List.Section>
      <List.Section title="Giphy">
        <View style={styles.group}>
          <ApiKeyField label="Giphy API key" value={settings.giphyApiKey} onSave={(key) => setSetting('giphyApiKey', key)} />
        </View>
      </List.Section>
      <List.Section title="Content rating">
        <View style={styles.group}>
          <ContentRatingPicker value={settings.contentRating} onChange={(v) => setSetting('contentRating', v)} />
        </View>
      </List.Section>
    </Screen>
  );
}

const styles = StyleSheet.create({ group: { paddingHorizontal: 16 } });
