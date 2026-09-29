import { router, Stack } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import type { ComponentProps, ReactNode } from 'react';
import { Text, View } from 'react-native';
import { PaperProvider } from 'react-native-paper';

import { packStorage, usePacksStore } from '@/store/packsStore';
import { makePack } from '@/test-utils/fixtures';
import type { createMemoryFileStore } from '@/test-utils/memoryFileStore';
import { lightTheme } from '@/theme';

import * as PackScreen from '../../app/pack/[id]';

// The real store writes to expo-file-system; the screen runs against an in-memory copy instead.
jest.mock('@/store/packsStore', () => {
  const { createMemoryFileStore } = jest.requireActual('@/test-utils/memoryFileStore');
  const { createPackStorage } = jest.requireActual('@/services/packStorage');
  const { createPacksStore } = jest.requireActual('@/store/createPacksStore');
  const files = createMemoryFileStore();
  const storage = createPackStorage(files, 'file:///docs');
  return {
    memoryFiles: files,
    packStorage: storage,
    usePacksStore: createPacksStore({ storage, newId: () => 'new', now: () => new Date('2026-09-29T00:00:00.000Z') }),
  };
});

// react-native-sortables needs Reanimated's worklet runtime, which the Jest mock lacks; a plain grid is enough here.
jest.mock('react-native-sortables', () => ({
  __esModule: true,
  default: {
    Grid: ({ data, renderItem, keyExtractor }: { data: unknown[]; renderItem: (info: { item: unknown }) => ReactNode; keyExtractor: (item: unknown) => string }) =>
      data.map((item) => <MockView key={keyExtractor(item)}>{renderItem({ item })}</MockView>),
  },
}));

// babel-jest only lets jest.mock() factories reference out-of-scope variables prefixed with "mock".
const mockAddToWhatsApp = jest.fn();
const mockGetWhatsAppStatus = jest.fn();
jest.mock('@modules/sticker-provider', () => ({
  addToWhatsApp: (...args: unknown[]) => mockAddToWhatsApp(...args),
  getWhatsAppStatus: (...args: unknown[]) => mockGetWhatsAppStatus(...args),
}));

const { memoryFiles } = jest.requireMock<{ memoryFiles: ReturnType<typeof createMemoryFileStore> }>('@/store/packsStore');

const NOT_ADDED = { consumer: { installed: true, added: false }, business: { installed: false, added: false } };
const ADDED = { consumer: { installed: true, added: true }, business: { installed: false, added: false } };

function MockView(props: ComponentProps<typeof View>) {
  return <View {...props} />;
}

function TestLayout() {
  return (
    <PaperProvider theme={lightTheme}>
      <Stack />
    </PaperProvider>
  );
}

function HomeStub() {
  return <Text>Home screen</Text>;
}

/** Seeds pack `p1` (saved, so store mutations persist) and opens its screen above the home stub. */
async function openPack({ withTray = true, stickers = 3 } = {}) {
  const pack = makePack({ id: 'p1', name: 'Cats', publisher: 'Jane' }, stickers);
  await packStorage.save(pack);
  if (withTray) memoryFiles.files.set(packStorage.fileUri('p1', pack.trayIcon), 'x'.repeat(1000));
  usePacksStore.setState({ packs: { p1: pack } });
  const rendered = renderRouter({ _layout: TestLayout, index: HomeStub, 'pack/[id]': PackScreen }, { initialUrl: '/' });
  await rendered;
  await act(async () => router.push('/pack/p1'));
  await screen.findByLabelText('More options');
  return { pathname: () => rendered.getPathname() };
}

async function openMenu() {
  await fireEvent.press(screen.getByLabelText('More options'));
  await screen.findByText('Rename pack');
}

/**
 * FAB.Group animates opening and closing and sets state when the closing animation ends; renderRouter()
 * switches Jest to fake timers, so run those frames inside act() rather than letting them fire later.
 */
async function settleAnimations() {
  await act(async () => jest.advanceTimersByTime(300));
}

async function openSpeedDial() {
  await fireEvent.press(screen.getByLabelText('Pack actions'));
  await settleAnimations();
  expect(screen.getByLabelText('Pack actions')).toBeExpanded();
}

/** FAB.Group hides its action labels from accessibility (the row itself carries the label), so press the label text directly. */
async function pressAction(label: string) {
  await fireEvent.press(screen.getByText(label, { includeHiddenElements: true }));
  await settleAnimations();
}

beforeEach(() => {
  memoryFiles.files.clear();
  memoryFiles.dirs.clear();
  mockAddToWhatsApp.mockReset().mockResolvedValue({ status: 'added' });
  mockGetWhatsAppStatus.mockReset().mockResolvedValue(NOT_ADDED);
});

afterEach(() => jest.useRealTimers());

