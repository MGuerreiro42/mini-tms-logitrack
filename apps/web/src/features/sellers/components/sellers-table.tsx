'use client';

import { CompanyApprovalTable } from '@/components/common/company-approval-table';
import type { StatusFilter } from '@/components/common/status-filter-tabs';
import { useFilteredPagination } from '@/hooks/use-filtered-pagination';
import type { ApprovalStatus } from '@/types/status';
import { useSellersList } from '../hooks/use-sellers-list';
import type { Seller } from '../types';

export function SellersTable() {
  // Pending first: reviewing applications is the admin's recurring task.
  const { filters, setFilter, setPage, params } = useFilteredPagination({
    status: 'PENDING' as StatusFilter<ApprovalStatus>,
  });

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
