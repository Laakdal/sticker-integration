import { fireEvent, screen } from '@testing-library/react-native';

import { PackDetailsForm } from '@/features/packs/components/PackDetailsForm';
import { makePack } from '@/test-utils/fixtures';
import { renderWithProviders } from '@/test-utils/render';

describe('PackDetailsForm', () => {
  it('saves trimmed changes on blur', async () => {
    const onSave = jest.fn();
    await renderWithProviders(<PackDetailsForm pack={makePack({ name: 'Old' })} readOnly={false} onSave={onSave} />);
    const input = screen.getByLabelText('Pack name');
    await fireEvent.changeText(input, '  New name  ');
    await fireEvent(input, 'blur');
    expect(onSave).toHaveBeenCalledWith({ name: 'New name' });
  });

  it('does not save unchanged values', async () => {
    const onSave = jest.fn();
    await renderWithProviders(<PackDetailsForm pack={makePack({ publisher: 'Me' })} readOnly={false} onSave={onSave} />);
    await fireEvent(screen.getByLabelText('Author'), 'blur');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows the character counter and disables inputs when read-only', async () => {
    await renderWithProviders(<PackDetailsForm pack={makePack({ name: 'Cats' })} readOnly onSave={jest.fn()} />);
    expect(screen.getByText('4/128')).toBeTruthy();
    expect(screen.getByLabelText('Pack name')).toBeDisabled();
  });
});
