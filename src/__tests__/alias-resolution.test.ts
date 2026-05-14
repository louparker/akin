// STUB-1.4: delete once this test has passed in CI alongside the stub files in
// each src/<alias>/ directory. Task 1.5 wires up Jest; this file proves the
// path aliases resolve in TypeScript, the bundler, and Jest.

import { __aliasStub__components } from '@/components/_alias-stub';
import { __aliasStub__features } from '@/features/_alias-stub';
import { __aliasStub__lib } from '@/lib/_alias-stub';
import { __aliasStub__i18n } from '@/i18n/_alias-stub';
import { __aliasStub__theme } from '@/theme/_alias-stub';
import { __aliasStub__types } from '@/types/_alias-stub';

describe('path alias resolution', () => {
  it('resolves every @/ alias declared in tsconfig and babel.config.js', () => {
    expect(__aliasStub__components).toBe('components');
    expect(__aliasStub__features).toBe('features');
    expect(__aliasStub__lib).toBe('lib');
    expect(__aliasStub__i18n).toBe('i18n');
    expect(__aliasStub__theme).toBe('theme');
    expect(__aliasStub__types).toBe('types');
  });
});
