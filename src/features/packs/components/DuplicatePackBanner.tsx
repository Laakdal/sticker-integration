import { Banner } from 'react-native-paper';

export function DuplicatePackBanner({ onDuplicate, pending }: { onDuplicate: () => void; pending: boolean }) {
  return (
    <Banner
      visible
      icon="lock-outline"
      actions={[{ label: 'Duplicate to edit', onPress: onDuplicate, disabled: pending, loading: pending }]}
    >
      Starter packs are read-only. You can still add this one to WhatsApp, or duplicate it to make changes.
    </Banner>
  );
}
