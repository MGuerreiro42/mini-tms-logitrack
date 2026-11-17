import type {
  ClaimMetric,
  ListStats,
  OnTimeTrend,
  Rate,
  StageDuration,
} from '@/lib/metrics';
import type { PaginationQuery } from '@/types/pagination';
import type { ApprovalStatus, ApprovalStatusCounts } from '@/types/status';

export type { ApprovalStatusCounts };

export interface Carrier {
  id: string;
  // Null for a carrier whose manager account is gone.
  email: string | null;
  companyName: string;
  document: string;
  status: ApprovalStatus;
  userCount: number;
  createdAt: string;
  stats?: ListStats & { failed: { rate: number | null; n: number } };
}

export interface CarrierSignupInput {
  email: string;
  password: string;
  companyName: string;
  document: string;
}

export interface ListCarriersQuery extends PaginationQuery {
  status?: ApprovalStatus;
  include?: 'stats';
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
  totalShipments: number;
  onTime: OnTimeTrend;
  medianDelivery: { hours: number | null; n: number };
  firstAttempt: {
    rate: number | null;
    n: number;
    failed: number;
    returned: number;
  };
  claim: ClaimMetric;
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
