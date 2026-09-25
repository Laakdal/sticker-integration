import { fireEvent, screen } from '@testing-library/react-native';

import { ValidationBar } from '@/features/packs/components/ValidationBar';
import { renderWithProviders } from '@/test-utils/render';

describe('ValidationBar', () => {
  it('shows the count and a ready message', async () => {
    await renderWithProviders(<ValidationBar count={5} issues={[]} />);
    expect(screen.getByText('5/30 stickers')).toBeTruthy();
    expect(screen.getByText('Ready for WhatsApp')).toBeTruthy();
  });

  it('summarizes issues and expands to list them', async () => {
    await renderWithProviders(
      <ValidationBar
        count={2}
        issues={[
          { code: 'PACK_TOO_FEW_STICKERS', message: 'Add at least 3 stickers (2/3).' },
          { code: 'TRAY_MISSING', message: 'Add a tray icon.' },
        ]}
      />,
    );
    expect(screen.getByText('2 issues to fix')).toBeTruthy();
    await fireEvent.press(screen.getByText('2 issues to fix'));
    expect(screen.getByText('Add a tray icon.')).toBeTruthy();
  });
});
