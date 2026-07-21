import type { PaginationQuery } from '@/types/pagination';

export type ShipmentStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'COLLECTED'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED_DELIVERY'
  | 'CANCELLED'
  | 'RETURNED';

export type ShipmentStatusCounts = Record<ShipmentStatus, number>;

export interface TrackingEvent {
  id: string;
  status: ShipmentStatus;
  note: string | null;
  createdAt: string;
}

export interface Shipment {
  id: string;
  trackingCode: string;
  status: ShipmentStatus;
  carrierId: string;
  carrierName: string;
  modalityId: string;
  modalityName: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement: string | null;
  addressNeighborhood: string;
  addressCity: string;
  addressState: string;
  addressZipCode: string;
  createdAt: string;
  // Only populated on the single-record read (GET /shipments/:id), never the
  // paginated list — mirrors the backend's own over-fetch-avoidance choice.
  trackingEvents?: TrackingEvent[];
}

// The carrier-facing counterpart to Shipment — distinct type, not a shared
// base extended both ways: this one carries the seller's contact info and
// the claiming owner, neither of which the seller's own view has business
// seeing about itself (mirrors apps/api's CarrierShipmentResponseDto split).
export interface CarrierShipment {
  id: string;
  trackingCode: string;
  status: ShipmentStatus;
  modalityId: string;
  modalityName: string;
  sellerId: string;
  sellerCompanyName: string;
  sellerEmail: string;
  ownerId: string | null;
  ownerEmail: string | null;
  addressStreet: string;
  addressNumber: string;
  addressComplement: string | null;
  addressNeighborhood: string;
  addressCity: string;
  addressState: string;
  addressZipCode: string;
  createdAt: string;
  trackingEvents?: TrackingEvent[];
}

// The admin-facing counterpart to CarrierShipment — same shape (seller info
// already included there) plus the carrier's own name, since an admin
// viewing platform-wide traffic has no "my own carrier" context to already
// know it from.
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

export interface UpdateShipmentStatusInput {
  status: ShipmentStatus;
  note?: string;
}

// UI-only mirror of the backend's allowed-transition map
// (apps/api/src/modules/shipments/shipment-status.util.ts) — purely to let
// the operator pick from valid next statuses; the backend re-validates
// every transition regardless, matching this project's "rules enforced
// backend-side" philosophy (DESIGN.md § 1). PENDING maps to an empty list
// here since advancing out of PENDING happens through the separate Claim
// action, not this generic "advance status" control.
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
