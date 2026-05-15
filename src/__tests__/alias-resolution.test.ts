/**
 * Verifies that every path alias resolves correctly in Jest.
 * The stub files imported here are deleted once CI passes.
 */

describe('path alias resolution', () => {
  it('resolves @/components', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- dynamic alias check
    const mod = require('@/components/__stub__') as { STUB: string };
    expect(mod.STUB).toBe('components');
  });

  it('resolves @/features', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- dynamic alias check
    const mod = require('@/features/__stub__') as { STUB: string };
    expect(mod.STUB).toBe('features');
  });

  it('resolves @/lib', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- dynamic alias check
    const mod = require('@/lib/__stub__') as { STUB: string };
    expect(mod.STUB).toBe('lib');
  });

  it('resolves @/i18n', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- dynamic alias check
    const mod = require('@/i18n/__stub__') as { STUB: string };
    expect(mod.STUB).toBe('i18n');
  });

  it('resolves @/theme', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- dynamic alias check
    const mod = require('@/theme/__stub__') as { STUB: string };
    expect(mod.STUB).toBe('theme');
  });

  it('resolves @/types', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- dynamic alias check
    const mod = require('@/types/__stub__') as { STUB: string };
    expect(mod.STUB).toBe('types');
  });
});
