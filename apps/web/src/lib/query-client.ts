import {
  isServer,
  MutationCache,
  QueryCache,
  QueryClient,
} from '@tanstack/react-query';
import { clearSession } from '@/lib/session';
import { ApiError } from '@/services/api-client';

function forceReLogin() {
  clearSession();
  window.location.href = '/login';
}

function isAuthError(error: unknown): error is ApiError {
  return !isServer && error instanceof ApiError;
}

// The JWT expires in 1 day server-side — this is the one place that reacts
// to that, instead of every query/mutation needing its own 401 branch.
function handleMutationError(error: unknown) {
  if (isAuthError(error) && error.statusCode === 401) {
    forceReLogin();
  }
}

// Queries additionally treat 403 as an invalid session, not just 401 —
// mutations don't get this (see below for why the distinction matters).
// Every read endpoint in this app enforces ownership via 404, never 403 (a
// shipment belonging to another seller looks identical to one that doesn't
// exist — DESIGN.md's own established convention). So a 403 on a *query*
// can only mean the session's role doesn't match what this page needs —
// concretely, two browser tabs sharing one cookie jar, where logging in as
// a different role in tab B silently swaps out tab A's token. That's not a
// business outcome to toast about, it's proof this session is no longer
// valid for what's on screen, so it gets the same treatment as an expired
// token.
//
// Mutations don't get the 403-forces-logout treatment: a mutation 403 can
// legitimately mean "you're a real, correctly-authenticated operator, just
// not this shipment's owner" (ShipmentsService.updateStatus's ownership
// check) — an expected outcome of a user action, not a broken session.
// Forcing a logout there would eject a perfectly valid user just for
// clicking something they're not allowed to. That case already surfaces
// via each mutation hook's own onError toast.
function handleQueryError(error: unknown) {
  if (isAuthError(error) && [401, 403].includes(error.statusCode)) {
    forceReLogin();
  }
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
    queryCache: new QueryCache({ onError: handleQueryError }),
    mutationCache: new MutationCache({ onError: handleMutationError }),
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
