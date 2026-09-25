import { Banner } from 'react-native-paper';

export function DuplicatePackBanner({ onDuplicate }: { onDuplicate: () => void }) {
  return (
    <Banner visible icon="lock-outline" actions={[{ label: 'Duplicate to edit', onPress: onDuplicate }]}>
      Starter packs are read-only. You can still add this one to WhatsApp, or duplicate it to make changes.
    </Banner>
  );
}
