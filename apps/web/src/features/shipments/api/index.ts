import { apiClient } from '@/services/api-client';
import type { Paginated } from '@/types/pagination';
import type {
  CarrierShipment,
  CreateShipmentInput,
  EligibleCarrier,
  ListQueueQuery,
  ListShipmentsQuery,
  Shipment,
  UpdateShipmentStatusInput,
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

export function listQueue(
  query: ListQueueQuery,
  token: string,
): Promise<Paginated<CarrierShipment>> {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  const qs = params.toString();
  return apiClient<Paginated<CarrierShipment>>(
    `/shipments/queue${qs ? `?${qs}` : ''}`,
    undefined,
    token,
  );
}

export function getQueueShipment(
  id: string,
  token: string,
): Promise<CarrierShipment> {
  return apiClient<CarrierShipment>(`/shipments/queue/${id}`, undefined, token);
}

export function claimShipment(
  id: string,
  token: string,
): Promise<CarrierShipment> {
  return apiClient<CarrierShipment>(
    `/shipments/${id}/claim`,
    { method: 'PATCH' },
    token,
  );
}

export function updateShipmentStatus(
  id: string,
  input: UpdateShipmentStatusInput,
  token: string,
): Promise<CarrierShipment> {
  return apiClient<CarrierShipment>(
    `/shipments/${id}/status`,
    { method: 'PATCH', body: JSON.stringify(input) },
    token,
  );
}
