'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useSession } from '@/hooks/use-session';
import { ApiError } from '@/services/api-client';
import { approveCarrier, rejectCarrier } from '../api';

export function useApproveCarrier(id: string) {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => approveCarrier(id, session?.token ?? ''),
    onSuccess: () => {
      toast.success('Carrier approved');
      queryClient.invalidateQueries({ queryKey: ['carriers', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['carriers', 'list'] });
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError ? error.message : 'Something went wrong.',
      );
    },
  });
}

export function useRejectCarrier(id: string) {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => rejectCarrier(id, session?.token ?? ''),
    onSuccess: () => {
      toast.success('Carrier rejected');
      queryClient.invalidateQueries({ queryKey: ['carriers', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['carriers', 'list'] });
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError ? error.message : 'Something went wrong.',
      );
    },
  });
}
