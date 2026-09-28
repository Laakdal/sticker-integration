import { fireEvent, screen } from '@testing-library/react-native';

import { NewPackDialog } from '@/features/packs/components/NewPackDialog';
import { renderWithProviders } from '@/test-utils/render';

describe('NewPackDialog', () => {
  it('pre-fills the author and shows counters, with an empty pack name', async () => {
    await renderWithProviders(
      <NewPackDialog visible initialPublisher="Jane" pending={false} onCancel={jest.fn()} onCreate={jest.fn()} />,
    );
    expect(screen.getByLabelText('Pack name')).toHaveDisplayValue('');
    expect(screen.getByLabelText('Author')).toHaveDisplayValue('Jane');
    expect(screen.getByText('0/128')).toBeTruthy();
    expect(screen.getByText('4/128')).toBeTruthy();
  });

  it('disables Create until both fields have non-whitespace text', async () => {
    await renderWithProviders(
      <NewPackDialog visible initialPublisher="" pending={false} onCancel={jest.fn()} onCreate={jest.fn()} />,
    );
    expect(screen.getByText('Create')).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Pack name'), 'Cats');
    expect(screen.getByText('Create')).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Author'), '   ');
    expect(screen.getByText('Create')).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Author'), 'Jane');
    expect(screen.getByText('Create')).toBeEnabled();
  });

  it('calls onCreate with trimmed values', async () => {
    const onCreate = jest.fn();
    await renderWithProviders(
      <NewPackDialog visible initialPublisher="Jane" pending={false} onCancel={jest.fn()} onCreate={onCreate} />,
    );
    await fireEvent.changeText(screen.getByLabelText('Pack name'), '  Cats  ');
    await fireEvent.press(screen.getByText('Create'));
    expect(onCreate).toHaveBeenCalledWith({ name: 'Cats', publisher: 'Jane' });
  });

  it('calls onCancel, not onCreate, when Cancel is pressed', async () => {
    const onCancel = jest.fn();
    const onCreate = jest.fn();
    await renderWithProviders(
      <NewPackDialog visible initialPublisher="Jane" pending={false} onCancel={onCancel} onCreate={onCreate} />,
    );
    await fireEvent.changeText(screen.getByLabelText('Pack name'), 'Cats');
    await fireEvent.press(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('starts fresh (empty name, pre-filled author) each time it reopens', async () => {
    const { rerender } = await renderWithProviders(
      <NewPackDialog visible initialPublisher="Jane" pending={false} onCancel={jest.fn()} onCreate={jest.fn()} />,
    );
    await fireEvent.changeText(screen.getByLabelText('Pack name'), 'Cats');
    await rerender(<NewPackDialog visible={false} initialPublisher="Jane" pending={false} onCancel={jest.fn()} onCreate={jest.fn()} />);
    await rerender(<NewPackDialog visible initialPublisher="Jane" pending={false} onCancel={jest.fn()} onCreate={jest.fn()} />);
    expect(screen.getByLabelText('Pack name')).toHaveDisplayValue('');
    expect(screen.getByLabelText('Author')).toHaveDisplayValue('Jane');
  });
});
