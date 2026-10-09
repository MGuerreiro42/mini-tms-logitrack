import type { PaginationQuery } from '@/types/pagination';
import type { ApprovalStatus, ApprovalStatusCounts } from '@/types/status';

export type { ApprovalStatusCounts };

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
