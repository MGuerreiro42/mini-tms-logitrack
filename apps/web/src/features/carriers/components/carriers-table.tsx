'use client';

import { useState } from 'react';
import { PaginatedTable } from '@/components/common/paginated-table';
import { ApprovalStatusPill } from '@/components/ui/status-pill';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ApprovalStatus } from '@/lib/status-colors';
import { useCarriersList } from '../hooks/use-carriers-list';
import type { Carrier } from '../types';

const FILTERS: { label: string; value: ApprovalStatus | 'ALL' }[] = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'All', value: 'ALL' },
];

export function CarriersTable() {
  const [status, setStatus] = useState<ApprovalStatus | 'ALL'>('PENDING');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useCarriersList({
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
        <PaginatedTable<Carrier>
          data={data.data}
          meta={data.meta}
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
    </div>
  );
}
