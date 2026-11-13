'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useSession } from '@/hooks/use-session';
import { useSocketSubscription } from '@/hooks/use-socket-subscription';
import { throttle } from '@/lib/throttle';
import { getSocket } from '@/services/websocket-client';
import { getWebhookHealth } from '../api';
import { integrationKeys } from '../api/keys';

// A 24 h rate moves slowly: one refetch per 10 s however busy the deliveries, and a 60 s
// poll for when the socket is down.
const REFRESH_THROTTLE_MS = 10_000;
const POLL_MS = 60_000;

export function useWebhookHealth() {
  const { token, enabled } = useAuthToken();
  const queryClient = useQueryClient();
  const [refresh] = useState(() =>
    throttle(
      () =>
        queryClient.invalidateQueries({ queryKey: integrationKeys.health() }),
      REFRESH_THROTTLE_MS,
    ),
  );

  useEffect(() => refresh.cancel, [refresh]);

  useSocketSubscription({
    getSocket,
    connectionKey: useSession()?.token,
    subscriptions: [{ event: 'subscribe:seller' }],
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
