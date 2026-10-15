'use client';

import { FilterMenu, FilterToolbar } from '@/components/common/filter-toolbar';
import {
  type Column,
  PaginatedTable,
} from '@/components/common/paginated-table';
import { QuerySkeleton, QueryState } from '@/components/common/query-state';
import {
  type StatusFilter,
  statusFilterOptions,
  statusFilterValues,
} from '@/components/common/status-filter-tabs';
import { ApprovalStatusBadge } from '@/components/ui/status-badge';
import { formatDate } from '@/lib/format-date';
import { plural } from '@/lib/plural';
import { APPROVAL_STATUS } from '@/lib/status-colors';
import type { Paginated } from '@/types/pagination';
import type { QuerySource } from '@/types/query';
import type { ApprovalStatus, ApprovalStatusCounts } from '@/types/status';

interface CompanyRow {
  id: string;
  companyName: string;
  document: string;
  status: ApprovalStatus;
  createdAt: string;
}

const STATUSES: ApprovalStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

function statusOptions(counts?: ApprovalStatusCounts) {
  return statusFilterOptions(APPROVAL_STATUS, STATUSES, {
    counts,
    allPosition: 'last',
  });
}

export const APPROVAL_FILTER_VALUES = statusFilterValues(statusOptions());

interface CompanyApprovalTableProps<T extends CompanyRow> {
  query: QuerySource<Paginated<T>>;
  counts?: ApprovalStatusCounts;
  status: StatusFilter<ApprovalStatus>;
  onStatusChange: (status: StatusFilter<ApprovalStatus>) => void;
  onClear?: () => void;
  onPageChange: (page: number) => void;
  hrefFor: (row: T) => string;
  noun: string;
  extraColumns?: Column<T>[];
}

export function CompanyApprovalTable<T extends CompanyRow>({
  query,
  counts,
  status,
  onStatusChange,
  onClear,
  onPageChange,
  hrefFor,
  noun,
  extraColumns = [],
}: CompanyApprovalTableProps<T>) {
  const total = query.data?.meta.total;
  const columns: Column<T>[] = [
    {
      header: 'Company',
      card: 'title',
      cell: (c) => <span className="font-semibold">{c.companyName}</span>,
    },
    {
      header: 'Tax ID',
      card: 'meta',
      cell: (c) => <span className="font-mono text-[13px]">{c.document}</span>,
    },
    ...extraColumns,
    {
      header: 'Status',
      card: 'badge',
      cell: (c) => <ApprovalStatusBadge status={c.status} />,
    },
    {
      header: 'Signed up',
      card: 'meta',
      className: 'text-right text-muted-foreground',
      cell: (c) => formatDate(c.createdAt),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <FilterToolbar
        onClear={onClear}
        summary={total !== undefined && plural(total, noun)}
      >
        <FilterMenu
          label="Status"
          value={status}
          defaultValue="PENDING"
          options={statusOptions(counts)}
          onChange={onStatusChange}
        />
      </FilterToolbar>
      <QueryState
        skeleton={<QuerySkeleton variant="table" />}
        query={query}
        errorMessage={`Couldn't load ${noun}s.`}
      >
        {(result) => (
          <PaginatedTable<T>
            data={result.data}
            meta={result.meta}
            onPageChange={onPageChange}
            getRowKey={(row) => row.id}
            getRowHref={hrefFor}
            emptyMessage={`No ${noun}s match this filter.`}
            columns={columns}
          />
        )}
      </QueryState>
    </div>
  );
}
