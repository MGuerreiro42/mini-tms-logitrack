import { vi } from 'vitest';

// Minimal fake for socket.io-client's Socket — just enough surface (on/off/
// emit/connect/disconnect/connected + a manual event trigger) for testing
// code that orchestrates a socket's lifecycle, without opening a real
// connection. Shared across every test that mocks '@/services/websocket-client'.
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
