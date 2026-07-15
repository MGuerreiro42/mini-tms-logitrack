import { io, type Socket } from 'socket.io-client';
import { getSessionFromDocument } from '@/lib/session';

const WS_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

let socket: Socket | undefined;

// `auth` is the callback form, not a static object, so every (re)connect
// attempt — including automatic reconnects after the 1-day JWT expires —
// reads whatever token is current in the cookie at that moment, instead of
// replaying whichever token was current the first time getSocket() ran.
export function getSocket(): Socket {
  if (!socket) {
    socket = io(WS_URL, {
      autoConnect: false,
      auth: (cb) => cb({ token: getSessionFromDocument()?.token }),
    });
  }
  return socket;
}
