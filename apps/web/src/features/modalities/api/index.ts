import { apiClient } from '@/services/api-client';
import type { DeliveryModality } from '../types';

export function getDeliveryModalities(
  token: string,
): Promise<DeliveryModality[]> {
  return apiClient<DeliveryModality[]>(
    '/delivery-modalities',
    undefined,
    token,
  );
}
