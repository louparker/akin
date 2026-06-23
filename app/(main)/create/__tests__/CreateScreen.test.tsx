// Verifies the composer resets to a blank slate after a successful post.
// Regression: the Write tab stays mounted, so local form state survived a
// submit and the next visit showed the just-posted draft.

import type { ReactTestInstance } from 'react-test-renderer';
import { renderWithProviders, fireEvent, waitFor } from '@/lib/test-utils';
import { t } from '@/lib/i18n';
import CreateScreen from '../index';

const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react') as typeof import('react');
  return {
    router: {
      replace: (...a: unknown[]) => {
        mockReplace(...a);
      },
      back: () => {
        mockBack();
      },
    },
    // Run the focus callback once on mount, like a focused screen.
    useFocusEffect: (cb: () => (() => void) | void) => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      React.useEffect(() => cb() ?? undefined);
    },
  };
});

const mockMutateAsync = jest.fn().mockResolvedValue({ id: 'new-post-1' });
jest.mock('@/features/post/api/useCreatePost', () => ({
  useCreatePost: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
  CreatePostError: class CreatePostError extends Error {},
}));

const mockRefreshProfile = jest.fn();
jest.mock('@/features/auth/store/useAuthStore', () => ({
  useAuthStore: Object.assign(
    (selector: (s: unknown) => unknown) =>
      selector({ profile: { active_post_count: 0, anonymous_identifier: 'CrimsonFox42' } }),
    { getState: () => ({ refreshProfile: mockRefreshProfile }) },
  ),
}));

const mockSetHighlightPostId = jest.fn();
jest.mock('@/features/feed/store/useFeedStore', () => ({
  useFeedStore: Object.assign(() => ({}), {
    getState: () => ({ setHighlightPostId: mockSetHighlightPostId }),
  }),
}));

const mockUiPrefs = { hasSeenCreateGuidelines: true, markCreateGuidelinesSeen: jest.fn() };
jest.mock('@/lib/uiPrefs', () => ({
  useUiPrefsStore: Object.assign(
    (selector: (s: typeof mockUiPrefs) => unknown) => selector(mockUiPrefs),
    { getState: () => mockUiPrefs },
  ),
}));

// Drive category selection without the real bottom sheet.
jest.mock('@/features/post/components/CategoryPickerSheet', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react') as typeof import('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native') as typeof import('react-native');
  return {
    CategoryPickerSheet: ({
      visible,
      onSelect,
    }: {
      visible: boolean;
      onSelect: (c: string) => void;
    }) =>
      visible
        ? React.createElement(RN.Pressable, {
            testID: 'mock-select-category',
            onPress: () => onSelect('vent_space'),
          })
        : null,
  };
});
jest.mock('@/features/post/components/GuidelinesSheet', () => ({ GuidelinesSheet: () => null }));
jest.mock('@/features/post/components/LimitActiveSheet', () => ({ LimitActiveSheet: () => null }));

beforeEach(() => jest.clearAllMocks());

describe('CreateScreen', () => {
  function fillAndSubmit(
    getByTestId: (id: string) => ReactTestInstance,
    getByLabelText: (l: string) => ReactTestInstance,
  ) {
    fireEvent.changeText(getByTestId('create-title-input'), 'A vent about a third date');
    fireEvent.changeText(getByTestId('create-body-input'), 'It started fine and then…');
    fireEvent.press(getByLabelText(t('create.category.label')));
    fireEvent.press(getByTestId('mock-select-category'));
    fireEvent.press(getByLabelText(t('create.submit')));
  }

  it('submits the trimmed post and navigates to its detail', async () => {
    const { getByTestId, getByLabelText } = renderWithProviders(<CreateScreen />);
    fillAndSubmit(getByTestId, getByLabelText);

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled());
    expect(mockMutateAsync).toHaveBeenCalledWith({
      title: 'A vent about a third date',
      body: 'It started fine and then…',
      category: 'vent_space',
    });
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(main)/post/new-post-1'));
  });

  it('highlights the new post and refreshes the profile on success', async () => {
    const { getByTestId, getByLabelText } = renderWithProviders(<CreateScreen />);
    fillAndSubmit(getByTestId, getByLabelText);

    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    expect(mockSetHighlightPostId).toHaveBeenCalledWith('new-post-1');
    expect(mockRefreshProfile).toHaveBeenCalled();
  });

  it('clears the form to a blank slate after a successful post', async () => {
    const { getByTestId, getByLabelText } = renderWithProviders(<CreateScreen />);
    fillAndSubmit(getByTestId, getByLabelText);

    await waitFor(() => expect(mockReplace).toHaveBeenCalled());

    await waitFor(() => {
      expect(getByTestId('create-title-input').props.value).toBe('');
      expect(getByTestId('create-body-input').props.value).toBe('');
    });
  });
});
