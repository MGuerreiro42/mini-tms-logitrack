'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { signupSeller } from '../api';

export function useSellerSignupMutation() {
  const router = useRouter();

  return useMutation({
    mutationFn: signupSeller,
    onSuccess: () => router.push('/status'),
  });
}
