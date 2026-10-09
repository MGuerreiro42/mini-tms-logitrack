'use client';

import { CompanyApprovalTable } from '@/components/common/company-approval-table';
import type { StatusFilter } from '@/components/common/status-filter-tabs';
import { useFilteredPagination } from '@/hooks/use-filtered-pagination';
import type { ApprovalStatus } from '@/types/status';
import { useCarriersList } from '../hooks/use-carriers-list';
import type { Carrier } from '../types';

export function CarriersTable() {
  const { filters, setFilter, setPage, params } = useFilteredPagination({
    status: 'PENDING' as StatusFilter<ApprovalStatus>,
  });

  return (
    <CompanyApprovalTable<Carrier>
      query={useCarriersList(params)}
      status={filters.status}
      onStatusChange={(status) => setFilter('status', status)}
      onPageChange={setPage}
      hrefFor={(carrier) => `/admin/carriers/${carrier.id}`}
      noun="carriers"
      extraColumns={[
        { header: 'Users', className: 'text-center', cell: (c) => c.userCount },
      ]}
    />
  );
}
