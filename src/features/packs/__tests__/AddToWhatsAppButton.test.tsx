import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { AddToWhatsAppButton } from '@/features/packs/components/AddToWhatsAppButton';
import type { ValidationIssue } from '@/services/validation';
import { renderWithProviders } from '@/test-utils/render';

const ISSUES: ValidationIssue[] = [
  { code: 'PACK_TOO_FEW_STICKERS', message: 'Add at least 3 stickers (2/3).' },
  { code: 'TRAY_MISSING', message: 'Add a tray icon.' },
];

async function renderFab(props: Partial<{ added: boolean; issues: ValidationIssue[]; pending: boolean }> = {}) {
  const onAdd = jest.fn();
  await renderWithProviders(<AddToWhatsAppButton added={false} issues={[]} pending={false} onAdd={onAdd} {...props} />);
  return onAdd;
}

describe('AddToWhatsAppButton', () => {
  it('offers to add a pack that is not in WhatsApp yet', async () => {
    const onAdd = await renderFab();
    expect(screen.queryByText('Update in WhatsApp')).toBeNull();
    await fireEvent.press(screen.getByText('Add to WhatsApp'));
    expect(onAdd).toHaveBeenCalledWith({ force: false });
  });

  it('offers to update a pack that is already in WhatsApp and forces the re-send', async () => {
    const onAdd = await renderFab({ added: true });
    expect(screen.queryByText('Add to WhatsApp')).toBeNull();
    await fireEvent.press(screen.getByText('Update in WhatsApp'));
    expect(onAdd).toHaveBeenCalledWith({ force: true });
  });

  it('switches its label when the WhatsApp status changes', async () => {
    const onAdd = jest.fn();
    const { rerender } = await renderWithProviders(<AddToWhatsAppButton added={false} issues={[]} pending={false} onAdd={onAdd} />);
    expect(screen.getByText('Add to WhatsApp')).toBeTruthy();
    await rerender(<AddToWhatsAppButton added issues={[]} pending={false} onAdd={onAdd} />);
    expect(screen.getByText('Update in WhatsApp')).toBeTruthy();
  });

  it('lists the issues in a dialog instead of adding when the pack is not ready', async () => {
    const onAdd = await renderFab({ issues: ISSUES });
    expect(screen.getByRole('button', { name: 'Add to WhatsApp' })).not.toBeDisabled();
    await fireEvent.press(screen.getByText('Add to WhatsApp'));
    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByText('Not ready for WhatsApp yet')).toBeTruthy();
    expect(screen.getByText('Add at least 3 stickers (2/3).')).toBeTruthy();
    expect(screen.getByText('Add a tray icon.')).toBeTruthy();
    await fireEvent.press(screen.getByText('OK'));
    await waitFor(() => expect(screen.queryByText('Not ready for WhatsApp yet')).toBeNull());
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('is disabled while a request is pending', async () => {
    const onAdd = await renderFab({ pending: true });
    expect(screen.getByRole('button', { name: 'Add to WhatsApp' })).toBeDisabled();
    await fireEvent.press(screen.getByText('Add to WhatsApp'));
    expect(onAdd).not.toHaveBeenCalled();
  });
});
