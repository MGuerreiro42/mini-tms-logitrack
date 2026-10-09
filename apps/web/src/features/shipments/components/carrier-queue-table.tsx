'use client';

import { useState } from 'react';
import { LiveIndicator } from '@/components/common/live-indicator';
import { PaginatedTable } from '@/components/common/paginated-table';
import { QueryState } from '@/components/common/query-state';
import { Button } from '@/components/ui/button';
import { ShipmentStatusPill } from '@/components/ui/status-pill';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClaimShipment } from '../hooks/use-claim-shipment';
import { useShipmentQueue } from '../hooks/use-shipment-queue';
import { useShipmentTracking } from '../hooks/use-shipment-tracking';
import {
  type CarrierShipment,
  isClaimable,
  type ShipmentStatus,
} from '../types';

const FILTERS: { label: string; value: ShipmentStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Accepted', value: 'ACCEPTED' },
  { label: 'In transit', value: 'IN_TRANSIT' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export function CarrierQueueTable() {
  const [status, setStatus] = useState<ShipmentStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);

  const query = useShipmentQueue({
    status: status === 'ALL' ? undefined : status,
    page,
    limit: 20,
  });
  const claim = useClaimShipment();
  useShipmentTracking({ subscribeToQueue: true });

  return (
    <div className="space-y-4">
      <LiveIndicator />
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
      <QueryState query={query} errorMessage="Couldn't load the queue.">
        {(result) => (
          <PaginatedTable<CarrierShipment>
            data={result.data}
            meta={result.meta}
            onPageChange={setPage}
            getRowKey={(s) => s.id}
            getRowHref={(s) => `/carrier/queue/${s.id}`}
            emptyMessage="No shipments in the queue."
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
              { header: 'Seller', cell: (s) => s.sellerCompanyName },
              {
                header: 'Destination',
                cell: (s) => `${s.addressCity}/${s.addressState}`,
              },
              {
                header: 'Owner',
                cell: (s) => s.ownerEmail ?? 'Unclaimed',
                className: 'text-muted-foreground',
              },
              {
                header: '',
                className: 'text-right',
                cell: (s) =>
                  isClaimable(s) ? (
                    // No confirm dialog: claiming is meant to be fast.
                    <Button
                      size="sm"
                      className="relative z-10"
                      onClick={() => claim.mutate(s.id)}
                      disabled={claim.isPending}
                    >
                      Claim
                    </Button>
                  ) : null,
              },
            ]}
          />
        )}
      </QueryState>
    </div>
  );
}
