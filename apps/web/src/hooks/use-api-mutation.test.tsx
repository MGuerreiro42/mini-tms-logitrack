import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { setSession } from '@/lib/session';
import { ApiError } from '@/services/api-client';
import { useApiMutation } from './use-api-mutation';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function setup(
  mutationFn: (input: unknown, token: string) => Promise<unknown>,
) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(
    () =>
      useApiMutation({
        mutationFn,
        successMessage: 'Saved',
        invalidates: ['things'],
        conflictMessage: 'Already changed.',
      }),
    { wrapper },
  );
  return { result, invalidate };
}

describe('useApiMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSession({ token: 't', role: 'ADMIN', userId: 'u', email: 'e' });
  });

  it('passes the token, toasts success and refreshes the queries', async () => {
    const mutationFn = vi.fn().mockResolvedValue(undefined);
    const { result, invalidate } = setup(mutationFn);

    await act(() => result.current.mutateAsync(undefined));

    expect(mutationFn).toHaveBeenCalledWith(undefined, 't');
    expect(toast.success).toHaveBeenCalledWith('Saved');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['things'] });
  });

  it('refreshes and shows the conflict message on a 409', async () => {
    const { result, invalidate } = setup(() =>
      Promise.reject(new ApiError(409, 'Conflict')),
    );

    await act(() => result.current.mutateAsync(undefined).catch(() => {}));

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['things'] });
    expect(toast.error).toHaveBeenCalledWith('Already changed.');
  });

  it('toasts the API message for other errors without refreshing', async () => {
    const { result, invalidate } = setup(() =>
      Promise.reject(new ApiError(400, 'Invalid input')),
    );

    await act(() => result.current.mutateAsync(undefined).catch(() => {}));

    expect(invalidate).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Invalid input');
  });
});
