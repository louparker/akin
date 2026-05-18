import { renderHook, act } from '@testing-library/react-native';
import * as ReactNative from 'react-native';
import { colors, darkColors } from '@/theme/colors';
import { useColorTokens } from '@/theme/useColorTokens';
import { useThemeStore } from '@/features/theme/store/useThemeStore';

describe('useColorTokens', () => {
  let colorSchemeSpy: jest.SpyInstance;

  beforeEach(() => {
    // jest-expo already mocks react-native; spy on useColorScheme within that mock.
    colorSchemeSpy = jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('light');
    act(() => {
      useThemeStore.setState({ preference: 'system' });
    });
  });

  afterEach(() => {
    colorSchemeSpy.mockRestore();
  });

  it('returns light tokens when system scheme is light and preference is system', () => {
    const { result } = renderHook(() => useColorTokens());
    expect(result.current).toStrictEqual(colors);
  });

  it('returns dark tokens when system scheme is dark and preference is system', () => {
    colorSchemeSpy.mockReturnValue('dark');
    const { result } = renderHook(() => useColorTokens());
    expect(result.current).toStrictEqual(darkColors);
  });

  it('user override "light" takes precedence over a dark system scheme', () => {
    colorSchemeSpy.mockReturnValue('dark');
    act(() => {
      useThemeStore.setState({ preference: 'light' });
    });
    const { result } = renderHook(() => useColorTokens());
    expect(result.current).toStrictEqual(colors);
  });

  it('user override "dark" takes precedence over a light system scheme', () => {
    act(() => {
      useThemeStore.setState({ preference: 'dark' });
    });
    const { result } = renderHook(() => useColorTokens());
    expect(result.current).toStrictEqual(darkColors);
  });
});
