'use client';

import { useMutation, useMutationState } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { safeNext, setSession } from '@/lib/session';
import { login } from '../api';
import type { LoginInput } from '../types';

// Shared by the form and the demo picker, so each sees the other's attempt.
export const LOGIN_MUTATION_KEY = ['auth', 'login'];

// From the first click until the next page loads: a success only starts the navigation, so
// nothing may sign in another role meanwhile. A sign-out clears the cache with a full reload.
export function useSigningIn(): boolean {
  return useMutationState({
    filters: { mutationKey: LOGIN_MUTATION_KEY },
    select: (mutation) => mutation.state.status,
  }).some((status) => status === 'pending' || status === 'success');
}

export function useLoginMutation(next?: string) {
  const router = useRouter();

  return useMutation({
    mutationKey: LOGIN_MUTATION_KEY,
    mutationFn: (input: LoginInput) => login(input),
    meta: { skipAuthRedirect: true },
    onSuccess: ({ accessToken, user }) => {
      setSession({
        token: accessToken,
        role: user.role,
        userId: user.id,
        email: user.email,
      });
      router.push(safeNext(next, user.role));
    },
  });
}
