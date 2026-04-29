/**
 * ESLint configuration for Akin.
 *
 * Non-default rules and why they're here:
 *   @typescript-eslint/recommended-type-checked  — enables type-aware rules (no-unsafe-*, no-floating-promises);
 *                                                   requires parserOptions.project
 *   react-native/all                             — catches RN-specific mistakes (deprecated APIs, raw strings, etc.)
 *   jsx-a11y/recommended                         — accessibility lint for interactive elements
 *   security/recommended-legacy                  — catches common injection and prototype-pollution patterns
 *   prettier (last)                              — disables all formatting rules; Prettier owns formatting
 *
 *   no-console [error]                           — use src/lib/logger.ts; console.log must never reach production
 *   @typescript-eslint/no-explicit-any [error]   — strict TypeScript; any leaks type safety across the codebase
 *   @typescript-eslint/no-unsafe-*  [error]      — companion to no-explicit-any; catches unsafe ops on any values
 *   @typescript-eslint/no-floating-promises      — unhandled promises are silent runtime bugs
 *   no-restricted-imports (react-native/Libraries/*) — private RN API; breaks on every RN upgrade
 */

/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: [
    'expo',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:react-native/all',
    'plugin:jsx-a11y/recommended',
    'plugin:security/recommended-legacy',
    'prettier', // must be last — disables rules that conflict with Prettier
  ],
  plugins: ['react-native', 'jsx-a11y', 'security'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname,
  },
  rules: {
    // No console.log in production code — use src/lib/logger.ts
    'no-console': 'error',

    // Strict TypeScript — no any, ever
    '@typescript-eslint/no-explicit-any': 'error',

    // Unsafe operations on any-typed values
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',
    '@typescript-eslint/no-unsafe-argument': 'error',

    // Unhandled promises are silent runtime bugs
    '@typescript-eslint/no-floating-promises': 'error',

    // React Native private API — breaks on every RN upgrade
    'no-restricted-imports': ['error', { patterns: ['react-native/Libraries/*'] }],

    // NativeWind uses className strings, not StyleSheet objects — these RN rules don't apply
    'react-native/no-inline-styles': 'warn', // warn rather than error; inline styles can appear in Reanimated
    'react-native/sort-styles': 'off', // not using StyleSheet objects
  },
  overrides: [
    {
      // Test and sandbox files: relax production-only rules
      files: [
        '**/__tests__/**/*.{ts,tsx}',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '__sandbox__/**/*.{ts,tsx}',
      ],
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        'security/detect-object-injection': 'off',
      },
    },
    {
      // Config files (JS, not TS): type-aware rules don't apply
      files: ['*.config.{js,cjs,mjs}', '.eslintrc.cjs'],
      parserOptions: { project: null },
      rules: {
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-require-imports': 'off',
      },
    },
  ],
  ignorePatterns: ['node_modules/', '.expo/', 'dist/', 'build/', 'coverage/'],
};
