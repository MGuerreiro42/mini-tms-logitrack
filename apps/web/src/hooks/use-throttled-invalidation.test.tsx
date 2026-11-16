import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useThrottledInvalidation } from './use-throttled-invalidation';

describe('useThrottledInvalidation', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('refetches once now and once after the wait, then nothing after unmount', () => {
    vi.useFakeTimers();
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result, unmount } = renderHook(
      () => useThrottledInvalidation(['things'], 1000),
      {
        wrapper: ({ children }: { children: ReactNode }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      },
    );

    for (let i = 0; i < 5; i++) result.current();
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['things'] });

    vi.advanceTimersByTime(1000);
    expect(invalidate).toHaveBeenCalledTimes(2);

    result.current();
    result.current();
    unmount();
    vi.advanceTimersByTime(1000);
    expect(invalidate).toHaveBeenCalledTimes(3);
  });
});
