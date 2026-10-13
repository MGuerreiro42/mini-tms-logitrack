'use client';

import { useEffect, useEffectEvent, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { LiveStatus } from '@/lib/live-status';
import { retainSocket } from '@/services/websocket-client';

const ACK_TIMEOUT_MS = 5000;

export interface SocketSubscription {
  event: string;
  args?: unknown[];
}

interface UseSocketSubscriptionOptions<P> {
  getSocket: () => Socket;
  connectionKey: string | undefined;
  subscriptions: SocketSubscription[];
  updateEvent: string;
  onUpdate: (payload?: P) => void;
}

function subscribe(
  socket: Socket,
  { event, args = [] }: SocketSubscription,
): Promise<boolean> {
  return new Promise((resolve) => {
    socket
      .timeout(ACK_TIMEOUT_MS)
      .emit(event, ...args, (error: unknown, ack?: { ok?: boolean }) =>
        resolve(!error && ack?.ok === true),
      );
  });
}

export function useSocketSubscription<P>({
  getSocket,
  connectionKey,
  subscriptions,
  updateEvent,
  onUpdate,
}: UseSocketSubscriptionOptions<P>): LiveStatus {
  const [status, setStatus] = useState<LiveStatus>('connecting');
  const resolveSocket = useEffectEvent(getSocket);
  const notify = useEffectEvent((payload?: P) => onUpdate(payload));
  const subscriptionsKey = JSON.stringify(subscriptions);

  useEffect(() => {
    if (!connectionKey) return;

    const socket = resolveSocket();
    const rooms: SocketSubscription[] = JSON.parse(subscriptionsKey);
    let attempt = 0;

    function handleUpdate(payload?: P) {
      notify(payload);
    }

    // Rooms aren't replayed after a reconnect: re-subscribe, then refetch to catch up.
    function handleConnect() {
      const current = ++attempt;
      Promise.all(rooms.map((room) => subscribe(socket, room))).then((oks) => {
        // An ack that times out after a newer connection went live must not flip it back.
        if (current !== attempt) return;
        setStatus(oks.every(Boolean) ? 'live' : 'offline');
      });
      handleUpdate();
    }

    function handleOffline() {
      attempt++;
      setStatus('offline');
    }

    socket.on(updateEvent, handleUpdate);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleOffline);
    socket.on('connect_error', handleOffline);
    const release = retainSocket(socket);
    // A socket another subscriber already holds open fires no connect event for this one.
    if (socket.connected) handleConnect();

    return () => {
      attempt++;
      socket.off(updateEvent, handleUpdate);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleOffline);
      socket.off('connect_error', handleOffline);
      release();
      setStatus('connecting');
    };
  }, [connectionKey, subscriptionsKey, updateEvent]);

  return status;
}
