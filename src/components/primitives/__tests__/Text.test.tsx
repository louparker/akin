import { Text } from '@/components/primitives/Text';

// TODO(akin-1.5-rn-render): the real test should render <Text> via
// renderWithProviders and assert on the displayed string. Blocked on the
// jest-expo 55 / RN 0.83 Flow-source parsing issue tracked separately. For now
// we assert the export shape so Jest exercises the alias resolver, babel
// pipeline, and TS path through src/components/primitives.

describe('Text primitive', () => {
  it('exports a callable component', () => {
    expect(typeof Text).toBe('function');
  });
});
