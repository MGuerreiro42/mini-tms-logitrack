import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { server } from './src/test/msw/server';
import { resetNavigation } from './src/test/navigation';
import { installMatchMedia, resetViewport } from './src/test/viewport';

vi.mock('next/navigation', () => import('./src/test/navigation'));

installMatchMedia();

// Node's built-in webstorage global is undefined without --localstorage-file and shadows jsdom's.
Object.defineProperty(globalThis, 'localStorage', {
  value: (globalThis as unknown as { jsdom: { window: Window } }).jsdom.window
    .localStorage,
  configurable: true,
});

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetNavigation();
  resetViewport();
  localStorage.clear();
});
afterAll(() => server.close());
