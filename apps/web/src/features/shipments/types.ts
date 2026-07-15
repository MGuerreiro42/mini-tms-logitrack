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
