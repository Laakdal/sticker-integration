import { act, fireEvent, screen } from '@testing-library/react-native';
import { createRef } from 'react';

import { PackDetailsForm, type PackDetailsFormHandle } from '@/features/packs/components/PackDetailsForm';
import { makePack } from '@/test-utils/fixtures';
import { renderWithProviders } from '@/test-utils/render';

describe('PackDetailsForm', () => {
  it('saves trimmed changes on blur', async () => {
    const onSave = jest.fn();
    await renderWithProviders(<PackDetailsForm pack={makePack({ name: 'Old' })} onSave={onSave} />);
    const input = screen.getByLabelText('Pack name');
    await fireEvent.changeText(input, '  New name  ');
    await fireEvent(input, 'blur');
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({ name: 'New name' });
  });

  it('does not save unchanged values', async () => {
    const onSave = jest.fn();
    await renderWithProviders(<PackDetailsForm pack={makePack({ publisher: 'Me' })} onSave={onSave} />);
    await fireEvent(screen.getByLabelText('Author'), 'blur');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows the character counter with editable inputs', async () => {
    await renderWithProviders(<PackDetailsForm pack={makePack({ name: 'Cats' })} onSave={jest.fn()} />);
    expect(screen.getByText('4/128')).toBeTruthy();
    expect(screen.getByLabelText('Pack name')).toBeEnabled();
  });

  describe('debounced commits', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('commits trimmed values 400 ms after typing stops', async () => {
      const onSave = jest.fn();
      await renderWithProviders(<PackDetailsForm pack={makePack({ name: 'Old' })} onSave={onSave} />);
      await fireEvent.changeText(screen.getByLabelText('Pack name'), ' Ne');
      await act(async () => jest.advanceTimersByTime(300));
      await fireEvent.changeText(screen.getByLabelText('Pack name'), ' New ');
      await act(async () => jest.advanceTimersByTime(300));
      expect(onSave).not.toHaveBeenCalled();
      await act(async () => jest.advanceTimersByTime(100));
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith({ name: 'New' });
    });

    it('does not save when the typed value trims to the current value', async () => {
      const onSave = jest.fn();
      await renderWithProviders(<PackDetailsForm pack={makePack({ name: 'Old' })} onSave={onSave} />);
      await fireEvent.changeText(screen.getByLabelText('Pack name'), 'Old  ');
      await act(async () => jest.advanceTimersByTime(1000));
      expect(onSave).not.toHaveBeenCalled();
    });

    it('flushes a pending change on unmount', async () => {
      const onSave = jest.fn();
      const { unmount } = await renderWithProviders(<PackDetailsForm pack={makePack({ publisher: 'Me' })} onSave={onSave} />);
      await fireEvent.changeText(screen.getByLabelText('Author'), 'Someone');
      await unmount();
      expect(onSave).toHaveBeenCalledWith({ publisher: 'Someone' });
    });

    it('flushes a pending change through the ref and waits for the save', async () => {
      let finishSave: () => void = () => {};
      const onSave = jest.fn(() => new Promise<void>((r) => (finishSave = r)));
      const ref = createRef<PackDetailsFormHandle>();
      await renderWithProviders(<PackDetailsForm ref={ref} pack={makePack({ name: 'Old' })} onSave={onSave} />);
      await fireEvent.changeText(screen.getByLabelText('Pack name'), 'Renamed');
      let flushed = false;
      await act(async () => {
        void ref.current!.flush().then(() => (flushed = true));
      });
      expect(onSave).toHaveBeenCalledWith({ name: 'Renamed' });
      expect(flushed).toBe(false);
      await act(async () => finishSave());
      expect(flushed).toBe(true);
      await act(async () => jest.advanceTimersByTime(1000));
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('does not overwrite a field being edited when the other field changes', async () => {
      const onSave = jest.fn();
      const pack = makePack({ name: 'Old', publisher: 'Me' });
      const { rerender } = await renderWithProviders(<PackDetailsForm pack={pack} onSave={onSave} />);
      const name = screen.getByLabelText('Pack name');
      await fireEvent(name, 'focus');
      await fireEvent.changeText(name, 'Half-typ');
      await rerender(<PackDetailsForm pack={{ ...pack, publisher: 'Someone' }} onSave={onSave} />);
      expect(screen.getByLabelText('Pack name')).toHaveDisplayValue('Half-typ');
      expect(screen.getByLabelText('Author')).toHaveDisplayValue('Someone');
    });

    it('does not overwrite in-progress typing when its own debounced save round-trips', async () => {
      const onSave = jest.fn();
      const pack = makePack({ name: 'Old' });
      const { rerender } = await renderWithProviders(<PackDetailsForm pack={pack} onSave={onSave} />);
      const name = screen.getByLabelText('Pack name');
      await fireEvent(name, 'focus');
      await fireEvent.changeText(name, 'Ca');
      await act(async () => jest.advanceTimersByTime(400));
      await fireEvent.changeText(screen.getByLabelText('Pack name'), 'Cats ');
      await rerender(<PackDetailsForm pack={{ ...pack, name: 'Ca' }} onSave={onSave} />);
      expect(screen.getByLabelText('Pack name')).toHaveDisplayValue('Cats ');
    });

    it('takes an external change to a field that is not being edited', async () => {
      const pack = makePack({ name: 'Old' });
      const { rerender } = await renderWithProviders(<PackDetailsForm pack={pack} onSave={jest.fn()} />);
      await rerender(<PackDetailsForm pack={{ ...pack, name: 'Renamed elsewhere' }} onSave={jest.fn()} />);
      expect(screen.getByLabelText('Pack name')).toHaveDisplayValue('Renamed elsewhere');
    });
  });
});
