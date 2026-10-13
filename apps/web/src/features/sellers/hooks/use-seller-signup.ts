'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/routes';
import { signupSeller } from '../api';

export function useSellerSignupMutation() {
  const router = useRouter();

  return useMutation({
    mutationFn: signupSeller,
    onSuccess: () => router.push(ROUTES.status),
  });
}
