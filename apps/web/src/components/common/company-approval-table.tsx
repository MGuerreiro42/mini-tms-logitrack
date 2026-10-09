'use client';

import {
  type Column,
  PaginatedTable,
} from '@/components/common/paginated-table';
import {
  QueryState,
  type QueryStateSource,
} from '@/components/common/query-state';
import {
  type StatusFilter,
  StatusFilterTabs,
  statusFilterOptions,
} from '@/components/common/status-filter-tabs';
import { ApprovalStatusPill } from '@/components/ui/status-pill';
import { APPROVAL_STATUS, type ApprovalStatus } from '@/lib/status-colors';
import type { Paginated } from '@/types/pagination';

interface CompanyRow {
  id: string;
  companyName: string;
  document: string;
  status: ApprovalStatus;
  createdAt: string;
}

const STATUS_OPTIONS = statusFilterOptions(
  APPROVAL_STATUS,
  ['PENDING', 'APPROVED', 'REJECTED'],
  'last',
);

interface CompanyApprovalTableProps<T extends CompanyRow> {
  query: QueryStateSource<Paginated<T>>;
  status: StatusFilter<ApprovalStatus>;
  onStatusChange: (status: StatusFilter<ApprovalStatus>) => void;
  onPageChange: (page: number) => void;
  hrefFor: (row: T) => string;
  noun: string;
  extraColumns?: Column<T>[];
}

// Admin list of seller or carrier applications.
export function CompanyApprovalTable<T extends CompanyRow>({
  query,
  status,
  onStatusChange,
  onPageChange,
  hrefFor,
  noun,
  extraColumns = [],
}: CompanyApprovalTableProps<T>) {
  const columns: Column<T>[] = [
    {
      header: 'Company',
      cell: (c) => <span className="font-semibold">{c.companyName}</span>,
    },
    {
      header: 'Document',
      cell: (c) => <span className="font-mono text-xs">{c.document}</span>,
    },
    ...extraColumns,
    {
      header: 'Status',
      cell: (c) => <ApprovalStatusPill status={c.status} />,
    },
    {
      header: 'Created',
      className: 'text-right text-muted-foreground',
      cell: (c) => new Date(c.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-4">
      <StatusFilterTabs
        options={STATUS_OPTIONS}
        value={status}
        onChange={onStatusChange}
      />
      <QueryState query={query} errorMessage={`Couldn't load ${noun}.`}>
        {(result) => (
          <PaginatedTable<T>
            data={result.data}
            meta={result.meta}
            onPageChange={onPageChange}
            getRowKey={(row) => row.id}
            getRowHref={hrefFor}
            emptyMessage={`No ${noun} match this filter.`}
            columns={columns}
          />
        )}
      </QueryState>
    </div>
  );
}
