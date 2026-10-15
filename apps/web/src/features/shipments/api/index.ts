import { SHIPMENT_STATUSES } from '@/lib/status-colors';
import { apiClient, toQueryString } from '@/services/api-client';
import type { Paginated } from '@/types/pagination';
import type {
  AdminShipment,
  CarrierShipment,
  CreateShipmentInput,
  EligibleCarrier,
  ListAdminShipmentsQuery,
  ListQueueQuery,
  ListShipmentsQuery,
  Shipment,
  ShipmentStatusCounts,
  SlaSummaryItem,
  UpdateShipmentStatusInput,
} from '../types';

export function getEligibleCarriers(
  state: string,
  city: string,
  modalityId: string,
  token: string,
): Promise<EligibleCarrier[]> {
  return apiClient<EligibleCarrier[]>(
    `/shipments/eligible-carriers${toQueryString({ state, city, modalityId })}`,
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
  return apiClient<Paginated<Shipment>>(
    `/shipments${toQueryString({ ...query })}`,
    undefined,
    token,
  );
}

export function getShipment(id: string, token: string): Promise<Shipment> {
  return apiClient<Shipment>(`/shipments/${id}`, undefined, token);
}

export function getShipmentStatusCounts(
  token: string,
): Promise<ShipmentStatusCounts> {
  return apiClient<ShipmentStatusCounts>(
    '/shipments/status-counts',
    undefined,
    token,
  );
}

export function getSlaSummary(token: string): Promise<SlaSummaryItem[]> {
  return apiClient<SlaSummaryItem[]>(
    '/shipments/sla-summary',
    undefined,
    token,
  );
}

export function listQueue(
  query: ListQueueQuery,
  token: string,
): Promise<Paginated<CarrierShipment>> {
  return apiClient<Paginated<CarrierShipment>>(
    `/shipments/queue${toQueryString({ ...query })}`,
    undefined,
    token,
  );
}

export function listAdminShipments(
  query: ListAdminShipmentsQuery,
  token: string,
): Promise<Paginated<AdminShipment>> {
  return apiClient<Paginated<AdminShipment>>(
    `/admin/shipments${toQueryString({ ...query })}`,
    undefined,
    token,
  );
}

// No admin counts endpoint yet: each status total comes from a one-row page.
export async function getAdminShipmentStatusCounts(
  token: string,
): Promise<ShipmentStatusCounts> {
  const totals = await Promise.all(
    SHIPMENT_STATUSES.map((status) =>
      listAdminShipments({ status, page: 1, limit: 1 }, token).then(
        (page) => [status, page.meta.total] as const,
      ),
    ),
  );
  return Object.fromEntries(totals) as ShipmentStatusCounts;
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

export function cancelShipment(
  id: string,
  note: string | undefined,
  token: string,
): Promise<Shipment> {
  return apiClient<Shipment>(
    `/shipments/${id}/cancel`,
    { method: 'PATCH', body: JSON.stringify({ note }) },
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
