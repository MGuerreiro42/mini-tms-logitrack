'use client';

import {
  type QueryKey,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthToken } from '@/hooks/use-auth-token';
import { toastApiError } from '@/lib/toast-api-error';
import { ApiError } from '@/services/api-client';

interface ApiMutationOptions<TInput, TData> {
  mutationFn: (input: TInput, token: string) => Promise<TData>;
  successMessage: string;
  invalidates: QueryKey;
  conflictMessage?: string;
}

// A 409 means the server state moved on, so it refreshes the same queries a success would.
export function useApiMutation<TInput = void, TData = unknown>({
  mutationFn,
  successMessage,
  invalidates,
  conflictMessage,
}: ApiMutationOptions<TInput, TData>) {
  const { token } = useAuthToken();
  const queryClient = useQueryClient();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: invalidates });

  return useMutation({
    mutationFn: (input: TInput) => mutationFn(input, token),
    onSuccess: () => {
      toast.success(successMessage);
      refresh();
    },
    onError: (error) => {
      const isConflict = error instanceof ApiError && error.statusCode === 409;
      if (isConflict) refresh();
      if (isConflict && conflictMessage) toast.error(conflictMessage);
      else toastApiError(error);
    },
  });
}
