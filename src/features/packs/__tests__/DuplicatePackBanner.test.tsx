import { fireEvent, screen } from '@testing-library/react-native';

import { DuplicatePackBanner } from '@/features/packs/components/DuplicatePackBanner';
import { renderWithProviders } from '@/test-utils/render';

describe('DuplicatePackBanner', () => {
  it('duplicates on press', async () => {
    const onDuplicate = jest.fn();
    await renderWithProviders(<DuplicatePackBanner onDuplicate={onDuplicate} pending={false} />);
    await fireEvent.press(screen.getByText('Duplicate to edit'));
    expect(onDuplicate).toHaveBeenCalledTimes(1);
  });

  it('disables the action while a duplicate is in progress', async () => {
    const onDuplicate = jest.fn();
    await renderWithProviders(<DuplicatePackBanner onDuplicate={onDuplicate} pending />);
    await fireEvent.press(screen.getByText('Duplicate to edit'));
    expect(onDuplicate).not.toHaveBeenCalled();
  });
});
