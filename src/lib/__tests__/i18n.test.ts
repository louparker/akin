// i18n integration with the locale store.
// The store overrides device locale; `t()` reads the active locale on each call.

import { useLocaleStore } from '@/features/locale/store/useLocaleStore';
import { t, getActiveLocale, DEVICE_LOCALE } from '../i18n';

jest.mock('expo-localization', () => ({
  __esModule: true,
  getLocales: jest.fn(() => [{ languageTag: 'en-GB' }]),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn(() => Promise.resolve()),
    getItem: jest.fn(() => Promise.resolve(null)),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

beforeEach(() => {
  useLocaleStore.setState({ preference: 'system' });
});

describe('getActiveLocale', () => {
  it('falls back to the device locale when preference is "system"', () => {
    useLocaleStore.setState({ preference: 'system' });
    expect(getActiveLocale()).toBe(DEVICE_LOCALE);
  });

  it('returns "en" when preference is "en"', () => {
    useLocaleStore.setState({ preference: 'en' });
    expect(getActiveLocale()).toBe('en');
  });

  it('returns "sv" when preference is "sv"', () => {
    useLocaleStore.setState({ preference: 'sv' });
    expect(getActiveLocale()).toBe('sv');
  });
});

describe('t()', () => {
  it('returns the English string when preference is "en"', () => {
    useLocaleStore.setState({ preference: 'en' });
    expect(t('settings.title')).toBe('Settings');
  });

  it('returns the Swedish string when preference is "sv"', () => {
    useLocaleStore.setState({ preference: 'sv' });
    expect(t('settings.title')).toBe('Inställningar');
  });

  it('reacts to preference changes at call time, not at module load', () => {
    useLocaleStore.setState({ preference: 'en' });
    const english = t('settings.title');
    useLocaleStore.setState({ preference: 'sv' });
    const swedish = t('settings.title');
    expect(english).not.toBe(swedish);
  });

  it('still interpolates variables', () => {
    useLocaleStore.setState({ preference: 'en' });
    const result = t('profile.joinedOn', { month: 'June 2026' });
    expect(result).toContain('June 2026');
  });
});
