import { fireEvent, screen } from '@testing-library/react-native';

import { AddToWhatsAppButton } from '@/features/packs/components/AddToWhatsAppButton';
import { renderWithProviders } from '@/test-utils/render';

describe('AddToWhatsAppButton', () => {
  it('calls onPress when enabled', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<AddToWhatsAppButton disabled={false} pending={false} onPress={onPress} />);
    await fireEvent.press(screen.getByText('Add to WhatsApp'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is disabled while a request is pending', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<AddToWhatsAppButton disabled={false} pending onPress={onPress} />);
    expect(screen.getByRole('button', { name: 'Add to WhatsApp' })).toBeDisabled();
    await fireEvent.press(screen.getByText('Add to WhatsApp'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
