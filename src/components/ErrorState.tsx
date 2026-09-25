import { StyleSheet, View } from 'react-native';
import { Button, Icon, Text } from 'react-native-paper';

export function ErrorState({ title, body, onRetry }: { title: string; body?: string; onRetry?: () => void }) {
  return (
    <View style={styles.root}>
      <Icon source="alert-circle-outline" size={48} />
      <Text variant="titleMedium">{title}</Text>
      {body ? <Text variant="bodyMedium" style={styles.body}>{body}</Text> : null}
      {onRetry ? <Button mode="contained-tonal" onPress={onRetry}>Try again</Button> : null}
    </View>
  );
}

const styles = StyleSheet.create({ root: { alignItems: 'center', padding: 32, gap: 8 }, body: { textAlign: 'center', opacity: 0.7 } });
