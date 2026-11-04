'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSession } from '@/hooks/use-session';
import {
  type SocketSubscription,
  useSocketSubscription,
} from '@/hooks/use-socket-subscription';
import type { LiveConnection, LiveStatus } from '@/lib/live-status';
import { throttle } from '@/lib/throttle';
import { getSocket } from '@/services/websocket-client';
import type { Paginated } from '@/types/pagination';
import { integrationKeys } from '../api/keys';
import type {
  WebhookDelivery,
  WebhookInbox,
  WebhookInboxRequest,
} from '../types';

const INBOX_LIMIT = 50;
const REFRESH_THROTTLE_MS = 300;
const SELLER_ROOM: SocketSubscription[] = [{ event: 'subscribe:seller' }];

function bothLive(a: LiveStatus, b: LiveStatus): LiveStatus {
  if (a === 'live' && b === 'live') return 'live';
  return a === 'offline' || b === 'offline' ? 'offline' : 'connecting';
}

export function useWebhookLive(): LiveConnection {
  const queryClient = useQueryClient();
  const connectionKey = useSession()?.token;
  const [refreshDeliveries] = useState(() =>
    throttle(
      () =>
        queryClient.invalidateQueries({
          queryKey: integrationKeys.deliveries(),
        }),
      REFRESH_THROTTLE_MS,
    ),
  );
  const [lastEventAt, setLastEventAt] = useState<Date | null>(null);

  useEffect(() => refreshDeliveries.cancel, [refreshDeliveries]);

  // A delivery on screen is patched in place; a new one (or a replay) needs its page refetched,
  // and so does a status change, which can move it in or out of a status filter.
  function applyDelivery(delivery: WebhookDelivery) {
    let shown = false;
    let moved = false;
    queryClient.setQueriesData<Paginated<WebhookDelivery>>(
      { queryKey: integrationKeys.deliveries() },
      (page) => {
        const cached = page?.data.find((row) => row.id === delivery.id);
        if (!page || !cached) return page;
        shown = true;
        moved ||= cached.status !== delivery.status;
        return {
          ...page,
          data: page.data.map((row) =>
            row.id === delivery.id ? delivery : row,
          ),
        };
      },
    );
    if (!shown || moved) refreshDeliveries();
  }

  function addInboxRequest(request: WebhookInboxRequest) {
    queryClient.setQueryData<WebhookInbox>(
      integrationKeys.inbox(),
      (inbox) =>
        inbox && {
          ...inbox,
          requests: [
            request,
            ...inbox.requests.filter((shown) => shown.id !== request.id),
          ].slice(0, INBOX_LIMIT),
        },
    );
  }

  const deliveryStatus = useSocketSubscription<WebhookDelivery>({
    getSocket,
    connectionKey,
    subscriptions: SELLER_ROOM,
    updateEvent: 'webhook:delivery',
    onUpdate: (delivery) => {
      if (!delivery) {
        refreshDeliveries();
        return;
      }
      setLastEventAt(new Date());
      applyDelivery(delivery);
    },
  });

  const inboxStatus = useSocketSubscription<WebhookInboxRequest>({
    getSocket,
    connectionKey,
    subscriptions: SELLER_ROOM,
    updateEvent: 'webhook:inbox',
    onUpdate: (request) => {
      if (!request) {
        queryClient.invalidateQueries({ queryKey: integrationKeys.inbox() });
        return;
      }
      setLastEventAt(new Date());
      addInboxRequest(request);
    },
  });

  return { status: bothLive(deliveryStatus, inboxStatus), lastEventAt };
}
