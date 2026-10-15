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

// Hooks share one socket, so a room is left only when its last holder lets go.
const roomHolders = new WeakMap<Socket, Map<string, number>>();

function holdRooms(socket: Socket, keys: string[]) {
  const holders = roomHolders.get(socket) ?? new Map<string, number>();
  roomHolders.set(socket, holders);
  for (const key of keys) holders.set(key, (holders.get(key) ?? 0) + 1);
}

function releaseRooms(socket: Socket, keys: string[]) {
  const holders = roomHolders.get(socket);
  for (const key of keys) {
    const left = (holders?.get(key) ?? 1) - 1;
    if (left > 0) {
      holders?.set(key, left);
      continue;
    }
    holders?.delete(key);
    const { event, args = [] }: SocketSubscription = JSON.parse(key);
    if (socket.connected) {
      socket.emit(event.replace(/^subscribe:/, 'unsubscribe:'), ...args);
    }
  }
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
  const subscriptionsKey = JSON.stringify(
    subscriptions.map((room) => JSON.stringify(room)).sort(),
  );

  useEffect(() => {
    const keys: string[] = JSON.parse(subscriptionsKey);
    if (!connectionKey || keys.length === 0) return;

    const socket = resolveSocket();
    const rooms: SocketSubscription[] = keys.map((key) => JSON.parse(key));
    let attempt = 0;

    function handleUpdate(payload?: P) {
      notify(payload);
    }

    // Rooms aren't replayed after a reconnect; the catch-up refetch waits for the acks so nothing emitted before the join is missed.
    function handleConnect() {
      const current = ++attempt;
      Promise.all(rooms.map((room) => subscribe(socket, room))).then((oks) => {
        // An ack that times out after a newer connection went live must not flip it back.
        if (current !== attempt) return;
        setStatus(oks.every(Boolean) ? 'live' : 'offline');
        notify();
      });
    }

    function handleOffline() {
      attempt++;
      setStatus('offline');
    }

    socket.on(updateEvent, handleUpdate);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleOffline);
    socket.on('connect_error', handleOffline);
    holdRooms(socket, keys);
    const release = retainSocket(socket);
    // A socket another subscriber already holds open fires no connect event for this one.
    if (socket.connected) handleConnect();

    return () => {
      attempt++;
      socket.off(updateEvent, handleUpdate);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleOffline);
      socket.off('connect_error', handleOffline);
      releaseRooms(socket, keys);
      release();
      setStatus('connecting');
    };
  }, [connectionKey, subscriptionsKey, updateEvent]);

  return status;
}
