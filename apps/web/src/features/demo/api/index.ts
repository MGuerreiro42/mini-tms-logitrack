import { apiClient } from '@/services/api-client';
import type { AdminChaos, AdminDemo, DemoStatus } from '../types';

export const demoKeys = {
  all: ['demo'] as const,
  status: () => [...demoKeys.all, 'status'] as const,
  admin: () => [...demoKeys.all, 'admin'] as const,
};

export function getDemoStatus(token: string): Promise<DemoStatus> {
  return apiClient<DemoStatus>('/demo/status', undefined, token);
}

export function getAdminDemo(token: string): Promise<AdminDemo> {
  return apiClient<AdminDemo>('/admin/demo', undefined, token);
}

export function resetDemo(token: string): Promise<void> {
  return apiClient<void>('/admin/demo/reset', { method: 'POST' }, token);
}

export function startChaos(
  input: { scenario: string; durationSec: number },
  token: string,
): Promise<AdminChaos> {
  return apiClient<AdminChaos>(
    '/admin/demo/chaos',
    { method: 'POST', body: JSON.stringify(input) },
    token,
  );
}

export function endChaos(token: string): Promise<void> {
  return apiClient<void>('/admin/demo/chaos', { method: 'DELETE' }, token);
}
