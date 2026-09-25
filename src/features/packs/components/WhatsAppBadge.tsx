import { Chip } from 'react-native-paper';

export function WhatsAppBadge({ added }: { added: boolean }) {
  if (!added) return null;
  return (
    <Chip compact icon="whatsapp" accessibilityLabel="Added to WhatsApp">
      Added
    </Chip>
  );
}
