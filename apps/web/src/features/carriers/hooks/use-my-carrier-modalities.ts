'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthToken } from '@/hooks/use-auth-token';
import { toastApiError } from '@/lib/toast-api-error';
import { getMyCarrierModalities, setMyCarrierModalities } from '../api';
import { carrierKeys } from '../api/keys';

export function useMyCarrierModalities() {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: carrierKeys.myModalities(),
    queryFn: () => getMyCarrierModalities(token),
    enabled,
  });
}

export function useSetMyCarrierModalities() {
  const { token } = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (modalityIds: string[]) =>
      setMyCarrierModalities(modalityIds, token),
    onSuccess: () => {
      toast.success('Modalities saved');
      queryClient.invalidateQueries({
        queryKey: carrierKeys.myModalities(),
      });
    },
    onError: toastApiError,
  });
}
