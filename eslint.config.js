// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['android/*', 'dist/*'] },
  {
    files: ['**/__tests__/**', 'jest.setup.ts', 'src/test-utils/**'],
    languageOptions: { globals: globals.jest },
  },
  { files: ['scripts/**'], languageOptions: { globals: globals.node } },
]);
