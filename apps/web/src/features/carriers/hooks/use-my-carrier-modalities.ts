'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthToken } from '@/hooks/use-auth-token';
import { toastApiError } from '@/lib/toast-api-error';
import { getMyCarrierModalities, setMyCarrierModalities } from '../api';

export function useMyCarrierModalities() {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: ['carriers', 'me', 'modalities'],
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
        queryKey: ['carriers', 'me', 'modalities'],
      });
    },
    onError: toastApiError,
  });
}
