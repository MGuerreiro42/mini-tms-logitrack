'use client';

import type { StatusFilter } from '@/components/common/status-filter-tabs';
import {
  APPROVAL_FILTER_VALUES,
  CompanyApprovalTable,
} from '@/features/companies/components/company-approval-table';
import { useFilteredPagination } from '@/hooks/use-filtered-pagination';
import type { ApprovalStatus } from '@/types/status';
import { useSellersList } from '../hooks/use-sellers-list';
import type { Seller } from '../types';

export function SellersTable() {
  const { filters, setFilter, setPage, params } = useFilteredPagination(
    { status: 'PENDING' as StatusFilter<ApprovalStatus> },
    { status: APPROVAL_FILTER_VALUES },
  );

  return (
    <CompanyApprovalTable<Seller>
      query={useSellersList(params)}
      status={filters.status}
      onStatusChange={(status) => setFilter('status', status)}
      onPageChange={setPage}
      hrefFor={(seller) => `/admin/sellers/${seller.id}`}
      noun="sellers"
    />
  );
}
