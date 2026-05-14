import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: '<rootDir>/jest.env.js',
  resolver: '<rootDir>/jest.resolver.js',
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'json'],
  // Stub ViewConfigIgnore.js: uses Flow `const T:` generic syntax that
  // @babel/parser 7.28 doesn't support. Remove once Babel adds support.
  // `.mjs` extension added so ESM-only transitive deps (e.g. rettime via MSW)
  // are downleveled to CJS for the Jest runtime.
  transform: {
    'ViewConfigIgnore\\.js$':
      '<rootDir>/src/__mocks__/ViewConfigIgnoreTransformer.js',
    '\\.m?[jt]sx?$': [
      'babel-jest',
      { caller: { name: 'metro', bundler: 'metro', platform: 'ios' } },
    ],
  },
  moduleNameMapper: {
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/features/(.*)$': '<rootDir>/src/features/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/i18n/(.*)$': '<rootDir>/src/i18n/$1',
    '^@/theme/(.*)$': '<rootDir>/src/theme/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
  },
  // pnpm nests packages under `node_modules/.pnpm/<pkg>/node_modules/<pkg>`,
  // and jest-expo's default ignore pattern matches the *inner* node_modules
  // segment — re-ignoring files we want transformed. Match only paths that
  // are NOT below a `.pnpm/` ancestor.
  transformIgnorePatterns: ['^(?!.*\\.pnpm\\/).*\\/node_modules\\/.*'],
};

export default config;
