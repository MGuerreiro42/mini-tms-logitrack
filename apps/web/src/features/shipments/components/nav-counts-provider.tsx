'use client';

import { type QueryKey, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  type NavCounts,
  NavCountsContext,
} from '@/components/common/nav-counts';
import { useSession } from '@/hooks/use-session';
import { useSocketSubscription } from '@/hooks/use-socket-subscription';
import { useThrottledValue } from '@/hooks/use-throttled-value';
import type { LiveStatus } from '@/lib/live-status';
import { throttle } from '@/lib/throttle';
import { getSocket } from '@/services/websocket-client';
import { shipmentKeys } from '../api/keys';
import { useAdminShipmentViewCounts } from '../hooks/use-admin-shipments';
import {
  useQueueViewCounts,
  useSellerViewCounts,
} from '../hooks/use-view-counts';

const NAV_COUNTS_THROTTLE_MS = 2000;

// Its own room hold, so the counts stay live on pages that don't subscribe; it refreshes only the counts.
function useCountsRoom(event: string, queryKey: QueryKey): LiveStatus {
  const queryClient = useQueryClient();
  const [refresh] = useState(() =>
    throttle(
      () => queryClient.invalidateQueries({ queryKey, exact: true }),
      NAV_COUNTS_THROTTLE_MS,
    ),
  );
  useEffect(() => refresh.cancel, [refresh]);

  return useSocketSubscription({
    getSocket,
    connectionKey: useSession()?.token,
    subscriptions: [{ event }],
    updateEvent: 'shipment:updated',
    onUpdate: refresh,
  });
}

function NavCountsProvider({
  counts,
  status,
  children,
}: {
  counts: NavCounts['counts'];
  status: LiveStatus;
  children: React.ReactNode;
}) {
  // A page's own faster refetch of the same key must not repaint the sidebar more often.
  const shown = useThrottledValue(counts, NAV_COUNTS_THROTTLE_MS);
  return (
    <NavCountsContext value={{ counts: shown, status }}>
      {children}
    </NavCountsContext>
  );
}

export function SellerNavCounts({ children }: { children: React.ReactNode }) {
  const status = useCountsRoom('subscribe:seller', shipmentKeys.viewCounts());
  const { data } = useSellerViewCounts(undefined, status);
  return (
    <NavCountsProvider counts={data} status={status}>
      {children}
    </NavCountsProvider>
  );
}

export function CarrierNavCounts({ children }: { children: React.ReactNode }) {
  const status = useCountsRoom(
    'subscribe:queue',
    shipmentKeys.queueViewCounts(),
  );
  const { data } = useQueueViewCounts(status);
  return (
    <NavCountsProvider counts={data} status={status}>
      {children}
    </NavCountsProvider>
  );
}

export function AdminNavCounts({ children }: { children: React.ReactNode }) {
  const status = useCountsRoom(
    'subscribe:monitoring',
    shipmentKeys.adminViewCounts({}),
  );
  const { data } = useAdminShipmentViewCounts({}, status);
  return (
    <NavCountsProvider counts={data} status={status}>
      {children}
    </NavCountsProvider>
  );
}
