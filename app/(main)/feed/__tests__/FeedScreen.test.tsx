import { renderWithProviders, fireEvent } from '@/lib/test-utils';
import { t } from '@/lib/i18n';
import FeedScreen from '../index';
import { useFeedStore } from '@/features/feed/store/useFeedStore';

const mockPush = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@shopify/flash-list', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react') as typeof import('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native') as typeof import('react-native');
  return {
    FlashList: ({
      data,
      renderItem,
    }: {
      data: unknown[];
      renderItem: (info: { item: unknown }) => React.ReactNode;
    }) =>
      React.createElement(
        RN.View,
        null,
        data.map((item, index) =>
          React.createElement(React.Fragment, { key: index }, renderItem({ item })),
        ),
      ),
  };
});

jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react') as typeof import('react');
  return {
    router: {
      push: (...args: unknown[]) => {
        mockPush(...args);
      },
      navigate: (...args: unknown[]) => {
        mockNavigate(...args);
      },
    },
    useFocusEffect: (cb: () => (() => void) | void) => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      React.useEffect(() => cb() ?? undefined);
    },
  };
});

const mockRefetch = jest.fn();

jest.mock('@/features/feed/api/useFeed', () => ({
  useFeed: () => ({
    data: { pages: [{ data: [], nextCursor: null }] },
    isLoading: false,
    isError: false,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    refetch: mockRefetch,
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  useFeedStore.setState({
    sort: 'spice',
    minSpice: 5,
    activeCategory: null,
    highlightPostId: null,
  });
});

describe('FeedScreen — empty filtered state', () => {
  it('still opens the sort and filter sheet when no posts match', () => {
    const { getByRole, getByText } = renderWithProviders(<FeedScreen />);

    fireEvent.press(getByRole('button', { name: t('feed.sort.spice') }));

    expect(getByText(t('feed.filter.title'))).toBeOnTheScreen();
  });
});
