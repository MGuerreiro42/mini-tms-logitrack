'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ROLE_HOME, setSession } from '@/lib/session';
import { login } from '../api';
import type { LoginInput } from '../types';

export function useLoginMutation() {
  const router = useRouter();

  return useMutation({
    mutationFn: (input: LoginInput) => login(input),
    meta: { skipAuthRedirect: true },
    onSuccess: ({ accessToken, user }) => {
      setSession({
        token: accessToken,
        role: user.role,
        userId: user.id,
        email: user.email,
      });
      router.push(ROLE_HOME[user.role]);
    },
  });
}
