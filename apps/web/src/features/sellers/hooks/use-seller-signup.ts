'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { signupSeller } from '../api';

export function useSellerSignupMutation() {
  const router = useRouter();

  return useMutation({
    mutationFn: signupSeller,
    // Signup returns no token; /status shows the pending message without a session.
    onSuccess: () => router.push('/status'),
  });
}
