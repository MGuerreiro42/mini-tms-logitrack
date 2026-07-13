'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PaginatedTable } from '@/components/common/paginated-table';
import { Button } from '@/components/ui/button';
import { ShipmentStatusPill } from '@/components/ui/status-pill';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useShipmentsList } from '../hooks/use-shipments-list';
import type { Shipment, ShipmentStatus } from '../types';

const FILTERS: { label: string; value: ShipmentStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'In transit', value: 'IN_TRANSIT' },
  { label: 'Delivered', value: 'DELIVERED' },
];

export function ShipmentsTable() {
  const [status, setStatus] = useState<ShipmentStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useShipmentsList({
    status: status === 'ALL' ? undefined : status,
    page,
    limit: 20,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Tabs
          value={status}
          onValueChange={(value) => {
            setStatus(value as ShipmentStatus | 'ALL');
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
        <Button asChild>
          <Link href="/seller/shipments/new">+ Create shipment</Link>
        </Button>
      </div>
      {isLoading || !data ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : (
        <PaginatedTable<Shipment>
          data={data.data}
          meta={data.meta}
          onPageChange={setPage}
          getRowKey={(shipment) => shipment.id}
          getRowHref={(shipment) => `/seller/shipments/${shipment.id}`}
          emptyMessage="No shipments yet — create your first one."
          columns={[
            {
              header: 'Tracking code',
              cell: (s) => (
                <span className="font-mono text-xs">{s.trackingCode}</span>
              ),
            },
            {
              header: 'Status',
              cell: (s) => <ShipmentStatusPill status={s.status} />,
            },
            {
              header: 'Destination',
              cell: (s) => `${s.addressCity}/${s.addressState}`,
            },
            {
              header: 'Carrier',
              cell: (s) => s.carrierName,
              className: 'text-muted-foreground',
            },
            { header: 'Modality', cell: (s) => s.modalityName },
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
