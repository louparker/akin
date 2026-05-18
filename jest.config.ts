import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: '<rootDir>/jest.env.js',
  resolver: '<rootDir>/jest.resolver.js',
  testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/.claude/'],
  // Prevent jest-haste-map from scanning worktree directories inside .claude/.
  // Without this, duplicate __mocks__ files from other worktrees are found and
  // the wrong mock gets loaded, causing native-module crashes in the Jest runtime.
  modulePathIgnorePatterns: ['/.claude/'],
  watchPathIgnorePatterns: ['/.claude/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'json'],
  // Stub ViewConfigIgnore.js: uses Flow `const T:` generic syntax that
  // @babel/parser 7.28 doesn't support. Remove once Babel adds support.
  // `.mjs` extension added so ESM-only transitive deps (e.g. rettime via MSW)
  // are downleveled to CJS for the Jest runtime.
  transform: {
    'ViewConfigIgnore\\.js$': '<rootDir>/src/__mocks__/ViewConfigIgnoreTransformer.js',
    '\\.m?[jt]sx?$': [
      'babel-jest',
      { caller: { name: 'metro', bundler: 'metro', platform: 'ios' } },
    ],
  },
  moduleNameMapper: {
    // NativeWind global CSS import — no-op in Jest (styles applied via className at runtime)
    '\\.css$': '<rootDir>/src/__mocks__/fileMock.js',
    // react-native-reanimated: the official /mock entry transitively initialises
    // native Worklets which crashes in Jest. Use our hand-rolled stub instead.
    '^react-native-reanimated$': '<rootDir>/src/__mocks__/react-native-reanimated.ts',
    // Font and static asset files — return a stub module ID
    '\\.(ttf|otf|woff|woff2|png|jpg|jpeg|gif|svg)$': '<rootDir>/src/__mocks__/fileMock.js',
    // Pin MSW to its compiled CJS output, bypassing exports-map resolution.
    // MSW 2.x ships TS source in src/ which gets picked up by the resolver
    // under certain export-condition combinations.
    '^msw$': '<rootDir>/node_modules/msw/lib/core/index.js',
    '^msw/node$': '<rootDir>/node_modules/msw/lib/node/index.js',
    // MSW nests @open-draft/deferred-promise@3 which is ESM-only.
    // Pin to the hoisted v2 CJS build — exports are API-compatible (same
    // DeferredPromise + createDeferredExecutor symbols).
    '^@open-draft/deferred-promise$':
      '<rootDir>/node_modules/@open-draft/deferred-promise/build/index.js',
    // posthog-react-native is a native module that cannot run in Jest/Node.
    // Map it to the manual stub so jest.mock() factories in test files can
    // override the implementation without the resolver failing.
    '^posthog-react-native$': '<rootDir>/src/__mocks__/posthog-react-native.ts',
    // @sentry/react-native initialises native code on import — replace with the
    // hand-rolled stub for all Jest tests.
    '^@sentry/react-native$': '<rootDir>/src/__mocks__/@sentry/react-native.ts',
    // Path aliases
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/features/(.*)$': '<rootDir>/src/features/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/i18n/(.*)$': '<rootDir>/src/i18n/$1',
    '^@/theme/(.*)$': '<rootDir>/src/theme/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
  },
  // With node-linker=hoisted, packages live at node_modules/<pkg> with no
  // .pnpm/ ancestor. The original pnpm-isolated pattern ignored everything
  // in node_modules — correct for most packages but wrong for the RN/Expo
  // ecosystem which ships untransformed ESM/JSX. Use the jest-expo default
  // allowlist explicitly.
  // MSW is excluded here because its CJS output is pinned via moduleNameMapper.
  // rettime is an ESM-only transitive dep of MSW's compiled lib/ output —
  // it must be transformed even though it comes from node_modules.
  transformIgnorePatterns: [
    'node_modules/(?!' +
      [
        '(jest-)?react-native',
        '@react-native(-community)?',
        '@react-native/js-polyfills',
        'expo(nent)?',
        '@expo(nent)?/.*',
        '@expo-google-fonts/.*',
        'react-navigation',
        '@react-navigation/.*',
        '@unimodules/.*',
        'unimodules',
        'sentry-expo',
        'native-base',
        'react-native-svg',
        'rettime',
        // until-async ships index.js with ESM `export` syntax (no CJS build)
        'until-async',
      ].join('|') +
      ')',
  ],
};

export default config;
