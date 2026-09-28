import { render } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { lightTheme } from '@/theme';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

function Providers({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <PaperProvider theme={lightTheme}>{children}</PaperProvider>
    </SafeAreaProvider>
  );
}

/** Renders inside the app providers; `rerender` keeps them. */
export function renderWithProviders(ui: ReactElement) {
  return render(ui, { wrapper: Providers });
}
