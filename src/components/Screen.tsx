import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';

export function Screen({ children, scroll = false }: { children: ReactNode; scroll?: boolean }) {
  const { colors } = useTheme();
  const style = [styles.root, { backgroundColor: colors.background }];
  return scroll ? (
    <ScrollView style={style} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={style}>{children}</View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 }, content: { paddingBottom: 120 } });
