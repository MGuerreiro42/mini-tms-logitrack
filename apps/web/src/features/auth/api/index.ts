import { apiClient } from '@/services/api-client';
import type { LoginInput, LoginResponse } from '../types';

export function login(input: LoginInput): Promise<LoginResponse> {
  return apiClient<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
