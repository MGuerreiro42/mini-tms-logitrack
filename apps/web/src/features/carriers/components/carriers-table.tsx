'use client';

import type { StatusFilter } from '@/components/common/status-filter-tabs';
import {
  APPROVAL_FILTER_VALUES,
  CompanyApprovalTable,
} from '@/features/companies/components/company-approval-table';
import { useFilteredPagination } from '@/hooks/use-filtered-pagination';
import { plural } from '@/lib/plural';
import type { ApprovalStatus } from '@/types/status';
import { useCarrierStatusCounts } from '../hooks/use-carrier-status-counts';
import { useCarriersList } from '../hooks/use-carriers-list';
import type { Carrier } from '../types';

export function CarriersTable() {
  const { filters, isFiltered, setFilter, clearFilters, setPage, params } =
    useFilteredPagination(
      { status: 'PENDING' as StatusFilter<ApprovalStatus> },
      { status: APPROVAL_FILTER_VALUES },
    );

  return (
    <CompanyApprovalTable<Carrier>
      query={useCarriersList(params)}
      counts={useCarrierStatusCounts().data}
      status={filters.status}
      onStatusChange={(status) => setFilter('status', status)}
      onClear={isFiltered ? clearFilters : undefined}
      onPageChange={setPage}
      hrefFor={(carrier) => `/admin/carriers/${carrier.id}`}
      noun="carrier"
      extraColumns={[
        {
          header: 'Users',
          card: 'meta',
          className: 'text-muted-foreground',
          cell: (c) => plural(c.userCount, 'user'),
        },
      ]}
    />
  );
}
