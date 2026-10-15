'use client';

import {
  type QueryKey,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthToken } from '@/hooks/use-auth-token';
import { HTTP_STATUS } from '@/lib/http-status';
import { toastApiError } from '@/lib/toast-api-error';
import { hasStatus } from '@/services/api-client';

interface ApiMutationOptions<TInput, TData> {
  mutationFn: (input: TInput, token: string) => Promise<TData>;
  successMessage: string;
  invalidates: QueryKey;
  surface?: ErrorSurface;
}

export type ErrorSurface = 'toast' | 'inline';

// A 409 means the server state moved on, so it refreshes the same queries a success would.
export function useApiMutation<TInput = void, TData = unknown>({
  mutationFn,
  successMessage,
  invalidates,
  surface = 'toast',
}: ApiMutationOptions<TInput, TData>) {
  const { token } = useAuthToken();
  const queryClient = useQueryClient();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: invalidates });

  return useMutation({
    mutationFn: (input: TInput) => mutationFn(input, token),
    onSuccess: () => {
      toast.success(successMessage);
      return refresh();
    },
    onError: (error) => {
      const isConflict = hasStatus(error, HTTP_STATUS.CONFLICT);
      if (isConflict) refresh();
      if (surface === 'toast') toastApiError(error);
    },
  });
}
