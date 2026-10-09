'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthToken } from '@/hooks/use-auth-token';
import { toastApiError } from '@/lib/toast-api-error';
import { getMyModalities, setMyModalities } from '../api';
import { sellerKeys } from '../api/keys';

export function useMyModalities() {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: sellerKeys.myModalities(),
    queryFn: () => getMyModalities(token),
    enabled,
  });
}

export function useSetMyModalities() {
  const { token } = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (modalityIds: string[]) => setMyModalities(modalityIds, token),
    onSuccess: () => {
      toast.success('Modalities saved');
      queryClient.invalidateQueries({
        queryKey: sellerKeys.myModalities(),
      });
    },
    onError: toastApiError,
  });
}
