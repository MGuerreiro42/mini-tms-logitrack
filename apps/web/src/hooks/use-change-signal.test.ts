import { act, renderHook } from '@testing-library/react';
import { useChangeSignal } from './use-change-signal';

describe('useChangeSignal', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-11-03T12:00:00Z') });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const render = (initial: number) =>
    renderHook(({ value }) => useChangeSignal(value), {
      initialProps: { value: initial },
    });

  it('stays quiet on mount and when the value is unchanged', () => {
    const { result, rerender } = render(3);

    rerender({ value: 3 });

    expect(result.current).toBe(0);
  });

  it('signals when the value changes', () => {
    const { result, rerender } = render(3);

    rerender({ value: 4 });

    expect(result.current).toBe(1);
  });

  it('ignores a second change inside the window, then signals again after it', () => {
    const { result, rerender } = render(3);

    rerender({ value: 4 });
    act(() => vi.advanceTimersByTime(300));
    rerender({ value: 5 });
    expect(result.current).toBe(1);

    act(() => vi.advanceTimersByTime(600));
    rerender({ value: 6 });
    expect(result.current).toBe(2);
  });

  it('stays quiet while the tab is hidden', () => {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    const { result, rerender } = render(3);

    rerender({ value: 4 });

    expect(result.current).toBe(0);
  });
});
