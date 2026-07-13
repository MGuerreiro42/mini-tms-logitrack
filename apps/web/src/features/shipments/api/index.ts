import { apiClient } from '@/services/api-client';
import type { Paginated } from '@/types/pagination';
import type {
  CreateShipmentInput,
  EligibleCarrier,
  ListShipmentsQuery,
  Shipment,
} from '../types';

export function getEligibleCarriers(
  state: string,
  city: string,
  modalityId: string,
  token: string,
): Promise<EligibleCarrier[]> {
  const params = new URLSearchParams({ state, city, modalityId });
  return apiClient<EligibleCarrier[]>(
    `/shipments/eligible-carriers?${params.toString()}`,
    undefined,
    token,
  );
}

export function createShipment(
  input: CreateShipmentInput,
  token: string,
): Promise<Shipment> {
  return apiClient<Shipment>(
    '/shipments',
    { method: 'POST', body: JSON.stringify(input) },
    token,
  );
}

export function listShipments(
  query: ListShipmentsQuery,
  token: string,
): Promise<Paginated<Shipment>> {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  const qs = params.toString();
  return apiClient<Paginated<Shipment>>(
    `/shipments${qs ? `?${qs}` : ''}`,
    undefined,
    token,
  );
}

export function getShipment(id: string, token: string): Promise<Shipment> {
  return apiClient<Shipment>(`/shipments/${id}`, undefined, token);
}
