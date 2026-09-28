import { act, fireEvent, screen } from '@testing-library/react-native';

import { ApiKeyField } from '@/features/settings/components/ApiKeyField';
import { renderWithProviders } from '@/test-utils/render';

describe('ApiKeyField', () => {
  it('hides the key by default and toggles visibility with the eye button', async () => {
    await renderWithProviders(<ApiKeyField label="Klipy API key" value="secret" envKeyFound={false} onSave={jest.fn()} />);
    expect(screen.getByLabelText('Klipy API key').props.secureTextEntry).toBe(true);

    await fireEvent.press(screen.getByLabelText('Show Klipy API key'));
    expect(screen.getByLabelText('Klipy API key').props.secureTextEntry).toBe(false);

    await fireEvent.press(screen.getByLabelText('Hide Klipy API key'));
    expect(screen.getByLabelText('Klipy API key').props.secureTextEntry).toBe(true);
  });

  it('explains that an empty field falls back to the .env key, and whether one exists', async () => {
    await renderWithProviders(<ApiKeyField label="Klipy API key" value="" envKeyFound onSave={jest.fn()} />);
    expect(screen.getByText('Empty: uses the key from .env (.env key found)')).toBeTruthy();

    await screen.rerender(<ApiKeyField label="Klipy API key" value="" envKeyFound={false} onSave={jest.fn()} />);
    expect(screen.getByText('Empty: uses the key from .env (no .env key)')).toBeTruthy();
  });

  it('hides the .env hint while a key is entered', async () => {
    await renderWithProviders(<ApiKeyField label="Giphy API key" value="" envKeyFound onSave={jest.fn()} />);
    await fireEvent.changeText(screen.getByLabelText('Giphy API key'), 'abc');
    expect(screen.queryByText(/Empty: uses the key from \.env/)).toBeNull();
  });

  it('saves the trimmed key on blur', async () => {
    const onSave = jest.fn();
    await renderWithProviders(<ApiKeyField label="Giphy API key" value="" envKeyFound={false} onSave={onSave} />);
    const input = screen.getByLabelText('Giphy API key');
    await fireEvent.changeText(input, '  abc123  ');
    await fireEvent(input, 'blur');
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith('abc123');
    expect(screen.getByLabelText('Giphy API key').props.value).toBe('abc123');
  });

  it('does not save when the trimmed key is unchanged', async () => {
    const onSave = jest.fn();
    await renderWithProviders(<ApiKeyField label="Giphy API key" value="abc" envKeyFound={false} onSave={onSave} />);
    const input = screen.getByLabelText('Giphy API key');
    await fireEvent.changeText(input, ' abc ');
    await fireEvent(input, 'blur');
    expect(onSave).not.toHaveBeenCalled();
  });

  describe('while typing', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('saves the trimmed key once typing stops', async () => {
      const onSave = jest.fn();
      await renderWithProviders(<ApiKeyField label="Giphy API key" value="" envKeyFound={false} onSave={onSave} />);
      await fireEvent.changeText(screen.getByLabelText('Giphy API key'), 'key ');
      expect(onSave).not.toHaveBeenCalled();
      await act(async () => jest.advanceTimersByTime(400));
      expect(onSave).toHaveBeenCalledWith('key');
    });
  });
});
