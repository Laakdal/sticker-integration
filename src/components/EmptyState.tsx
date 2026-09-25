import { StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

export function EmptyState({ icon, title, body }: { icon: string; title: string; body?: string }) {
  return (
    <View style={styles.root}>
      <Icon source={icon} size={48} />
      <Text variant="titleMedium" style={styles.title}>
        {title}
      </Text>
      {body ? <Text variant="bodyMedium" style={styles.body}>{body}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', padding: 32, gap: 8 },
  title: { textAlign: 'center' },
  body: { textAlign: 'center', opacity: 0.7 },
});
