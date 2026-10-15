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

function isAuthError(error: unknown): error is ApiError {
  return !isServer && error instanceof ApiError;
}

// Single place that reacts to an expired session.
function handleMutationError(
  error: unknown,
  _variables: unknown,
  _context: unknown,
  mutation: Mutation<unknown, unknown, unknown>,
) {
  if (mutation.meta?.skipAuthRedirect) return;
  if (isAuthError(error) && error.statusCode === 401) {
    forceReLogin();
  }
}

// Reads enforce ownership with 404, so a query 403 means the session no longer fits the page
// (e.g. another tab logged in as a different role). A mutation 403 is a normal rejection.
function handleQueryError(error: unknown) {
  if (isAuthError(error) && [401, 403].includes(error.statusCode)) {
    forceReLogin();
  }
}

const MAX_RETRIES = 3;

// 4xx answers won't change on retry; retrying only delays the not-found/error UI.
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.statusCode < 500) return false;
  return failureCount < MAX_RETRIES;
}

function makeQueryClient() {
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
