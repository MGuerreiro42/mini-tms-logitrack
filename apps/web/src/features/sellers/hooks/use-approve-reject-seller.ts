'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useSession } from '@/hooks/use-session';
import { ApiError } from '@/services/api-client';
import { approveSeller, rejectSeller } from '../api';

export function useApproveSeller(id: string) {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => approveSeller(id, session?.token ?? ''),
    onSuccess: () => {
      toast.success('Seller approved');
      queryClient.invalidateQueries({ queryKey: ['sellers', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['sellers', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['sellers', 'status-counts'] });
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError ? error.message : 'Something went wrong.',
      );
    },
  });
}

export function useRejectSeller(id: string) {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => rejectSeller(id, session?.token ?? ''),
    onSuccess: () => {
      toast.success('Seller rejected');
      queryClient.invalidateQueries({ queryKey: ['sellers', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['sellers', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['sellers', 'status-counts'] });
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError ? error.message : 'Something went wrong.',
      );
    },
  });
}
