'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ApiError } from '@/services/api-client';
import { getMyModalities, setMyModalities } from '../api';

export function useMyModalities() {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: ['sellers', 'me', 'modalities'],
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
        queryKey: ['sellers', 'me', 'modalities'],
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError ? error.message : 'Something went wrong.',
      );
    },
  });
}
