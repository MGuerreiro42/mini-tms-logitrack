'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useLiveQuery } from '@/hooks/use-live-query';
import type { LiveStatus } from '@/lib/live-status';
import { toastApiError } from '@/lib/toast-api-error';
import { getWebhookInbox, updateWebhookInbox } from '../api';
import { integrationKeys } from '../api/keys';

export function useWebhookInbox(liveStatus: LiveStatus) {
  return useLiveQuery({
    queryKey: integrationKeys.inbox(),
    queryFn: getWebhookInbox,
    liveStatus,
  });
}

// The response is the whole inbox, so it replaces the cache instead of a refetch.
export function useSetInboxFailing() {
  const { token } = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (failRequests: boolean) =>
      updateWebhookInbox(failRequests, token),
    onSuccess: (inbox) => {
      queryClient.setQueryData(integrationKeys.inbox(), inbox);
      toast.success('Test inbox updated');
    },
    onError: toastApiError,
  });
}
