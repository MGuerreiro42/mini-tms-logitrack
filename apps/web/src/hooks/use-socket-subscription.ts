'use client';

import { useEffect, useEffectEvent } from 'react';
import type { Socket } from 'socket.io-client';
import { useRealtimeStore } from '@/store/realtime-store';

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

// Live only once every room acked; until then the fallback poll keeps running.
export function useSocketSubscription<P>({
  getSocket,
  connectionKey,
  subscriptions,
  updateEvent,
  onUpdate,
}: UseSocketSubscriptionOptions<P>): void {
  const setConnected = useRealtimeStore((state) => state.setConnected);
  const resolveSocket = useEffectEvent(getSocket);
  const notify = useEffectEvent((payload?: P) => onUpdate(payload));
  const subscriptionsKey = JSON.stringify(subscriptions);

  useEffect(() => {
    if (!connectionKey) return;

    const socket = resolveSocket();
    const rooms: SocketSubscription[] = JSON.parse(subscriptionsKey);
    let active = true;

    function handleUpdate(payload?: P) {
      notify(payload);
    }

    // Rooms aren't replayed after a reconnect: re-subscribe, then refetch to catch up.
    function handleConnect() {
      Promise.all(rooms.map((room) => subscribe(socket, room))).then((oks) => {
        if (active) setConnected(oks.every(Boolean));
      });
      handleUpdate();
    }

    function handleDisconnect() {
      setConnected(false);
    }

    socket.on(updateEvent, handleUpdate);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.connect();
    if (socket.connected) handleConnect();

    return () => {
      active = false;
      socket.off(updateEvent, handleUpdate);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.disconnect();
      setConnected(false);
    };
  }, [connectionKey, subscriptionsKey, updateEvent, setConnected]);
}
