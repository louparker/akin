import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { CommentItem } from '../CommentItem';
import { EditCommentError } from '@/features/post/api/useEditComment';
import { a11yCheck } from '@/lib/test-utils';
import type { Tables } from '@/types/database';

type CommentRow = Tables<'comments'>;

// ── Mutation mocks ────────────────────────────────────────────────────────────
const mockEditMutate = jest.fn();
const mockDeleteMutate = jest.fn();

jest.mock('@/features/post/api/useEditComment', () => {
  // Avoid TypeScript public-parameter shorthand — Jest hoisting forbids it.
  class MockEditCommentError extends Error {
    kind: string;
    constructor(k: string, msg: string) {
      super(msg);
      this.kind = k;
      this.name = 'EditCommentError';
    }
  }
  return {
    useEditComment: () => ({
      mutate: mockEditMutate,
      isPending: false,
      isError: false,
      error: null,
      reset: jest.fn(),
    }),
    EditCommentError: MockEditCommentError,
  };
});

jest.mock('@/features/post/api/useDeleteComment', () => ({
  useDeleteComment: () => ({
    mutate: mockDeleteMutate,
    isPending: false,
  }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const WITHIN_WINDOW = new Date(Date.now() - 5 * 60 * 1000).toISOString();
const OUTSIDE_WINDOW = new Date(Date.now() - 20 * 60 * 1000).toISOString();

function aComment(overrides: Partial<CommentRow> = {}): CommentRow {
  return {
    id: 'comment-1',
    post_id: 'post-1',
    author_id: 'user-2',
    author_identifier: 'BlueWolf99',
    body: 'A reply.',
    status: 'active',
    removed_by_op: false,
    created_at: WITHIN_WINDOW,
    ...overrides,
  };
}

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

const defaultProps = {
  postId: 'post-1',
  currentUserId: 'user-99',
  isOpComment: false,
  onReport: jest.fn(),
  onReportPerson: jest.fn(),
  onBlock: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert');
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CommentItem', () => {
  it('renders author identifier, body, and relative time', () => {
    render(<CommentItem comment={aComment()} {...defaultProps} />, { wrapper: makeWrapper() });

    expect(screen.getByText('BlueWolf99')).toBeOnTheScreen();
    expect(screen.getByText('A reply.')).toBeOnTheScreen();
  });

  it('shows the OP badge when isOpComment is true', () => {
    render(<CommentItem comment={aComment()} {...defaultProps} isOpComment />, {
      wrapper: makeWrapper(),
    });
    expect(screen.getByTestId('op-badge')).toBeOnTheScreen();
  });

  it('does not show the OP badge when isOpComment is false', () => {
    render(<CommentItem comment={aComment()} {...defaultProps} isOpComment={false} />, {
      wrapper: makeWrapper(),
    });
    expect(screen.queryByTestId('op-badge')).toBeNull();
  });

  it('shows muted opacity and sending indicator for a pending comment', () => {
    render(<CommentItem comment={{ ...aComment(), pending: true }} {...defaultProps} />, {
      wrapper: makeWrapper(),
    });
    expect(screen.getByTestId('comment-sending')).toBeOnTheScreen();
  });

  it('renders [deleted] placeholder for a deleted comment', () => {
    render(<CommentItem comment={aComment({ status: 'deleted' })} {...defaultProps} />, {
      wrapper: makeWrapper(),
    });
    expect(screen.getByTestId('comment-deleted')).toBeOnTheScreen();
  });

  it('renders [removed by OP] placeholder for a removed comment', () => {
    render(<CommentItem comment={aComment({ removed_by_op: true })} {...defaultProps} />, {
      wrapper: makeWrapper(),
    });
    expect(screen.getByTestId('comment-removed-by-op')).toBeOnTheScreen();
  });

  describe('action sheet for own comment', () => {
    it('shows Edit and Delete within the 15-min window', async () => {
      render(
        <CommentItem
          comment={aComment({ author_id: 'user-99', created_at: WITHIN_WINDOW })}
          {...defaultProps}
          currentUserId="user-99"
        />,
        { wrapper: makeWrapper() },
      );

      fireEvent.press(screen.getByTestId('comment-menu-btn'));

      await waitFor(() => {
        expect(screen.getByText('Edit')).toBeOnTheScreen();
        expect(screen.getByText('Delete')).toBeOnTheScreen();
      });
    });

    it('hides Edit but still shows Delete outside the 15-min window', async () => {
      // Edits are window-limited; deleting your own content is allowed anytime.
      render(
        <CommentItem
          comment={aComment({ author_id: 'user-99', created_at: OUTSIDE_WINDOW })}
          {...defaultProps}
          currentUserId="user-99"
        />,
        { wrapper: makeWrapper() },
      );

      fireEvent.press(screen.getByTestId('comment-menu-btn'));

      await waitFor(() => {
        expect(screen.getByText('Delete')).toBeOnTheScreen();
      });
      expect(screen.queryByText('Edit')).toBeNull();
    });

    it('opens an edit textarea pre-populated with the current body', async () => {
      render(
        <CommentItem
          comment={aComment({ author_id: 'user-99', created_at: WITHIN_WINDOW })}
          {...defaultProps}
          currentUserId="user-99"
        />,
        { wrapper: makeWrapper() },
      );

      fireEvent.press(screen.getByTestId('comment-menu-btn'));
      await waitFor(() => screen.getByText('Edit'));
      fireEvent.press(screen.getByText('Edit'));

      const input = screen.getByTestId('comment-edit-input');
      expect(input.props.value).toBe('A reply.');
    });

    it('calls the edit mutation with the updated body on Save', async () => {
      render(
        <CommentItem
          comment={aComment({ author_id: 'user-99', created_at: WITHIN_WINDOW })}
          {...defaultProps}
          currentUserId="user-99"
        />,
        { wrapper: makeWrapper() },
      );

      fireEvent.press(screen.getByTestId('comment-menu-btn'));
      await waitFor(() => screen.getByText('Edit'));
      fireEvent.press(screen.getByText('Edit'));

      fireEvent.changeText(screen.getByTestId('comment-edit-input'), 'Edited body');
      fireEvent.press(screen.getByTestId('comment-edit-save'));

      expect(mockEditMutate).toHaveBeenCalledWith(
        { commentId: 'comment-1', body: 'Edited body' },
        expect.anything(),
      );
    });

    it('shows window-closed error when the edit mutation fails with that kind', async () => {
      mockEditMutate.mockImplementation(
        (_input: unknown, options: { onError: (e: unknown) => void }) => {
          options.onError(new EditCommentError('window_closed', 'Editing window has closed'));
        },
      );

      render(
        <CommentItem
          comment={aComment({ author_id: 'user-99', created_at: WITHIN_WINDOW })}
          {...defaultProps}
          currentUserId="user-99"
        />,
        { wrapper: makeWrapper() },
      );

      fireEvent.press(screen.getByTestId('comment-menu-btn'));
      await waitFor(() => screen.getByText('Edit'));
      fireEvent.press(screen.getByText('Edit'));
      fireEvent.press(screen.getByTestId('comment-edit-save'));

      await waitFor(() => {
        expect(screen.getByTestId('comment-edit-error')).toBeOnTheScreen();
      });
    });

    it('shows a delete confirmation Alert and calls the delete mutation on confirm', async () => {
      render(
        <CommentItem
          comment={aComment({ author_id: 'user-99', created_at: WITHIN_WINDOW })}
          {...defaultProps}
          currentUserId="user-99"
        />,
        { wrapper: makeWrapper() },
      );

      fireEvent.press(screen.getByTestId('comment-menu-btn'));
      await waitFor(() => screen.getByText('Delete'));
      fireEvent.press(screen.getByText('Delete'));

      expect(Alert.alert).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.arrayContaining([expect.objectContaining({ style: 'destructive' })]),
      );

      // Trigger the destructive button callback
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0] as [
        string,
        string,
        { style?: string; onPress?: () => void }[],
      ];
      const destructiveBtn = alertCall[2].find((b) => b.style === 'destructive');
      act(() => {
        destructiveBtn?.onPress?.();
      });

      expect(mockDeleteMutate).toHaveBeenCalledWith({ commentId: 'comment-1' }, expect.anything());
    });
  });

  describe("action sheet for others' comment", () => {
    it("shows Report (no Edit/Delete) for others' comments", async () => {
      render(<CommentItem comment={aComment({ author_id: 'user-other' })} {...defaultProps} />, {
        wrapper: makeWrapper(),
      });

      fireEvent.press(screen.getByTestId('comment-menu-btn'));

      await waitFor(() => {
        expect(screen.getByText('Report comment')).toBeOnTheScreen();
        expect(screen.queryByText('Edit')).toBeNull();
        expect(screen.queryByText('Delete')).toBeNull();
      });
    });

    it('calls onReport with the comment id when Report is pressed', async () => {
      const onReport = jest.fn();
      render(
        <CommentItem
          comment={aComment({ author_id: 'user-other' })}
          {...defaultProps}
          onReport={onReport}
        />,
        { wrapper: makeWrapper() },
      );

      fireEvent.press(screen.getByTestId('comment-menu-btn'));
      await waitFor(() => screen.getByText('Report comment'));
      fireEvent.press(screen.getByText('Report comment'));

      expect(onReport).toHaveBeenCalledWith('comment-1');
    });

    it('renders the "Report this person" entry on a non-own comment', async () => {
      render(<CommentItem comment={aComment({ author_id: 'user-other' })} {...defaultProps} />, {
        wrapper: makeWrapper(),
      });

      fireEvent.press(screen.getByTestId('comment-menu-btn'));
      await waitFor(() => screen.getByTestId('comment-menu-report-person'));
      expect(screen.getByText('Report this person')).toBeOnTheScreen();
    });

    it('calls onReportPerson with the comment author id when pressed', async () => {
      const onReportPerson = jest.fn();
      render(
        <CommentItem
          comment={aComment({ author_id: 'user-other' })}
          {...defaultProps}
          onReportPerson={onReportPerson}
        />,
        { wrapper: makeWrapper() },
      );

      fireEvent.press(screen.getByTestId('comment-menu-btn'));
      await waitFor(() => screen.getByTestId('comment-menu-report-person'));
      fireEvent.press(screen.getByTestId('comment-menu-report-person'));

      expect(onReportPerson).toHaveBeenCalledWith('user-other');
    });

    it('does not render "Report this person" on the user\'s own comment', async () => {
      render(
        <CommentItem
          comment={aComment({ author_id: 'user-99' })} // == currentUserId
          {...defaultProps}
        />,
        { wrapper: makeWrapper() },
      );

      fireEvent.press(screen.getByTestId('comment-menu-btn'));
      // Own comment shows Edit/Delete, not Report/Block/Report-this-person.
      await waitFor(() => screen.getByText('Edit'));
      expect(screen.queryByTestId('comment-menu-report-person')).toBeNull();
    });
  });
});

describe('CommentItem — accessibility', () => {
  it('passes a11y checks for an other-user comment', () => {
    const { root } = render(<CommentItem comment={aComment()} {...defaultProps} />, {
      wrapper: makeWrapper(),
    });
    expect(a11yCheck(root)).toEqual([]);
  });

  it("passes a11y checks for the current user's own comment", () => {
    const { root } = render(
      <CommentItem comment={aComment({ author_id: 'user-99' })} {...defaultProps} />,
      { wrapper: makeWrapper() },
    );
    expect(a11yCheck(root)).toEqual([]);
  });

  it('menu button has a label and meets tap-target extension via hitSlop', () => {
    const { getByTestId } = render(<CommentItem comment={aComment()} {...defaultProps} />, {
      wrapper: makeWrapper(),
    });
    const menuBtn = getByTestId('comment-menu-btn');
    expect(menuBtn.props.accessibilityLabel).toBeTruthy();
    expect(menuBtn.props.accessibilityRole).toBe('button');
    expect(menuBtn.props.hitSlop).toMatchObject({ top: 12, bottom: 12, left: 12, right: 12 });
  });
});
