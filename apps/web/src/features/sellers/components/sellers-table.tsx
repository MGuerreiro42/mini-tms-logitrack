'use client';

import type { StatusFilter } from '@/components/common/status-filter-tabs';
import {
  APPROVAL_FILTER_VALUES,
  CompanyApprovalTable,
} from '@/features/companies/components/company-approval-table';
import { useFilteredPagination } from '@/hooks/use-filtered-pagination';
import type { ApprovalStatus } from '@/types/status';
import { useSellerStatusCounts } from '../hooks/use-seller-status-counts';
import { useSellersList } from '../hooks/use-sellers-list';
import type { Seller } from '../types';

export function SellersTable() {
  const { filters, isFiltered, setFilter, clearFilters, setPage, params } =
    useFilteredPagination(
      { status: 'PENDING' as StatusFilter<ApprovalStatus> },
      { status: APPROVAL_FILTER_VALUES },
    );

  return (
    <CompanyApprovalTable<Seller>
      query={useSellersList(params)}
      counts={useSellerStatusCounts().data}
      status={filters.status}
      onStatusChange={(status) => setFilter('status', status)}
      onClear={isFiltered ? clearFilters : undefined}
      onPageChange={setPage}
      hrefFor={(seller) => `/admin/sellers/${seller.id}`}
      noun="seller"
    />
  );
}
