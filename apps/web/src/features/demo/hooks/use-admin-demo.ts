'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthToken } from '@/hooks/use-auth-token';
import { DEMO_RESET_EVENT } from '@/lib/demo-reset';
import { demoKeys, getAdminDemo, resetDemo } from '../api';

// A 404 (simulator off) is not retried, so the card stays absent.
export function useAdminDemo() {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: demoKeys.admin(),
    queryFn: () => getAdminDemo(token),
    enabled,
  });
}

export function useResetDemo() {
  const { token } = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => resetDemo(token),
    onSuccess: () => {
      // The socket's demo:reset notice uses the same id, so the admin sees one toast.
      toast.success('Demo data was reset', { id: DEMO_RESET_EVENT });
      return queryClient.invalidateQueries({ queryKey: demoKeys.all });
    },
  });
}
