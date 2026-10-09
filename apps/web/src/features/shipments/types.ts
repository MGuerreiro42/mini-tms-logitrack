import type { PaginationQuery } from '@/types/pagination';
import type {
  ShipmentStatus,
  ShipmentStatusCounts,
  TrackingEvent,
} from '@/types/status';

export type { ShipmentStatus, ShipmentStatusCounts, TrackingEvent };

// Modalities without slaHours are omitted by the API, not reported as 0%.
export interface SlaSummaryItem {
  modalityCode: string;
  modalityName: string;
  deliveredCount: number;
  onTimeCount: number;
  onTimeRate: number;
}

export interface ShipmentAddress {
  addressStreet: string;
  addressNumber: string;
  addressComplement: string | null;
  addressNeighborhood: string;
  addressCity: string;
  addressState: string;
  addressZipCode: string;
}

export interface ShipmentBase extends ShipmentAddress {
  id: string;
  trackingCode: string;
  status: ShipmentStatus;
  modalityId: string;
  modalityName: string;
  createdAt: string;
  // Only on single-record reads, never in lists.
  trackingEvents?: TrackingEvent[];
}

export interface Shipment extends ShipmentBase {
  carrierId: string;
  carrierName: string;
}

// Carrier view: adds seller contact and owner, which the seller's own view doesn't need.
export interface CarrierShipment extends ShipmentBase {
  sellerId: string;
  sellerCompanyName: string;
  sellerEmail: string;
  ownerId: string | null;
  ownerEmail: string | null;
}

// Admin view: CarrierShipment plus the carrier name.
export interface AdminShipment extends CarrierShipment {
  carrierCompanyName: string;
}

export interface ListAdminShipmentsQuery extends PaginationQuery {
  status?: ShipmentStatus;
  carrierId?: string;
  sellerId?: string;
}

export interface CreateShipmentInput {
  addressStreet: string;
  addressNumber: string;
  addressComplement?: string;
  addressNeighborhood: string;
  addressCity: string;
  addressState: string;
  addressZipCode: string;
  modalityId: string;
  carrierId: string;
}

// A modality the seller has enabled, offered when creating a shipment.
export interface ModalityOption {
  id: string;
  name: string;
}

export interface EligibleCarrier {
  id: string;
  companyName: string;
}

export interface ListShipmentsQuery extends PaginationQuery {
  status?: ShipmentStatus;
}

export interface ListQueueQuery extends PaginationQuery {
  status?: ShipmentStatus;
}

// Mirrors the API's limit on tracking event notes.
export const TRACKING_NOTE_MAX_LENGTH = 500;

export interface UpdateShipmentStatusInput {
  status: ShipmentStatus;
  note?: string;
}

// UI mirror of the API transition map; the API re-validates. PENDING advances via Claim.
export const ALLOWED_NEXT_STATUSES: Record<ShipmentStatus, ShipmentStatus[]> = {
  PENDING: [],
  ACCEPTED: ['COLLECTED'],
  COLLECTED: ['IN_TRANSIT'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED_DELIVERY'],
  FAILED_DELIVERY: ['RETURNED'],
  DELIVERED: [],
  RETURNED: [],
  CANCELLED: [],
};

const SELLER_CANCELLABLE: ShipmentStatus[] = ['PENDING', 'ACCEPTED'];

export function isCancellableBySeller(status: ShipmentStatus): boolean {
  return SELLER_CANCELLABLE.includes(status);
}

// A cancelled shipment can also be unowned, so ownership alone isn't enough.
export function isClaimable(shipment: CarrierShipment): boolean {
  return shipment.status === 'PENDING' && !shipment.ownerId;
}

export function ownerLabel(shipment: CarrierShipment): string {
  return shipment.ownerEmail ?? (isClaimable(shipment) ? 'Unclaimed' : '—');
}
