import { StyleSheet, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Screen, SectionHeader } from '@/components';
import {
  AboutSection,
  ApiKeyField,
  ContentRatingPicker,
  DefaultAuthorField,
  DisplaySettings,
  ProviderSettings,
} from '@/features/settings';
import { envGifApiKey } from '@/services/gif/envKeys';
import { useSettingsStore } from '@/store/settingsStore';
import { isDynamicColorSupported } from '@/theme';

export default function SettingsScreen() {
  const settings = useSettingsStore(
    useShallow(({ gifProvider, klipyApiKey, giphyApiKey, contentRating, reduceMotion, useDynamicColor, lastPublisher }) => ({
      gifProvider,
      klipyApiKey,
      giphyApiKey,
      contentRating,
      reduceMotion,
      useDynamicColor,
      lastPublisher,
    })),
  );
  const setSetting = useSettingsStore((s) => s.setSetting);

  return (
    <Screen scroll>
      <SectionHeader title="GIF search" />
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
      <SectionHeader title="Display" />
      <DisplaySettings
        useDynamicColor={settings.useDynamicColor}
        dynamicColorSupported={isDynamicColorSupported()}
        onChangeUseDynamicColor={(v) => setSetting('useDynamicColor', v)}
        reduceMotion={settings.reduceMotion}
        onChangeReduceMotion={(v) => setSetting('reduceMotion', v)}
      />
      <SectionHeader title="New packs" />
      <View style={styles.group}>
        <DefaultAuthorField value={settings.lastPublisher} onSave={(author) => setSetting('lastPublisher', author)} />
      </View>
      <SectionHeader title="About" />
      <AboutSection />
    </Screen>
  );
}

const styles = StyleSheet.create({ group: { paddingHorizontal: 16, gap: 12 } });
