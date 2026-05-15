import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // Stub ViewConfigIgnore.js: uses Flow `const T:` generic syntax that
  // @babel/parser 7.28 doesn't support. Remove once Babel adds support.
  transform: {
    'ViewConfigIgnore\\.js$':
      '<rootDir>/src/__mocks__/ViewConfigIgnoreTransformer.js',
    '\\.[jt]sx?$': [
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
};

export default config;
