'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthToken } from '@/hooks/use-auth-token';
import {
  getWebhookEndpoint,
  rotateWebhookSecret,
  updateWebhookEndpoint,
} from '../api';
import { integrationKeys } from '../api/keys';
import type { UpdateWebhookEndpointInput, WebhookEndpoint } from '../types';

export function useWebhookEndpoint() {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: integrationKeys.endpoint(),
    queryFn: () => getWebhookEndpoint(token),
    enabled,
  });
}

// The response is the whole endpoint, so it replaces the cache instead of a refetch.
function useEndpointMutation<TInput>(
  mutationFn: (input: TInput, token: string) => Promise<WebhookEndpoint>,
  successMessage: string,
  onSaved?: (input: TInput) => void,
) {
  const { token } = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: TInput) => mutationFn(input, token),
    onSuccess: (endpoint, input) => {
      queryClient.setQueryData(integrationKeys.endpoint(), endpoint);
      toast.success(successMessage);
      onSaved?.(input);
    },
  });
}

export function useUpdateWebhookEndpoint() {
  const queryClient = useQueryClient();

  return useEndpointMutation(
    (input: UpdateWebhookEndpointInput, token) =>
      updateWebhookEndpoint(input, token),
    'Endpoint saved',
    // Disabling fails the pending deliveries server-side without a socket event.
    (input) => {
      if (input.active === false) {
        queryClient.invalidateQueries({
          queryKey: integrationKeys.deliveries(),
        });
      }
    },
  );
}

export function useRotateWebhookSecret() {
  return useEndpointMutation<void>(
    (_, token) => rotateWebhookSecret(token),
    'Secret rotated',
  );
}
