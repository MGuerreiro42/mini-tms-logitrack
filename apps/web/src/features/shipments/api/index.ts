import { apiClient, toQueryString } from '@/services/api-client';
import type { Paginated } from '@/types/pagination';
import type {
  AdminShipment,
  AdminShipmentDetail,
  AdminShipmentResponse,
  AdminStatusCountsQuery,
  CarrierShipment,
  CarrierView,
  CreateShipmentInput,
  EligibleCarrier,
  ListAdminShipmentsQuery,
  ListQueueQuery,
  ListShipmentsQuery,
  QueueShipmentDetail,
  Shipment,
  ShipmentActivity,
  ShipmentAttention,
  ShipmentDetail,
  ShipmentStatusCounts,
  SlaSummaryItem,
  UpdateShipmentStatusInput,
  ViewCounts,
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

export function getShipment(
  id: string,
  token: string,
): Promise<ShipmentDetail> {
  return apiClient<ShipmentDetail>(`/shipments/${id}`, undefined, token);
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

export function getShipmentViewCounts(token: string): Promise<ViewCounts> {
  return apiClient<ViewCounts>('/shipments/view-counts', undefined, token);
}

export function getQueueViewCounts(
  token: string,
): Promise<Record<CarrierView, number>> {
  return apiClient<Record<CarrierView, number>>(
    '/shipments/queue/view-counts',
    undefined,
    token,
  );
}

export function getShipmentAttention(
  token: string,
): Promise<ShipmentAttention> {
  return apiClient<ShipmentAttention>('/shipments/attention', undefined, token);
}

export function getShipmentActivity(
  limit: number,
  token: string,
): Promise<ShipmentActivity[]> {
  return apiClient<ShipmentActivity[]>(
    `/shipments/activity${toQueryString({ limit })}`,
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

function toAdminShipment<T extends AdminShipmentResponse>({
  carrierCompanyName,
  ...row
}: T) {
  return { ...row, carrierName: carrierCompanyName };
}

export async function listAdminShipments(
  query: ListAdminShipmentsQuery,
  token: string,
): Promise<Paginated<AdminShipment>> {
  const page = await apiClient<Paginated<AdminShipmentResponse>>(
    `/admin/shipments${toQueryString({ ...query })}`,
    undefined,
    token,
  );
  return {
    ...page,
    data: page.data.map(toAdminShipment),
  };
}

export async function getAdminShipment(
  id: string,
  token: string,
): Promise<AdminShipmentDetail> {
  return toAdminShipment(
    await apiClient<
      AdminShipmentResponse & Pick<AdminShipmentDetail, 'trackingEvents'>
    >(`/admin/shipments/${id}`, undefined, token),
  );
}

export function getAdminShipmentStatusCounts(
  query: AdminStatusCountsQuery,
  token: string,
): Promise<ShipmentStatusCounts> {
  return apiClient<ShipmentStatusCounts>(
    `/admin/shipments/status-counts${toQueryString({ ...query })}`,
    undefined,
    token,
  );
}

export function getAdminShipmentViewCounts(
  query: AdminStatusCountsQuery,
  token: string,
): Promise<ViewCounts> {
  return apiClient<ViewCounts>(
    `/admin/shipments/view-counts${toQueryString({ ...query })}`,
    undefined,
    token,
  );
}

export function getQueueShipment(
  id: string,
  token: string,
): Promise<QueueShipmentDetail> {
  return apiClient<QueueShipmentDetail>(
    `/shipments/queue/${id}`,
    undefined,
    token,
  );
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
