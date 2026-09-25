import 'react-native-gesture-handler/jestSetup';

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
