'use client';

import { useState } from 'react';
import { PaginatedTable } from '@/components/common/paginated-table';
import { ApprovalStatusPill } from '@/components/ui/status-pill';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ApprovalStatus } from '@/lib/status-colors';
import { useSellersList } from '../hooks/use-sellers-list';
import type { Seller } from '../types';

const FILTERS: { label: string; value: ApprovalStatus | 'ALL' }[] = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'All', value: 'ALL' },
];

export function SellersTable() {
  // PENDING is the default/recurring view — mirrors the admin's most common action.
  const [status, setStatus] = useState<ApprovalStatus | 'ALL'>('PENDING');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useSellersList({
    status: status === 'ALL' ? undefined : status,
    page,
    limit: 20,
  });

  return (
    <div className="space-y-4">
      <Tabs
        value={status}
        onValueChange={(value) => {
          setStatus(value as ApprovalStatus | 'ALL');
          setPage(1);
        }}
      >
        <TabsList>
          {FILTERS.map((filter) => (
            <TabsTrigger key={filter.value} value={filter.value}>
              {filter.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {isLoading || !data ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : (
        <PaginatedTable<Seller>
          data={data.data}
          meta={data.meta}
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
    </div>
  );
}
