import type { ReactNode } from 'react';
import { ScrollView, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';

interface Props {
  children: ReactNode;
  scroll?: boolean;
  /** Extra style for the scroll content, e.g. bottom padding that keeps a FAB clear of the last row. */
  contentStyle?: StyleProp<ViewStyle>;
}

export function Screen({ children, scroll = false, contentStyle }: Props) {
  const { colors } = useTheme();
  const style = [styles.root, { backgroundColor: colors.background }];
  return scroll ? (
    <ScrollView style={style} contentContainerStyle={[styles.content, contentStyle]} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={style}>{children}</View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 }, content: { paddingBottom: 120 } });
