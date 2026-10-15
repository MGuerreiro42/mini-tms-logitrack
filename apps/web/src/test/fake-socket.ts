import { vi } from 'vitest';

type Listener = (...args: unknown[]) => void;

export function makeFakeSocket() {
  const listeners: Record<string, Listener[]> = {};
  const socket = {
    connected: false,
    on: vi.fn((event: string, cb: Listener) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(cb);
    }),
    off: vi.fn((event: string, cb: Listener) => {
      listeners[event] = (listeners[event] ?? []).filter((fn) => fn !== cb);
    }),
    emit: vi.fn(),
    timeout: vi.fn(() => socket),
    connect: vi.fn(),
    disconnect: vi.fn(),
    trigger(event: string, ...args: unknown[]) {
      for (const cb of listeners[event] ?? []) cb(...args);
    },
    ackAll(ack: unknown, error: unknown = null) {
      for (const call of socket.emit.mock.calls) {
        const cb = call.at(-1);
        if (typeof cb === 'function') cb(error, ack);
      }
    },
  };
  return socket;
}
