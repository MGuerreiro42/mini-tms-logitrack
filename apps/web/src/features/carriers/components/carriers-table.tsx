'use client';

import { PaginatedTable } from '@/components/common/paginated-table';
import { QueryState } from '@/components/common/query-state';
import {
  type StatusFilter,
  StatusFilterTabs,
  statusFilterOptions,
} from '@/components/common/status-filter-tabs';
import { ApprovalStatusPill } from '@/components/ui/status-pill';
import { useFilteredPagination } from '@/hooks/use-filtered-pagination';
import { APPROVAL_STATUS, type ApprovalStatus } from '@/lib/status-colors';
import { useCarriersList } from '../hooks/use-carriers-list';
import type { Carrier } from '../types';

const STATUS_OPTIONS = statusFilterOptions(
  APPROVAL_STATUS,
  ['PENDING', 'APPROVED', 'REJECTED'],
  'last',
);

export function CarriersTable() {
  const { filters, setFilter, setPage, params } = useFilteredPagination({
    status: 'PENDING' as StatusFilter<ApprovalStatus>,
  });

  const query = useCarriersList(params);

  return (
    <div className="space-y-4">
      <StatusFilterTabs
        options={STATUS_OPTIONS}
        value={filters.status}
        onChange={(value) => setFilter('status', value)}
      />
      <QueryState query={query} errorMessage="Couldn't load carriers.">
        {(result) => (
          <PaginatedTable<Carrier>
            data={result.data}
            meta={result.meta}
            onPageChange={setPage}
            getRowKey={(carrier) => carrier.id}
            getRowHref={(carrier) => `/admin/carriers/${carrier.id}`}
            emptyMessage="No carriers match this filter."
            columns={[
              {
                header: 'Company',
                cell: (c) => (
                  <span className="font-semibold">{c.companyName}</span>
                ),
              },
              {
                header: 'Document',
                cell: (c) => (
                  <span className="font-mono text-xs">{c.document}</span>
                ),
              },
              {
                header: 'Users',
                className: 'text-center',
                cell: (c) => c.userCount,
              },
              {
                header: 'Status',
                cell: (c) => <ApprovalStatusPill status={c.status} />,
              },
              {
                header: 'Created',
                className: 'text-right text-muted-foreground',
                cell: (c) => new Date(c.createdAt).toLocaleDateString(),
              },
            ]}
          />
        )}
      </QueryState>
    </div>
  );
}
