'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { setSession } from '@/lib/session';
import { login } from '../api';
import type { GlobalRole, LoginInput } from '../types';

// The role's home route — each layout's own server-side gate (reading
// GET /sellers/me or /carriers/me) decides from there whether to actually
// render the dashboard or redirect to /status (PENDING/REJECTED). This hook
// doesn't need to know approval status, only where to send the browser next.
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
