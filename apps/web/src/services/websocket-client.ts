import {
  io,
  type ManagerOptions,
  type Socket,
  type SocketOptions,
} from 'socket.io-client';
import { getSessionFromDocument } from '@/lib/session';

const WS_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

const sockets = new Map<string, Socket>();

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
  return socketFor(WS_URL, {
    auth: (cb) => cb({ token: getSessionFromDocument()?.token }),
  });
}

export function getPublicSocket(): Socket {
  return socketFor(`${WS_URL}/public`);
}
