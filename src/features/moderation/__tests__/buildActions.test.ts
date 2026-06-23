import { buildActions } from '../utils/buildActions';

jest.mock('@/lib/i18n', () => ({
  t: (key: string) => key,
}));

describe('buildActions', () => {
  it('returns 6 actions in fixed order', () => {
    const actions = buildActions('CrimsonFox42', 0);
    expect(actions.map((a) => a.action)).toEqual([
      'dismiss',
      'hide',
      'warn',
      'suspend',
      'ban',
      'csam',
    ]);
  });

  it('includes identifier in warn label', () => {
    const actions = buildActions('CrimsonFox42', 0);
    const warn = actions.find((a) => a.action === 'warn')!;
    expect(warn.label).toContain('CrimsonFox42');
  });

  it('uses fallback identifier when null', () => {
    const actions = buildActions(null, 0);
    const warn = actions.find((a) => a.action === 'warn')!;
    expect(warn.label).toContain('…');
  });

  describe('warn effect hint based on strike count', () => {
    it('shows strike1 effect when strikeCount is 0 (first warning)', () => {
      const actions = buildActions('CrimsonFox42', 0);
      const warn = actions.find((a) => a.action === 'warn')!;
      expect(warn.label).toContain('mod.action.warnEffect.strike1');
    });

    it('shows strike2 effect (auto-suspend) when strikeCount is 1', () => {
      const actions = buildActions('CrimsonFox42', 1);
      const warn = actions.find((a) => a.action === 'warn')!;
      expect(warn.label).toContain('mod.action.warnEffect.strike2');
    });

    it('shows strike3 effect (auto-ban) when strikeCount is 2', () => {
      const actions = buildActions('CrimsonFox42', 2);
      const warn = actions.find((a) => a.action === 'warn')!;
      expect(warn.label).toContain('mod.action.warnEffect.strike3');
    });

    it('shows strike3 effect (auto-ban) when strikeCount is already >= 3', () => {
      const actions = buildActions('CrimsonFox42', 3);
      const warn = actions.find((a) => a.action === 'warn')!;
      expect(warn.label).toContain('mod.action.warnEffect.strike3');
    });
  });

  it('marks destructive actions as destructive', () => {
    const actions = buildActions('x', 0);
    const non = actions.find((a) => a.action === 'dismiss')!;
    const dest = actions.find((a) => a.action === 'ban')!;
    expect(non.destructive).toBeFalsy();
    expect(dest.destructive).toBe(true);
  });
});
