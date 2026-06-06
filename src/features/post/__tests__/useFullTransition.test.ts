import { renderHook, act } from '@testing-library/react-native';
import { useFullTransition } from '../api/useFullTransition';

describe('useFullTransition', () => {
  it('does not show the notice when the post loads already full', () => {
    const { result } = renderHook(() => useFullTransition(true));
    expect(result.current.showNotice).toBe(false);
  });

  it('does not show the notice when the post is not full', () => {
    const { result } = renderHook(() => useFullTransition(false));
    expect(result.current.showNotice).toBe(false);
  });

  it('does not show the notice when is_full is undefined (data loading)', () => {
    const { result } = renderHook(() => useFullTransition(undefined));
    expect(result.current.showNotice).toBe(false);
  });

  it('shows the notice when is_full transitions from false to true', () => {
    const { result, rerender } = renderHook(
      ({ isFull }: { isFull: boolean | undefined }) => useFullTransition(isFull),
      { initialProps: { isFull: false } },
    );

    expect(result.current.showNotice).toBe(false);

    rerender({ isFull: true });

    expect(result.current.showNotice).toBe(true);
  });

  it('does not re-show the notice if is_full is already true and stays true', () => {
    const { result, rerender } = renderHook(
      ({ isFull }: { isFull: boolean }) => useFullTransition(isFull),
      { initialProps: { isFull: true } },
    );

    rerender({ isFull: true });

    expect(result.current.showNotice).toBe(false);
  });

  it('hides the notice after dismiss is called', () => {
    const { result, rerender } = renderHook(
      ({ isFull }: { isFull: boolean }) => useFullTransition(isFull),
      { initialProps: { isFull: false } },
    );

    rerender({ isFull: true });
    expect(result.current.showNotice).toBe(true);

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.showNotice).toBe(false);
  });

  it('does not re-trigger the notice after dismiss even if is_full remains true', () => {
    const { result, rerender } = renderHook(
      ({ isFull }: { isFull: boolean }) => useFullTransition(isFull),
      { initialProps: { isFull: false } },
    );

    rerender({ isFull: true });
    act(() => {
      result.current.dismiss();
    });

    // Simulate another re-render with is_full still true
    rerender({ isFull: true });

    expect(result.current.showNotice).toBe(false);
  });
});
