import { act, renderHook } from '@testing-library/react';
import { useThrottledValue } from './use-throttled-value';

describe('useThrottledValue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows the first value at once and then at most one value per window', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useThrottledValue(value, 2000),
      { initialProps: { value: 1 } },
    );
    expect(result.current).toBe(1);

    rerender({ value: 2 });
    expect(result.current).toBe(2);
    rerender({ value: 3 });
    rerender({ value: 4 });
    expect(result.current).toBe(2);

    act(() => vi.advanceTimersByTime(1999));
    expect(result.current).toBe(2);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(4);
  });
});
