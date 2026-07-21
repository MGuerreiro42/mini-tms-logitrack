'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useSession } from '@/hooks/use-session';
import { getSocket } from '@/services/websocket-client';
import { invalidateShipmentQueries } from '../lib/invalidate-shipment-queries';

interface UseShipmentTrackingOptions {
  // Subscribes to one shipment's room — the seller's and carrier's detail
  // views both use this.
  shipmentId?: string;
  // Subscribes to the caller's own carrier queue room — no id needed, the
  // backend derives the carrier from the authenticated socket itself.
  subscribeToQueue?: boolean;
  // Subscribes to the shared admin:monitoring room — server-side gated to
  // ADMIN sockets only (TrackingGateway.handleSubscribeMonitoring silently
  // no-ops for anyone else), so this is safe to pass unconditionally from
  // the admin monitoring page without a client-side role check of its own.
  subscribeToMonitoring?: boolean;
}

// Connects on mount, disconnects on unmount — a per-page WS lifecycle, not a
// long-lived app-wide connection, matching this project's "only pay for
// real-time where a screen actually needs it" instinct. The socket itself is
// a singleton (services/websocket-client.ts), so navigating between pages
// that both use this hook just reconnects the same object.
export function useShipmentTracking({
  shipmentId,
  subscribeToQueue,
  subscribeToMonitoring,
}: UseShipmentTrackingOptions): void {
  // `useSession()` re-parses the cookie on every call and returns a brand
  // new object each time, even when its contents are unchanged — depending
  // on the whole object here would tear the socket down and reconnect on
  // every unrelated re-render of the consuming component (including the one
  // this hook's own invalidateQueries triggers after the first event),
  // risking a dropped subscription for whatever event arrives next while
  // the reconnect is still in flight. Depending on the token string instead
  // — stable unless the user actually logs out/in — avoids that churn.
  const token = useSession()?.token;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) return;

    const socket = getSocket();

    function invalidate() {
      invalidateShipmentQueries(queryClient, shipmentId);
    }

    socket.on('shipment:updated', invalidate);
    socket.connect();

    // Re-subscribe AND refetch on every (re)connect, not just on a received
    // 'shipment:updated' message. Relying solely on message delivery leaves
    // a real gap: a socket that drops and reconnects (network blip, a
    // backgrounded tab, even a dev-mode Fast Refresh recreating this
    // component) receives nothing for whatever changed while it was
    // offline — Socket.IO doesn't buffer/replay missed room broadcasts. The
    // symptom was two tabs actually disagreeing: the carrier's own mutation
    // always self-corrects its view via its onSuccess handler, but the
    // seller's view had no such fallback and would silently sit on stale
    // data until an unrelated future event happened to refresh it.
    // Refetching on every successful (re)connect closes that gap — an
    // outright missed message no longer matters, since the client catches
    // up to current server truth the moment it's back online.
    // `emit` here has no ack — the room join on the server
    // (TrackingGateway.handleSubscribeShipment) is itself async (it awaits
    // a DB lookup before `client.join`), so there's a narrow window where
    // an event could broadcast to the room before this socket has actually
    // joined it. `invalidate()` doesn't depend on room membership though —
    // it forces a REST refetch of current server truth directly — so this
    // narrow gap can only cost up to one missed push notification, not a
    // stuck-forever stale view: the `refetchInterval: 5000` backstop on
    // the query hooks this feeds (use-shipment.ts, use-queue-shipment.ts,
    // use-shipment-queue.ts) bounds the worst case to a few seconds either
    // way. Adding a real ack round-trip would close this specific gap
    // completely, but isn't worth the extra complexity while the backstop
    // already bounds it this tightly.
    function subscribeAndCatchUp() {
      if (shipmentId) {
        socket.emit('subscribe:shipment', shipmentId);
      }
      if (subscribeToQueue) {
        socket.emit('subscribe:queue');
      }
      if (subscribeToMonitoring) {
        socket.emit('subscribe:monitoring');
      }
      invalidate();
    }

    socket.on('connect', subscribeAndCatchUp);
    if (socket.connected) subscribeAndCatchUp();

    // `socket` is a module-level singleton (services/websocket-client.ts),
    // shared by every screen that calls this hook — disconnecting it here
    // unconditionally is only safe because today's routing never mounts
    // two consumers of this hook at once (each lives on its own exclusive
    // route: shipment detail, carrier queue list, carrier queue detail).
    // A future concurrent consumer (e.g. an app-shell notification badge
    // that also subscribes while a detail page is open) would have the
    // first one to unmount silently kill the connection out from under the
    // other, with no reconnect logic keyed off "am I still the last
    // subscriber". Worth a reference-counted connect/disconnect if that
    // ever happens — not built preemptively for a consumer that doesn't
    // exist yet.
    return () => {
      socket.off('shipment:updated', invalidate);
      socket.off('connect', subscribeAndCatchUp);
      socket.disconnect();
    };
  }, [token, shipmentId, subscribeToQueue, subscribeToMonitoring, queryClient]);
}
