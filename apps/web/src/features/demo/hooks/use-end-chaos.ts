'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { toastApiError } from '@/lib/toast-api-error';
import { demoKeys, endChaos } from '../api';

// No success toast: the banner's live region already announces the end.
export function useEndChaos() {
  const { token } = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => endChaos(token),
    onError: toastApiError,
    onSettled: () => queryClient.invalidateQueries({ queryKey: demoKeys.all }),
  });
}
