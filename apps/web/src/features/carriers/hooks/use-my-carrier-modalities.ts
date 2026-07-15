'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useSession } from '@/hooks/use-session';
import { ApiError } from '@/services/api-client';
import { getMyCarrierModalities, setMyCarrierModalities } from '../api';

export function useMyCarrierModalities() {
  const session = useSession();

  return useQuery({
    queryKey: ['carriers', 'me', 'modalities'],
    queryFn: () => getMyCarrierModalities(session?.token ?? ''),
    enabled: Boolean(session),
  });
}

export function useSetMyCarrierModalities() {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (modalityIds: string[]) =>
      setMyCarrierModalities(modalityIds, session?.token ?? ''),
    onSuccess: () => {
      toast.success('Modalities saved');
      queryClient.invalidateQueries({
        queryKey: ['carriers', 'me', 'modalities'],
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError ? error.message : 'Something went wrong.',
      );
    },
  });
}
