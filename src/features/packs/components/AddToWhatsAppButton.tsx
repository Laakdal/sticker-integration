import { Button } from 'react-native-paper';

export function AddToWhatsAppButton({ disabled, pending, onPress }: { disabled: boolean; pending: boolean; onPress: () => void }) {
  return (
    <Button
      mode="contained"
      icon="whatsapp"
      onPress={onPress}
      disabled={disabled || pending}
      loading={pending}
      accessibilityLabel="Add to WhatsApp"
    >
      Add to WhatsApp
    </Button>
  );
}
