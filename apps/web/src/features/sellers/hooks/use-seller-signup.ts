'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { signupSeller } from '../api';

export function useSellerSignupMutation() {
  const router = useRouter();

  return useMutation({
    mutationFn: signupSeller,
    // Signup returns no token (no session yet) — status page's no-cookie
    // mode renders a static "submitted, pending review" message.
    onSuccess: () => router.push('/status'),
  });
}