describe('pack screen', () => {
  describe('layout', () => {
    it('shows a "No stickers yet" empty state when the pack has no stickers', async () => {
      await openPack({ stickers: 0 });
      expect(screen.getByText('No stickers yet')).toBeTruthy();
    });

    it('never shows the tray row or its hint text', async () => {
      await openPack({ stickers: 0 });
      expect(screen.queryByText(/Tray icon shown in the WhatsApp sticker tray/)).toBeNull();
      expect(screen.queryByLabelText('Tray icon')).toBeNull();
    });

    it('shows no tray hint or empty state when the pack has stickers', async () => {
      await openPack();
      expect(screen.queryByText('No stickers yet')).toBeNull();
      expect(screen.queryByText(/Tray icon shown in the WhatsApp sticker tray/)).toBeNull();
      expect(screen.queryByText('Added to WhatsApp')).toBeNull();
      expect(screen.queryByLabelText('Tray icon')).toBeNull();
    });
  });

  describe('overflow menu', () => {
    it('offers Rename pack and Delete pack instead of an inline details form', async () => {
      await openPack();
      expect(screen.queryByLabelText('Pack name')).toBeNull();
      await openMenu();
      expect(screen.getByText('Rename pack')).toBeTruthy();
      expect(screen.getByText('Delete pack')).toBeTruthy();
    });

    it('renames the pack with trimmed values', async () => {
      await openPack();
      await openMenu();
      await fireEvent.press(screen.getByText('Rename pack'));
      expect(await screen.findByLabelText('Pack name')).toHaveDisplayValue('Cats');
      expect(screen.getByLabelText('Author')).toHaveDisplayValue('Jane');
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

      await fireEvent.changeText(screen.getByLabelText('Pack name'), '  Dogs ');
      await fireEvent.changeText(screen.getByLabelText('Author'), ' Bob ');
      await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => expect(usePacksStore.getState().packs.p1).toMatchObject({ name: 'Dogs', publisher: 'Bob' }));
      await waitFor(() => expect(screen.queryByLabelText('Pack name')).toBeNull());
    });

    it('keeps the details when the rename is cancelled', async () => {
      await openPack();
      const before = usePacksStore.getState().packs.p1;
      await openMenu();
      await fireEvent.press(screen.getByText('Rename pack'));
      await fireEvent.changeText(await screen.findByLabelText('Pack name'), 'Dogs');
      await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
      await waitFor(() => expect(screen.queryByLabelText('Pack name')).toBeNull());
      expect(usePacksStore.getState().packs.p1).toBe(before);
    });

    it('only asks for confirmation when Delete pack is chosen, and Cancel keeps the pack', async () => {
      const app = await openPack();
      const deletePack = jest.spyOn(usePacksStore.getState(), 'deletePack');
      await openMenu();
      await fireEvent.press(screen.getByText('Delete pack'));
      expect(await screen.findByText('Delete this pack?')).toBeTruthy();
      expect(deletePack).not.toHaveBeenCalled();

      await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
      await waitFor(() => expect(screen.queryByText('Delete this pack?')).toBeNull());
      expect(deletePack).not.toHaveBeenCalled();
      expect(usePacksStore.getState().packs.p1).toBeDefined();
      expect(app.pathname()).toBe('/pack/p1');
      deletePack.mockRestore();
    });

    it('deletes the pack and goes back once the deletion is confirmed', async () => {
      const app = await openPack();
      await openMenu();
      await fireEvent.press(screen.getByText('Delete pack'));
      await screen.findByText('Delete this pack?');
      await fireEvent.press(screen.getByRole('button', { name: 'Delete pack' }));
      await waitFor(() => expect(usePacksStore.getState().packs.p1).toBeUndefined());
      await waitFor(() => expect(app.pathname()).toBe('/'));
    });
  });

  describe('speed dial', () => {
    it('shows both actions when opened', async () => {
      await openPack();
      await openSpeedDial();
      expect(screen.getByRole('button', { name: 'Add sticker' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Add to WhatsApp' })).toBeTruthy();
    });

    it('tells that sticker creation is coming when Add sticker is chosen', async () => {
      await openPack();
      await openSpeedDial();
      await pressAction('Add sticker');
      expect(await screen.findByText('Sticker creation is coming in the next update')).toBeTruthy();
    });

    it('adds a valid pack to WhatsApp and refreshes the status', async () => {
      await openPack();
      await openSpeedDial();
      mockGetWhatsAppStatus.mockClear();
      await pressAction('Add to WhatsApp');
      await waitFor(() => expect(mockAddToWhatsApp).toHaveBeenCalledWith('p1', 'Cats', { force: false }));
      await waitFor(() => expect(mockGetWhatsAppStatus).toHaveBeenCalledWith('p1'));
      expect(await screen.findByText('Sticker pack added to WhatsApp.')).toBeTruthy();
    });

    it('offers Update in WhatsApp once WhatsApp has the pack and forces the re-send', async () => {
      mockGetWhatsAppStatus.mockResolvedValue(ADDED);
      await openPack();
      await waitFor(() => expect(mockGetWhatsAppStatus).toHaveBeenCalledWith('p1'));
      await openSpeedDial();
      await screen.findByRole('button', { name: 'Update in WhatsApp' });
      expect(screen.queryByRole('button', { name: 'Add to WhatsApp' })).toBeNull();
      await pressAction('Update in WhatsApp');
      await waitFor(() => expect(mockAddToWhatsApp).toHaveBeenCalledWith('p1', 'Cats', { force: true }));
    });

    it('explains the issues without calling WhatsApp when the pack is not ready', async () => {
      await openPack({ withTray: false });
      await openSpeedDial();
      await pressAction('Add to WhatsApp');
      expect(await screen.findByText('Not ready for WhatsApp yet')).toBeTruthy();
      expect(mockAddToWhatsApp).not.toHaveBeenCalled();
    });
  });
});
