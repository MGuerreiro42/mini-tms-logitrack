import {
  isServer,
  MutationCache,
  QueryCache,
  QueryClient,
} from '@tanstack/react-query';
import { clearSession } from '@/lib/session';
import { ApiError } from '@/services/api-client';

// The JWT expires in 1 day server-side — this is the one place that reacts
// to that, instead of every query/mutation needing its own 401 branch.
function handleError(error: unknown) {
  if (!isServer && error instanceof ApiError && error.statusCode === 401) {
    clearSession();
    window.location.href = '/login';
  }
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
    queryCache: new QueryCache({ onError: handleError }),
    mutationCache: new MutationCache({ onError: handleError }),
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
