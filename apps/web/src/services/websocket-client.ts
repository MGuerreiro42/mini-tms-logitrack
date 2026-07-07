import { io, type Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

let socket: Socket | undefined;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(WS_URL, { autoConnect: false });
  }
  return socket;
}
