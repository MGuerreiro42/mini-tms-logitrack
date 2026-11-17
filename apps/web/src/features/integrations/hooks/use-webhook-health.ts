'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useSession } from '@/hooks/use-session';
import { useSocketSubscription } from '@/hooks/use-socket-subscription';
import { useThrottledInvalidation } from '@/hooks/use-throttled-invalidation';
import { getSocket } from '@/services/websocket-client';
import { getWebhookHealth } from '../api';
import { integrationKeys } from '../api/keys';
import { SELLER_ROOM } from './use-webhook-live';

// A 24 h rate moves slowly: one refetch per 10 s however busy the deliveries, and a 60 s
// poll for when the socket is down.
const REFRESH_THROTTLE_MS = 10_000;
const POLL_MS = 60_000;

export function useWebhookHealth() {
  const { token, enabled } = useAuthToken();
  const refresh = useThrottledInvalidation(
    integrationKeys.health(),
    REFRESH_THROTTLE_MS,
  );

  useSocketSubscription({
    getSocket,
    connectionKey: useSession()?.token,
    subscriptions: SELLER_ROOM,
    updateEvent: 'webhook:delivery',
    onUpdate: refresh,
  });

  return useQuery({
    queryKey: integrationKeys.health(),
    queryFn: () => getWebhookHealth(token),
    enabled,
    refetchInterval: POLL_MS,
  });
}
