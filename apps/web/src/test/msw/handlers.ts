import type { HttpHandler } from 'msw';

// No default handlers on purpose — every test registers exactly the
// endpoints it exercises via `server.use(...)`, so an unmocked request
// (`onUnhandledRequest: 'error'` in vitest.setup.ts) fails loudly instead of
// falling through to a stale or overly-generic fixture.
export const handlers: HttpHandler[] = [];
