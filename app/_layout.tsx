import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorState, LoadingOverlay } from '@/components';
import { useBootstrap } from '@/features/packs';
import { darkTheme, lightTheme } from '@/theme/theme';

export default function RootLayout() {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? darkTheme : lightTheme;
  const { ready, installError } = useBootstrap();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          {ready ? (
            <>
              {installError ? <ErrorState title="Starter packs could not be installed" body={installError.message} /> : null}
              <Stack
                screenOptions={{
                  headerStyle: { backgroundColor: theme.colors.surface },
                  headerTintColor: theme.colors.onSurface,
                  contentStyle: { backgroundColor: theme.colors.background },
                }}
              />
            </>
          ) : (
            <LoadingOverlay visible label="Loading packs…" />
          )}
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
