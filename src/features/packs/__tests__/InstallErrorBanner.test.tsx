import { fireEvent, screen } from '@testing-library/react-native';

import { InstallErrorBanner } from '@/features/packs/components/InstallErrorBanner';
import { renderWithProviders } from '@/test-utils/render';

describe('InstallErrorBanner', () => {
  it('renders nothing without an error', async () => {
    await renderWithProviders(<InstallErrorBanner error={null} />);
    expect(screen.queryByText(/Starter packs could not be installed/)).toBeNull();
  });

  it('shows the error and can be dismissed', async () => {
    await renderWithProviders(<InstallErrorBanner error={new Error('disk full')} />);
    expect(screen.getByText('Starter packs could not be installed: disk full')).toBeTruthy();
    await fireEvent.press(screen.getByText('Dismiss'));
    expect(screen.queryByText(/Starter packs could not be installed/)).toBeNull();
  });
});
