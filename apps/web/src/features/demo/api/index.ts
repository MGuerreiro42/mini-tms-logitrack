import { apiClient } from '@/services/api-client';
import type { DemoStatus } from '../types';

export const demoKeys = {
  all: ['demo'] as const,
  status: () => [...demoKeys.all, 'status'] as const,
};

export function getDemoStatus(token: string): Promise<DemoStatus> {
  return apiClient<DemoStatus>('/demo/status', undefined, token);
}

export function endChaos(token: string): Promise<void> {
  return apiClient<void>('/admin/demo/chaos', { method: 'DELETE' }, token);
}
