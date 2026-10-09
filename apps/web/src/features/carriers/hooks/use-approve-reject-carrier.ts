'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthToken } from '@/hooks/use-auth-token';
import { toastApiError } from '@/lib/toast-api-error';
import { approveCarrier, rejectCarrier } from '../api';
import { carrierKeys } from '../api/keys';

export function useApproveCarrier(id: string) {
  const { token } = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => approveCarrier(id, token),
    onSuccess: () => {
      toast.success('Carrier approved');
      queryClient.invalidateQueries({ queryKey: carrierKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: [...carrierKeys.all, 'list'] });
      queryClient.invalidateQueries({
        queryKey: carrierKeys.statusCounts(),
      });
    },
    onError: toastApiError,
  });
}

export function useRejectCarrier(id: string) {
  const { token } = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => rejectCarrier(id, token),
    onSuccess: () => {
      toast.success('Carrier rejected');
      queryClient.invalidateQueries({ queryKey: carrierKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: [...carrierKeys.all, 'list'] });
      queryClient.invalidateQueries({
        queryKey: carrierKeys.statusCounts(),
      });
    },
    onError: toastApiError,
  });
}
