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
import { useSellersList } from '../hooks/use-sellers-list';
import type { Seller } from '../types';

const STATUS_OPTIONS = statusFilterOptions(
  APPROVAL_STATUS,
  ['PENDING', 'APPROVED', 'REJECTED'],
  'last',
);

export function SellersTable() {
  // PENDING is the default/recurring view — mirrors the admin's most common action.
  const { filters, setFilter, setPage, params } = useFilteredPagination({
    status: 'PENDING' as StatusFilter<ApprovalStatus>,
  });

  const query = useSellersList(params);

  return (
    <div className="space-y-4">
      <StatusFilterTabs
        options={STATUS_OPTIONS}
        value={filters.status}
        onChange={(value) => setFilter('status', value)}
      />
      <QueryState query={query} errorMessage="Couldn't load sellers.">
        {(result) => (
          <PaginatedTable<Seller>
            data={result.data}
            meta={result.meta}
            onPageChange={setPage}
            getRowKey={(seller) => seller.id}
            getRowHref={(seller) => `/admin/sellers/${seller.id}`}
            emptyMessage="No sellers match this filter."
            columns={[
              {
                header: 'Company',
                cell: (s) => (
                  <span className="font-semibold">{s.companyName}</span>
                ),
              },
              {
                header: 'Document',
                cell: (s) => (
                  <span className="font-mono text-xs">{s.document}</span>
                ),
              },
              {
                header: 'Status',
                cell: (s) => <ApprovalStatusPill status={s.status} />,
              },
              {
                header: 'Created',
                className: 'text-right text-muted-foreground',
                cell: (s) => new Date(s.createdAt).toLocaleDateString(),
              },
            ]}
          />
        )}
      </QueryState>
    </div>
  );
}
