import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { server } from './src/test/msw/server';
import { resetNavigation } from './src/test/navigation';

vi.mock('next/navigation', () => import('./src/test/navigation'));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetNavigation();
});
afterAll(() => server.close());
