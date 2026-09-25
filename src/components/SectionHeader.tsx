import { StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

export function SectionHeader({ title }: { title: string }) {
  return (
    <Text variant="titleSmall" style={styles.header} accessibilityRole="header">
      {title}
    </Text>
  );
}

const styles = StyleSheet.create({ header: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8, opacity: 0.8 } });
