import { vi } from 'vitest';

// Minimal socket.io Socket fake with a manual event trigger.
export function makeFakeSocket() {
  const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
  return {
    connected: false,
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(cb);
    }),
    off: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      listeners[event] = (listeners[event] ?? []).filter((fn) => fn !== cb);
    }),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    trigger(event: string, ...args: unknown[]) {
      for (const cb of listeners[event] ?? []) cb(...args);
    },
  };
}
