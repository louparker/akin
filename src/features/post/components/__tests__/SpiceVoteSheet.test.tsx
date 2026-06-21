import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { a11yCheck } from '@/lib/test-utils';
import { SpiceVoteSheet } from '../SpiceVoteSheet';

jest.mock('@/features/post/api/useVoteSpice', () => ({
  useVoteSpice: () => ({ mutate: jest.fn(), isPending: false }),
}));

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={makeClient()}>{children}</QueryClientProvider>;
}

const BASE_PROPS = {
  postId: 'p1',
  visible: true,
  userVote: null,
  onClose: jest.fn(),
};

describe('SpiceVoteSheet — accessibility', () => {
  it('passes a11y checks when unvoted', () => {
    const { root } = render(<SpiceVoteSheet {...BASE_PROPS} />, { wrapper: Wrapper });
    expect(a11yCheck(root)).toEqual([]);
  });

  it('passes a11y checks when a vote is already cast', () => {
    const { root } = render(<SpiceVoteSheet {...BASE_PROPS} userVote={3} />, { wrapper: Wrapper });
    expect(a11yCheck(root)).toEqual([]);
  });

  it('each spice level row has a non-empty accessible label', () => {
    const { getAllByRole } = render(<SpiceVoteSheet {...BASE_PROPS} />, { wrapper: Wrapper });
    const radios = getAllByRole('radio');
    expect(radios.length).toBe(5);
    radios.forEach((radio) => {
      expect(radio.props.accessibilityLabel).toBeTruthy();
    });
  });
});
