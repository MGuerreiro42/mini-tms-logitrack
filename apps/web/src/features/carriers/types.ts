import type { OnTimeTrend, Rate } from '@/lib/metrics';
import type { PaginationQuery } from '@/types/pagination';
import type {
  ApprovalStatus,
  ApprovalStatusCounts,
  ShipmentStatus,
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

// Medians and p90 are nearest-rank, null without samples (spec 07 FR-022).
export interface StageDuration {
  status: ShipmentStatus;
  p50Hours: number | null;
  p90Hours: number | null;
  budgetHours: number | null;
  n: number;
}

export interface CarrierPerformance {
  totalShipments: number;
  onTime: OnTimeTrend;
  medianDelivery: { hours: number | null; n: number };
  firstAttempt: {
    rate: number | null;
    n: number;
    failed: number;
    returned: number;
  };
  claim: { p50Minutes: number | null; p90Minutes: number | null; n: number };
  stages: StageDuration[];
}

export interface TeamMember {
  carrierUserId: string;
  name: string | null;
  email: string;
  role: 'MANAGER' | 'OPERATOR';
  active: number;
  claimed: number;
  delivered: number;
  onTime: Rate;
}
