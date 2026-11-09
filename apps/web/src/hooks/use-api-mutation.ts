'use client';

import {
  type QueryKey,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthToken } from '@/hooks/use-auth-token';
import { HTTP_STATUS } from '@/lib/http-status';
import { apiErrorMessage, toastApiError } from '@/lib/toast-api-error';
import { hasStatus } from '@/services/api-client';

interface ApiMutationOptions<TInput, TData> {
  mutationFn: (input: TInput, token: string) => Promise<TData>;
  successMessage: string | ((data: TData) => string);
  invalidates: QueryKey;
  surface?: ErrorSurface;
  // Rewrites the server's 409 text when the screen has a plainer one.
  conflictMessage?: (serverMessage: string) => string;
}

export type ErrorSurface = 'toast' | 'inline';

// A 409 means the server state moved on, so it refreshes the same queries a success would.
export function useApiMutation<TInput = void, TData = unknown>({
  mutationFn,
  successMessage,
  invalidates,
  surface = 'toast',
  conflictMessage,
}: ApiMutationOptions<TInput, TData>) {
  const { token } = useAuthToken();
  const queryClient = useQueryClient();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: invalidates });

  return useMutation({
    mutationFn: (input: TInput) => mutationFn(input, token),
    onSuccess: (data) => {
      toast.success(
        typeof successMessage === 'function'
          ? successMessage(data)
          : successMessage,
      );
      return refresh();
    },
    onError: (error) => {
      const isConflict = hasStatus(error, HTTP_STATUS.CONFLICT);
      if (isConflict) refresh();
      if (surface !== 'toast') return;
      if (isConflict && conflictMessage) {
        toast.error(conflictMessage(apiErrorMessage(error)));
      } else toastApiError(error);
    },
  });
}
