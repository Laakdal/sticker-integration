import { useState } from 'react';
import { View } from 'react-native';
import { Banner, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Non-blocking notice shown above the navigator when bundled packs failed to install. */
export function InstallErrorBanner({ error }: { error: Error | null }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [dismissed, setDismissed] = useState(false);
  if (!error || dismissed) return null;
  return (
    <View style={{ paddingTop: insets.top, backgroundColor: colors.elevation.level1 }}>
      <Banner visible icon="alert-circle-outline" actions={[{ label: 'Dismiss', onPress: () => setDismissed(true) }]}>
        {`Starter packs could not be installed: ${error.message}`}
      </Banner>
    </View>
  );
}
