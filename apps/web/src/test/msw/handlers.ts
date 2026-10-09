import type { HttpHandler } from 'msw';

// No defaults: each test registers its own endpoints, and unhandled requests fail.
export const handlers: HttpHandler[] = [];
