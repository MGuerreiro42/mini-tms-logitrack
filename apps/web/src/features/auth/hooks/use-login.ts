'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { safeNext, setSession } from '@/lib/session';
import { login } from '../api';
import type { LoginInput } from '../types';

// Shared by the form and the demo picker, so each sees the other's attempt.
export const LOGIN_MUTATION_KEY = ['auth', 'login'];

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
