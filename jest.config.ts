import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
  // react-native's jest env hardcodes `customExportConditions = ['require', 'react-native']`,
  // which trips MSW's `"react-native": null` export and makes `msw/node` unresolvable.
  // Map the subpath imports we actually use to MSW's compiled node CJS entry.
  moduleNameMapper: {
    '^msw/node$': '<rootDir>/node_modules/msw/lib/node/index.js',
  },
  // jest-expo's preset transform regex (`\\.[jt]sx?$`) ignores `.mjs`, so ESM-only
  // packages pulled in by MSW (e.g. `rettime`) reach the runtime unparsed. Force
  // them through babel-jest using babel-preset-expo (caller `metro`).
  transform: {
    '\\.(js|jsx|ts|tsx|mjs)$': [
      'babel-jest',
      { caller: { name: 'metro', bundler: 'metro', platform: 'ios' } },
    ],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(\\.pnpm|react-native|@react-native|expo|@expo|rettime|@mswjs|msw|until-async|strict-event-emitter|outvariant|headers-polyfill))',
  ],
};

export default config;
