import 'react-native-gesture-handler/jestSetup';

// Reanimated 4's mock imports react-native-worklets, whose native module is absent under Jest.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// @shopify/flash-list v2 (RecyclerView) measures its container and items via layout APIs
// that don't resolve in the Jest environment, so it renders zero rows without a fixed-size
// mock. The package ships `jestSetup.js`, but it aliases `FlashList` to a top-level
// `RecyclerView` export that 2.0.2 doesn't have (FlashList already *is* RecyclerView), which
// makes every FlashList render `undefined`. We only take the measurement mock it needs.
jest.mock('@shopify/flash-list/dist/recyclerview/utils/measureLayout', () => {
  const actual = jest.requireActual('@shopify/flash-list/dist/recyclerview/utils/measureLayout');
  return {
    ...actual,
    measureParentSize: jest.fn().mockReturnValue({ x: 0, y: 0, width: 390, height: 844 }),
    measureFirstChildLayout: jest.fn().mockReturnValue({ x: 0, y: 0, width: 390, height: 844 }),
    measureItemLayout: jest.fn().mockReturnValue({ x: 0, y: 0, width: 100, height: 100 }),
  };
});

// react-native-mmkv imports Nitro's native TurboModule at load time, which doesn't exist under
// Jest. Swap in the in-memory instance MMKV itself uses in test environments, so modules that
// import the app settings store (src/store/settingsStore.ts) load and behave like the real store.
jest.mock('react-native-mmkv', () => ({
  createMMKV: jest.requireActual('react-native-mmkv/lib/createMMKV/createMockMMKV').createMockMMKV,
}));

// react-native-drawer-layout (expo-router's Drawer) skips the deprecated InteractionManager on
// React Native >= 0.82, but Jest's mocked Platform reports version 1000.0.0, which the check
// treats as old, so it touches InteractionManager and logs a deprecation warning. Match what
// the app gets on RN 0.86.
// (The package's `exports` hide the file, so it is mocked by path.)
jest.mock('./node_modules/react-native-drawer-layout/lib/module/views/InteractionManager', () => ({ InteractionManager: undefined }));
