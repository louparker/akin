/**
 * lint-staged config
 *
 * Using a function for TypeScript files so we can filter out paths that
 * ESLint intentionally ignores (generated files, Deno Edge Functions).
 * Without this, ESLint v8 emits "File ignored" warnings for those paths
 * when lint-staged passes them explicitly, which breaks --max-warnings 0.
 */

/** Files that match ESLint's ignorePatterns and must be excluded manually. */
const ESLINT_IGNORED_PREFIXES = ['src/types/database.ts', 'supabase/functions/'];

module.exports = {
  '*.{ts,tsx}': (files) => {
    const lintable = files.filter(
      (f) => !ESLINT_IGNORED_PREFIXES.some((prefix) => f.includes(prefix)),
    );
    const cmds = [];
    if (lintable.length > 0) {
      cmds.push(`eslint --max-warnings 0 ${lintable.join(' ')}`);
    }
    // Prettier runs on all staged TS/TSX files (including generated/Deno — formatting is fine)
    cmds.push(`prettier --write ${files.join(' ')}`);
    return cmds;
  },
  '*.{js,jsx,json,md,yaml,yml}': ['prettier --write'],
};
