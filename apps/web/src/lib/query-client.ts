import {
  isServer,
  type Mutation,
  MutationCache,
  QueryCache,
  QueryClient,
} from '@tanstack/react-query';
import { clearSession } from '@/lib/session';
import { ApiError } from '@/services/api-client';

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      // Set on mutations where a 401 is an expected outcome (e.g. wrong password), not an expired session.
      skipAuthRedirect?: boolean;
    };
  }
}

let browserQueryClient: QueryClient | undefined;

function forceReLogin() {
  browserQueryClient?.clear();
  clearSession();
  window.location.href = '/login';
}

function isExpiredSession(error: unknown): boolean {
  return !isServer && error instanceof ApiError && error.statusCode === 401;
}

// Only a 401 ends the session; a 403 is an authorization answer the screen shows itself.
function handleQueryError(error: unknown) {
  if (isExpiredSession(error)) forceReLogin();
}

function handleMutationError(
  error: unknown,
  _variables: unknown,
  _context: unknown,
  mutation: Mutation<unknown, unknown, unknown>,
) {
  if (!mutation.meta?.skipAuthRedirect && isExpiredSession(error)) {
    forceReLogin();
  }
}

const MAX_RETRIES = 3;

export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.statusCode < 500) return false;
  return failureCount < MAX_RETRIES;
}

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: shouldRetry,
      },
    },
    queryCache: new QueryCache({ onError: handleQueryError }),
    mutationCache: new MutationCache({ onError: handleMutationError }),
  });
}

export function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
