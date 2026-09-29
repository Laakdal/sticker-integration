import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { PackSpeedDial } from '@/features/packs/components/PackSpeedDial';
import type { ValidationIssue } from '@/services/validation';
import { renderWithProviders } from '@/test-utils/render';

const ISSUES: ValidationIssue[] = [
  { code: 'PACK_TOO_FEW_STICKERS', message: 'Add at least 3 stickers (2/3).' },
  { code: 'TRAY_MISSING', message: 'Add a tray icon.' },
];

type Props = Parameters<typeof PackSpeedDial>[0];

async function renderDial(props: Partial<Props> = {}) {
  const onAdd = jest.fn();
  const onAddSticker = jest.fn();
  const all: Props = { added: false, issues: [], pending: false, onAdd, onAddSticker, ...props };
  const rendered = await renderWithProviders(<PackSpeedDial {...all} />);
  return { onAdd, onAddSticker, all, rendered };
}

/**
 * FAB.Group animates opening and closing and sets state when the closing animation ends. Fake timers
 * keep those frames from firing on their own (outside act) on a slow machine; this runs them inside act().
 */
async function settleAnimations() {
  await act(async () => jest.advanceTimersByTime(300));
}

async function openDial() {
  await fireEvent.press(screen.getByLabelText('Pack actions'));
  await settleAnimations();
  expect(screen.getByLabelText('Pack actions')).toBeExpanded();
}

/** FAB.Group hides its action labels from accessibility (the row itself carries the label), so press the label text directly. */
async function pressAction(label: string) {
  await fireEvent.press(screen.getByText(label, { includeHiddenElements: true }));
  await settleAnimations();
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('PackSpeedDial', () => {
  it('shows both actions once opened', async () => {
    await renderDial();
    expect(screen.queryByRole('button', { name: 'Add sticker' })).toBeNull();
    await openDial();
    expect(screen.getByRole('button', { name: 'Add sticker' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add to WhatsApp' })).toBeTruthy();
  });

  it('runs the add sticker action', async () => {
    const { onAddSticker, onAdd } = await renderDial();
    await openDial();
    await pressAction('Add sticker');
    expect(onAddSticker).toHaveBeenCalledTimes(1);
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('adds a pack that is not in WhatsApp yet', async () => {
    const { onAdd } = await renderDial();
    await openDial();
    expect(screen.queryByRole('button', { name: 'Update in WhatsApp' })).toBeNull();
    await pressAction('Add to WhatsApp');
    expect(onAdd).toHaveBeenCalledWith({ force: false });
  });

  it('updates a pack that is already in WhatsApp and forces the re-send', async () => {
    const { onAdd } = await renderDial({ added: true });
    await openDial();
    expect(screen.queryByRole('button', { name: 'Add to WhatsApp' })).toBeNull();
    await pressAction('Update in WhatsApp');
    expect(onAdd).toHaveBeenCalledWith({ force: true });
  });

  it('switches the WhatsApp label when the status changes', async () => {
    const { all, rendered } = await renderDial();
    await openDial();
    expect(screen.getByRole('button', { name: 'Add to WhatsApp' })).toBeTruthy();
    await rendered.rerender(<PackSpeedDial {...all} added />);
    expect(screen.getByRole('button', { name: 'Update in WhatsApp' })).toBeTruthy();
  });

  it('lists the issues in a dialog instead of adding when the pack is not ready', async () => {
    const { onAdd } = await renderDial({ issues: ISSUES });
    await openDial();
    await pressAction('Add to WhatsApp');
    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByText('Not ready for WhatsApp yet')).toBeTruthy();
    expect(screen.getByText('Add at least 3 stickers (2/3).')).toBeTruthy();
    expect(screen.getByText('Add a tray icon.')).toBeTruthy();
    await fireEvent.press(screen.getByText('OK'));
    await waitFor(() => expect(screen.queryByText('Not ready for WhatsApp yet')).toBeNull());
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('ignores the WhatsApp action while a request is pending', async () => {
    const { onAdd } = await renderDial({ pending: true });
    await openDial();
    await pressAction('Add to WhatsApp');
    expect(onAdd).not.toHaveBeenCalled();
  });
});
