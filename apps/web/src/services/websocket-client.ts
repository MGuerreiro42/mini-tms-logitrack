import {
  io,
  type ManagerOptions,
  type Socket,
  type SocketOptions,
} from 'socket.io-client';
import { API_URL } from '@/lib/api-url';
import { getSessionFromDocument } from '@/lib/session';

const sockets = new Map<string, Socket>();
const consumers = new WeakMap<Socket, number>();

function socketFor(
  url: string,
  options?: Partial<ManagerOptions & SocketOptions>,
): Socket {
  let socket = sockets.get(url);
  if (!socket) {
    socket = io(url, {
      autoConnect: false,
      // Skip the long-polling handshake: it needs sticky sessions across multiple API instances.
      transports: ['websocket'],
      ...options,
    });
    sockets.set(url, socket);
  }
  return socket;
}

// Callback-form auth so every reconnect reads the current cookie token.
export function getSocket(): Socket {
  return socketFor(API_URL, {
    auth: (cb) => cb({ token: getSessionFromDocument()?.token }),
  });
}

export function getPublicSocket(): Socket {
  return socketFor(new URL('/public', API_URL).toString());
}

const SETTLED_EVENTS = ['connect', 'connect_error'] as const;

function isUnused(socket: Socket): boolean {
  return (consumers.get(socket) ?? 0) === 0;
}

// Closing a socket mid-handshake makes the browser warn, so an unused one is dropped only once the attempt settles.
function disconnectOnceSettled(socket: Socket): void {
  if (socket.connected || !socket.active) {
    socket.disconnect();
    return;
  }

  function handleSettled() {
    for (const event of SETTLED_EVENTS) socket.off(event, handleSettled);
    if (isUnused(socket)) socket.disconnect();
  }
  for (const event of SETTLED_EVENTS) socket.on(event, handleSettled);
}

export function retainSocket(socket: Socket): () => void {
  const held = consumers.get(socket) ?? 0;
  consumers.set(socket, held + 1);
  if (held === 0) socket.connect();

  let released = false;
  return () => {
    if (released) return;
    released = true;
    const left = (consumers.get(socket) ?? 1) - 1;
    consumers.set(socket, left);
    if (left === 0) disconnectOnceSettled(socket);
  };
}
