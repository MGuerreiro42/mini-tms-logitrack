'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { signupCarrier } from '../api';

export function useCarrierSignupMutation() {
  const router = useRouter();

  return useMutation({
    mutationFn: signupCarrier,
    onSuccess: () => router.push('/status'),
  });
}
