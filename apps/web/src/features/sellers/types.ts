import type { ApprovalStatus } from '@/lib/status-colors';
import type { PaginationQuery } from '@/types/pagination';

export type ApprovalStatusCounts = Record<ApprovalStatus, number>;

export interface Seller {
  id: string;
  email: string;
  companyName: string;
  document: string;
  status: ApprovalStatus;
  createdAt: string;
}

export interface SellerSignupInput {
  email: string;
  password: string;
  companyName: string;
  document: string;
}

export interface ListSellersQuery extends PaginationQuery {
  status?: ApprovalStatus;
}
