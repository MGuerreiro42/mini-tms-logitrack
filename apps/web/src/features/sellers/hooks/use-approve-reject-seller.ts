'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthToken } from '@/hooks/use-auth-token';
import { toastApiError } from '@/lib/toast-api-error';
import { approveSeller, rejectSeller } from '../api';

export function useApproveSeller(id: string) {
  const { token } = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => approveSeller(id, token),
    onSuccess: () => {
      toast.success('Seller approved');
      queryClient.invalidateQueries({ queryKey: ['sellers', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['sellers', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['sellers', 'status-counts'] });
    },
    onError: toastApiError,
  });
}

export function useRejectSeller(id: string) {
  const { token } = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => rejectSeller(id, token),
    onSuccess: () => {
      toast.success('Seller rejected');
      queryClient.invalidateQueries({ queryKey: ['sellers', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['sellers', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['sellers', 'status-counts'] });
    },
    onError: toastApiError,
  });
}
