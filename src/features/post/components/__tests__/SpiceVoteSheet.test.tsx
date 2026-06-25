import { Alert } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { a11yCheck } from '@/lib/test-utils';
import { t } from '@/lib/i18n';
import { SpiceVoteSheet } from '../SpiceVoteSheet';
import { VoteSpiceError } from '../../api/useVoteSpice';

const mockMutate = jest.fn();

jest.mock('@/features/post/api/useVoteSpice', () => ({
  VoteSpiceError: class VoteSpiceError extends Error {
    kind: 'participant_required' | 'unknown';

    constructor(kind: 'participant_required' | 'unknown', message: string) {
      super(message);
      this.name = 'VoteSpiceError';
      this.kind = kind;
    }
  },
  useVoteSpice: () => ({ mutate: mockMutate, isPending: false }),
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
  canVote: true,
  onClose: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

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

  it('explains that only active participants can vote before mutating', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { getAllByRole } = render(<SpiceVoteSheet {...BASE_PROPS} canVote={false} />, {
      wrapper: Wrapper,
    });

    fireEvent.press(getAllByRole('radio')[0]!);

    expect(mockMutate).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      t('spice.error.participantsOnly.title'),
      t('spice.error.participantsOnly.body'),
    );
    alertSpy.mockRestore();
  });

  it('maps participant RLS errors to the active-participants message', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockMutate.mockImplementation((_input, options) => {
      options.onError(new VoteSpiceError('participant_required', 'RLS blocked vote'));
    });
    const { getAllByRole } = render(<SpiceVoteSheet {...BASE_PROPS} />, { wrapper: Wrapper });

    fireEvent.press(getAllByRole('radio')[0]!);

    expect(alertSpy).toHaveBeenCalledWith(
      t('spice.error.participantsOnly.title'),
      t('spice.error.participantsOnly.body'),
    );
    alertSpy.mockRestore();
  });
});
