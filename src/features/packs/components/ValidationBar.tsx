import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text, useTheme } from 'react-native-paper';

import { LIMITS } from '@/domain/limits';
import type { ValidationIssue } from '@/services/validation';

export function ValidationBar({ count, issues }: { count: number; issues: ValidationIssue[] }) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const ok = issues.length === 0;
  const summary = ok ? 'Ready for WhatsApp' : `${issues.length} ${issues.length === 1 ? 'issue' : 'issues'} to fix`;

  return (
    <View style={styles.root}>
      <Pressable
        style={styles.row}
        onPress={() => setExpanded((v) => !v)}
        disabled={ok}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <Icon source={ok ? 'check-circle' : 'alert-circle'} size={20} color={ok ? colors.primary : colors.error} />
        <Text variant="labelLarge">{summary}</Text>
        <Text variant="labelMedium" style={styles.count}>{`${count}/${LIMITS.maxStickers} stickers`}</Text>
      </Pressable>
      {expanded && !ok ? (
        <View style={styles.list}>
          {issues.map((issue, i) => (
            <View key={`${issue.code}-${issue.stickerId ?? i}`} style={styles.issueRow}>
              <Text variant="bodySmall">{'•'}</Text>
              <Text variant="bodySmall">{issue.message}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  count: { marginLeft: 'auto', opacity: 0.7 },
  list: { gap: 2, paddingLeft: 28 },
  issueRow: { flexDirection: 'row', gap: 6 },
});
