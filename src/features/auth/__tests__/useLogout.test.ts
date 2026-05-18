import { act, renderHook } from '@testing-library/react-native';
import { useLogout } from '../api/useLogout';
import { resetAllStores } from '@/lib/store-utils';

const mockSignOut = jest.fn().mockResolvedValue(undefined);
const mockClear = jest.fn();

jest.mock('@/features/auth/store/useAuthStore', () => ({
  useAuthStore: {
    getState: () => ({ signOut: mockSignOut }),
  },
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ clear: mockClear }),
}));

jest.mock('@/lib/store-utils', () => ({
  resetAllStores: jest.fn(),
  registerStore: jest.fn(),
}));

describe('useLogout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls signOut, resetAllStores, and queryClient.clear', async () => {
    const { result } = renderHook(() => useLogout());

    await act(async () => {
      await result.current.logout();
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(jest.mocked(resetAllStores)).toHaveBeenCalled();
    expect(mockClear).toHaveBeenCalled();
  });
});
