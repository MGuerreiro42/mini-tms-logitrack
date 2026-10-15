'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { setSession } from '@/lib/session';
import { login } from '../api';
import type { GlobalRole, LoginInput } from '../types';

function roleHomePath(role: GlobalRole): string {
  switch (role) {
    case 'ADMIN':
      return '/admin';
    case 'SELLER':
      return '/seller';
    case 'CARRIER_MANAGER':
    case 'CARRIER_OPERATOR':
      return '/carrier';
  }
}

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
      router.push(roleHomePath(user.role));
    },
  });
}
