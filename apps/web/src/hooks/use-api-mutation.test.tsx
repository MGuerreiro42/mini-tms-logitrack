import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { setSession } from '@/lib/session';
import { ApiError } from '@/services/api-client';
import { type ErrorSurface, useApiMutation } from './use-api-mutation';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function setup(
  mutationFn: (input: unknown, token: string) => Promise<unknown>,
  surface?: ErrorSurface,
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
        surface,
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

  it('stays pending until the refreshed queries have settled', async () => {
    let finishRefetch: () => void = () => {};
    const { result, invalidate } = setup(() => Promise.resolve());
    invalidate.mockReturnValue(
      new Promise<void>((resolve) => {
        finishRefetch = resolve;
      }),
    );

    act(() => result.current.mutate(undefined));
    await waitFor(() => expect(invalidate).toHaveBeenCalled());
    expect(result.current.isPending).toBe(true);

    await act(async () => finishRefetch());
    await waitFor(() => expect(result.current.isPending).toBe(false));
  });

  it('refreshes and toasts the API message on a 409', async () => {
    const { result, invalidate } = setup(() =>
      Promise.reject(new ApiError(409, 'Already changed')),
    );

    await act(() => result.current.mutateAsync(undefined).catch(() => {}));

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['things'] });
    expect(toast.error).toHaveBeenCalledWith('Already changed');
  });

  it('leaves inline errors to the caller but still refreshes on a 409', async () => {
    const { result, invalidate } = setup(
      () => Promise.reject(new ApiError(409, 'Already changed')),
      'inline',
    );

    await act(() => result.current.mutateAsync(undefined).catch(() => {}));

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['things'] });
    expect(toast.error).not.toHaveBeenCalled();
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
