import type {
  ShipmentStatus,
  ShipmentStatusCounts,
} from '@/features/shipments/types';
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

// One entry per happy-path transition, ending at DELIVERED — the failure
// branch (OUT_FOR_DELIVERY -> FAILED_DELIVERY -> RETURNED) isn't part of
// this "how long does a normal delivery take" funnel.
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

// Operator invites aren't built yet (DESIGN.md § 7) — today a carrier only
// ever has one CarrierUser (the manager), so this is a single-row ranking
// until that feature ships.
export interface OperatorRankingItem {
  carrierUserId: string;
  email: string;
  totalOwned: number;
  delivered: number;
}
