import { fireEvent, screen } from '@testing-library/react-native';

import { PackDetailsDialog } from '@/features/packs/components/PackDetailsDialog';
import { renderWithProviders } from '@/test-utils/render';

type Props = Parameters<typeof PackDetailsDialog>[0];

function renderDialog(props: Partial<Props> = {}) {
  const onCancel = jest.fn();
  const onConfirm = jest.fn();
  const all: Props = {
    visible: true,
    title: 'Rename pack',
    confirmLabel: 'Save',
    initialName: 'Cats',
    initialPublisher: 'Janet',
    onCancel,
    onConfirm,
    ...props,
  };
  return { onCancel, onConfirm, all, rendered: renderWithProviders(<PackDetailsDialog {...all} />) };
}

describe('PackDetailsDialog', () => {
  it('shows its title and pre-fills both fields with counters', async () => {
    await renderDialog().rendered;
    expect(screen.getByText('Rename pack')).toBeTruthy();
    expect(screen.getByLabelText('Pack name')).toHaveDisplayValue('Cats');
    expect(screen.getByLabelText('Author')).toHaveDisplayValue('Janet');
    expect(screen.getByText('4/128')).toBeTruthy();
    expect(screen.getByText('5/128')).toBeTruthy();
  });

  it('disables the confirm button until something changed', async () => {
    await renderDialog().rendered;
    expect(screen.getByText('Save')).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Pack name'), '  Cats  ');
    expect(screen.getByText('Save')).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Pack name'), 'Dogs');
    expect(screen.getByText('Save')).toBeEnabled();
  });

  it('disables the confirm button while either field is blank', async () => {
    await renderDialog().rendered;
    await fireEvent.changeText(screen.getByLabelText('Pack name'), '   ');
    expect(screen.getByText('Save')).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Pack name'), 'Dogs');
    await fireEvent.changeText(screen.getByLabelText('Author'), '');
    expect(screen.getByText('Save')).toBeDisabled();
  });

  it('confirms with trimmed values', async () => {
    const { onConfirm, rendered } = renderDialog();
    await rendered;
    await fireEvent.changeText(screen.getByLabelText('Pack name'), '  Dogs ');
    await fireEvent.changeText(screen.getByLabelText('Author'), ' Bob  ');
    await fireEvent.press(screen.getByText('Save'));
    expect(onConfirm).toHaveBeenCalledWith({ name: 'Dogs', publisher: 'Bob' });
  });

  it('cancels without confirming', async () => {
    const { onCancel, onConfirm, rendered } = renderDialog();
    await rendered;
    await fireEvent.changeText(screen.getByLabelText('Pack name'), 'Dogs');
    await fireEvent.press(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('starts again from the initial values each time it reopens', async () => {
    const { all, rendered } = renderDialog();
    const { rerender } = await rendered;
    await fireEvent.changeText(screen.getByLabelText('Pack name'), 'Dogs');
    await rerender(<PackDetailsDialog {...all} visible={false} />);
    await rerender(<PackDetailsDialog {...all} initialName="Birds" />);
    expect(screen.getByLabelText('Pack name')).toHaveDisplayValue('Birds');
    expect(screen.getByLabelText('Author')).toHaveDisplayValue('Janet');
  });
});
