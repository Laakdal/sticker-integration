import { act, fireEvent, screen } from '@testing-library/react-native';

import { DefaultAuthorField } from '@/features/settings/components/DefaultAuthorField';
import { renderWithProviders } from '@/test-utils/render';

describe('DefaultAuthorField', () => {
  it('shows the current default author and limits its length', async () => {
    await renderWithProviders(<DefaultAuthorField value="Jane" onSave={jest.fn()} />);
    const input = screen.getByLabelText('Default author');
    expect(input.props.value).toBe('Jane');
    expect(input.props.maxLength).toBe(128);
  });

  it('keeps inner spaces while typing and saves the trimmed name on blur', async () => {
    const onSave = jest.fn();
    await renderWithProviders(<DefaultAuthorField value="" onSave={onSave} />);
    const input = screen.getByLabelText('Default author');
    await fireEvent.changeText(input, 'Jane ');
    expect(screen.getByLabelText('Default author').props.value).toBe('Jane ');
    await fireEvent.changeText(input, ' Jane Doe ');
    await fireEvent(input, 'blur');
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith('Jane Doe');
  });

  it('saves a pending edit when it unmounts', async () => {
    jest.useFakeTimers();
    try {
      const onSave = jest.fn();
      await renderWithProviders(<DefaultAuthorField value="" onSave={onSave} />);
      await fireEvent.changeText(screen.getByLabelText('Default author'), 'Ana ');
      await act(async () => screen.unmount());
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith('Ana');
    } finally {
      jest.useRealTimers();
    }
  });
});
