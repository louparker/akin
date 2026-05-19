import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFeedStore } from '../store/useFeedStore';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      setItem: jest.fn((k: string, v: string) => {
        store[k] = v;
        return Promise.resolve();
      }),
      getItem: jest.fn((k: string) => Promise.resolve(store[k] ?? null)),
      removeItem: jest.fn((k: string) => {
        delete store[k];
        return Promise.resolve();
      }),
      __store: store,
    },
  };
});

const STORAGE_KEY = 'akin.feedPrefs.v1';

beforeEach(() => {
  // Reset both the in-memory store and the mocked AsyncStorage between tests.
  useFeedStore.setState({ sort: 'recent', minSpice: 0, activeCategory: null });
  const mockStore = (AsyncStorage as unknown as { __store: Record<string, string> }).__store;
  for (const k of Object.keys(mockStore)) {
    delete mockStore[k];
  }
  jest.clearAllMocks();
});

describe('useFeedStore persistence', () => {
  it('writes sort changes to AsyncStorage under akin.feedPrefs.v1', async () => {
    useFeedStore.getState().setSort('spice');

    // Zustand persist writes asynchronously — flush microtasks.
    await new Promise((r) => setTimeout(r, 0));

    expect(AsyncStorage.setItem).toHaveBeenCalled();
    const calls = (AsyncStorage.setItem as jest.Mock).mock.calls;
    const persisted = calls.find(([k]) => k === STORAGE_KEY);
    expect(persisted).toBeDefined();
    const payload = JSON.parse(persisted![1] as string) as {
      state: { sort: string };
    };
    expect(payload.state.sort).toBe('spice');
  });

  it('persists category filter selection', async () => {
    useFeedStore.getState().setCategory('vent_space');

    await new Promise((r) => setTimeout(r, 0));

    const calls = (AsyncStorage.setItem as jest.Mock).mock.calls;
    const persisted = calls.find(([k]) => k === STORAGE_KEY);
    const payload = JSON.parse(persisted![1] as string) as {
      state: { activeCategory: string | null };
    };
    expect(payload.state.activeCategory).toBe('vent_space');
  });
});
