import { apiClient } from '@/services/api-client';
import type { PublicTracking } from '../types';

export function getPublicTracking(
  trackingCode: string,
): Promise<PublicTracking> {
  return apiClient<PublicTracking>(
    `/public/tracking/${encodeURIComponent(trackingCode)}`,
  );
}
