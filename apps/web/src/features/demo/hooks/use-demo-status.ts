'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuthToken } from '@/hooks/use-auth-token';
import { DEMO_LOGIN_ENABLED } from '@/lib/demo';
import { getSocket, retainSocket } from '@/services/websocket-client';
import { demoKeys, getDemoStatus } from '../api';
import type { ChaosStatus, DemoStatus } from '../types';

export const DEMO_CHAOS_EVENT = 'demo:chaos';

// A 404 (simulator off) is a client error, so it is not retried and the data stays undefined.
// demo:reset invalidates every query already (lib/demo-reset.ts), this one included.
export function useDemoStatus() {
  const { token, enabled } = useAuthToken();
  const queryClient = useQueryClient();
  const live = DEMO_LOGIN_ENABLED && enabled;

  useEffect(() => {
    if (!live) return;
    const socket = getSocket();
    const handleChaos = (chaos: ChaosStatus | null) => {
      queryClient.setQueryData<DemoStatus>(
        demoKeys.status(),
        (status) => status && { ...status, chaos },
      );
      // The admin card also needs the runs and the cooldown, which the event doesn't carry.
      void queryClient.invalidateQueries({ queryKey: demoKeys.admin() });
    };
    // An event missed while offline is caught up on every (re)connect.
    const handleConnect = () =>
      queryClient.invalidateQueries({ queryKey: demoKeys.status() });
    socket.on(DEMO_CHAOS_EVENT, handleChaos);
    socket.on('connect', handleConnect);
    // Held on every page, so the banner reaches each signed-in visitor wherever they are.
    const release = retainSocket(socket);
    return () => {
      socket.off(DEMO_CHAOS_EVENT, handleChaos);
      socket.off('connect', handleConnect);
      release();
    };
  }, [live, queryClient]);

  return useQuery({
    queryKey: demoKeys.status(),
    queryFn: () => getDemoStatus(token),
    enabled: live,
  });
}
