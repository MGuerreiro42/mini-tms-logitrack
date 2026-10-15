import type { PaginationQuery } from '@/types/pagination';
import type {
  ApprovalStatus,
  ApprovalStatusCounts,
  ShipmentStatus,
  ShipmentStatusCounts,
} from '@/types/status';

export type { ApprovalStatusCounts };

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

export interface StageDuration {
  fromStatus: ShipmentStatus;
  toStatus: ShipmentStatus;
  avgHours: number | null;
  sampleCount: number;
}

export interface CarrierPerformance {
  shipmentCountsByStatus: ShipmentStatusCounts;
  totalShipments: number;
  avgHoursBetweenEvents: number | null;
  failedDeliveryRate: number;
  returnedRate: number;
  stageDurations: StageDuration[];
}

export interface OperatorRankingItem {
  carrierUserId: string;
  email: string;
  totalOwned: number;
  delivered: number;
}
