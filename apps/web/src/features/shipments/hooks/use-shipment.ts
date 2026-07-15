'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/hooks/use-session';
import { getShipment } from '../api';

export function useShipment(id: string) {
  const session = useSession();

  return useQuery({
    queryKey: ['shipments', 'detail', id],
    queryFn: () => getShipment(id, session?.token ?? ''),
    enabled: Boolean(session),
    // A bounded correctness backstop, not the primary sync mechanism — the
    // WebSocket push (useShipmentTracking) is what makes this feel instant.
    // But push delivery is inherently best-effort (a message can be missed
    // during a brief disconnect, an effect re-run, a backgrounded tab), and
    // this screen's whole point is showing live status — so cap the
    // maximum possible staleness at 5s instead of leaving it open-ended
    // until some unrelated future event happens to trigger a refetch. Only
    // polls while this query is actually being observed (a mounted detail
    // page), not globally.
    refetchInterval: 5000,
  });
}
