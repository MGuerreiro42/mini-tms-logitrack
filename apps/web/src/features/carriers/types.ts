import type { ShipmentStatusCounts } from '@/features/shipments/types';
import type { ApprovalStatus } from '@/lib/status-colors';
import type { PaginationQuery } from '@/types/pagination';

export type ApprovalStatusCounts = Record<ApprovalStatus, number>;

export interface Carrier {
  id: string;
  email: string;
  companyName: string;
  document: string;
  status: ApprovalStatus;
  userCount: number;
  createdAt: string;
}

export interface CarrierSignupInput {
  email: string;
  password: string;
  companyName: string;
  document: string;
}

export interface ListCarriersQuery extends PaginationQuery {
  status?: ApprovalStatus;
}

export interface CoverageArea {
  id: string;
  state: string;
  city: string | null;
}

export interface CoverageAreaInput {
  state: string;
  city?: string;
}

export interface CarrierPerformance {
  shipmentCountsByStatus: ShipmentStatusCounts;
  totalShipments: number;
  avgHoursBetweenEvents: number | null;
  failedDeliveryRate: number;
  returnedRate: number;
}
