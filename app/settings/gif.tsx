import { StyleSheet, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Screen } from '@/components';
import { ApiKeyField, ContentRatingPicker, ProviderSettings } from '@/features/settings';
import { envGifApiKey } from '@/services/gif/envKeys';
import { useSettingsStore } from '@/store/settingsStore';

export default function GifSettingsScreen() {
  const settings = useSettingsStore(
    useShallow(({ gifProvider, klipyApiKey, giphyApiKey, contentRating }) => ({
      gifProvider,
      klipyApiKey,
      giphyApiKey,
      contentRating,
    })),
  );
  const setSetting = useSettingsStore((s) => s.setSetting);

  return (
    <Screen scroll>
      <View style={styles.group}>
        <ProviderSettings value={settings.gifProvider} onChange={(v) => setSetting('gifProvider', v)} />
        <ApiKeyField
          label="Klipy API key"
          value={settings.klipyApiKey}
          envKeyFound={envGifApiKey('klipy') !== ''}
          onSave={(key) => setSetting('klipyApiKey', key)}
        />
        <ApiKeyField
          label="Giphy API key"
          value={settings.giphyApiKey}
          envKeyFound={envGifApiKey('giphy') !== ''}
          onSave={(key) => setSetting('giphyApiKey', key)}
        />
        <ContentRatingPicker value={settings.contentRating} onChange={(v) => setSetting('contentRating', v)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ group: { padding: 16, gap: 12 } });
