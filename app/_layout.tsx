import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorState, LoadingOverlay } from '@/components';
import { InstallErrorBanner, useBootstrap } from '@/features/packs';
import { darkTheme, lightTheme } from '@/theme/theme';

export default function RootLayout() {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? darkTheme : lightTheme;
  const { ready, installError, loadError, retry } = useBootstrap();

  let content;
  if (!ready) {
    content = <LoadingOverlay visible label="Loading packs…" />;
  } else if (loadError) {
    content = (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ErrorState title="Your packs could not be loaded" body={loadError.message} onRetry={retry} />
      </View>
    );
  } else {
    content = (
      <>
        <InstallErrorBanner error={installError} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: theme.colors.surface },
            headerTintColor: theme.colors.onSurface,
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        />
      </>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          {content}
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center' },
});
