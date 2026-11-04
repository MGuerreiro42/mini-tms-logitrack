'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiMutation } from '@/hooks/use-api-mutation';
import { useAuthToken } from '@/hooks/use-auth-token';
import { createApiKey, listApiKeys, revokeApiKey } from '../api';
import { integrationKeys } from '../api/keys';

export function useApiKeys() {
  const { token, enabled } = useAuthToken();

  return useQuery({
    queryKey: integrationKeys.apiKeys(),
    queryFn: () => listApiKeys(token),
    enabled,
  });
}

// A plain mutation, so the dialog can read the full key from `data`: it is never returned again.
export function useCreateApiKey() {
  const { token } = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createApiKey(name, token),
    // Drop the full key from the MutationCache as soon as the dialog lets go of it.
    gcTime: 0,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: integrationKeys.apiKeys() }),
  });
}

export function useRevokeApiKey() {
  return useApiMutation({
    mutationFn: (id: string, token) => revokeApiKey(id, token),
    successMessage: 'API key revoked',
    invalidates: integrationKeys.apiKeys(),
    surface: 'inline',
  });
}
