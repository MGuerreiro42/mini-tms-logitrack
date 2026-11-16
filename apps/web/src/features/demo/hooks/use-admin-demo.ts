'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { useAuthToken } from '@/hooks/use-auth-token';
import { DEMO_RESET_EVENT } from '@/lib/demo-reset';
import { demoKeys, getAdminDemo, resetDemo, startChaos } from '../api';

const ENDING_POLL_MS = 2_000;

// A 404 (simulator off) is not retried, so the card stays absent.
export function useAdminDemo() {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: demoKeys.admin(),
    queryFn: () => getAdminDemo(token),
    enabled,
    // A run past its end that the server still holds (late end job) is polled until it ends.
    refetchInterval: ({ state }) =>
      state.data?.chaos && Date.parse(state.data.chaos.endsAt) <= Date.now()
        ? ENDING_POLL_MS
        : false,
  });
}

// A 409 (another start won the race, or the cooldown) toasts the API's message and refetches.
export function useStartChaos() {
  return useApiMutation({
    mutationFn: startChaos,
    successMessage: (chaos) => `Started ${chaos.label}`,
    invalidates: demoKeys.all,
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
