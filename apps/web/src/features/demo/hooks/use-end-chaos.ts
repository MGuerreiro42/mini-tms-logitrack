'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { HTTP_STATUS } from '@/lib/http-status';
import { toastApiError } from '@/lib/toast-api-error';
import { hasStatus } from '@/services/api-client';
import { demoKeys, endChaos } from '../api';

// No success toast: the banner's live region already announces the end. A 404 means someone
// else ended it first, which the refetch shows.
export function useEndChaos() {
  const { token } = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => endChaos(token),
    onError: (error) => {
      if (!hasStatus(error, HTTP_STATUS.NOT_FOUND)) toastApiError(error);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: demoKeys.all }),
  });
}
