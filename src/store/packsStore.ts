import { Paths } from 'expo-file-system';

import { expoFileStore } from '@/services/fs/expoFileStore';
import { newId } from '@/services/ids';
import { createPackStorage } from '@/services/packStorage';

import { createPacksStore } from './createPacksStore';

export const packStorage = createPackStorage(expoFileStore, Paths.document.uri);

export const usePacksStore = createPacksStore({
  storage: packStorage,
  newId,
  now: () => new Date(),
});
