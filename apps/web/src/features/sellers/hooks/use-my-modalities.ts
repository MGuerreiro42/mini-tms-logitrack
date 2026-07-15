'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useSession } from '@/hooks/use-session';
import { ApiError } from '@/services/api-client';
import { getMyModalities, setMyModalities } from '../api';

export function useMyModalities() {
  const session = useSession();

  return useQuery({
    queryKey: ['sellers', 'me', 'modalities'],
    queryFn: () => getMyModalities(session?.token ?? ''),
    enabled: Boolean(session),
  });
}

export function useSetMyModalities() {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (modalityIds: string[]) =>
      setMyModalities(modalityIds, session?.token ?? ''),
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
