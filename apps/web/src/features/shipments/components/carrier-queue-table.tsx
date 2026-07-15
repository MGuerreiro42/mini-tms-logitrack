'use client';

import { useState } from 'react';
import { PaginatedTable } from '@/components/common/paginated-table';
import { Button } from '@/components/ui/button';
import { ShipmentStatusPill } from '@/components/ui/status-pill';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClaimShipment } from '../hooks/use-claim-shipment';
import { useShipmentQueue } from '../hooks/use-shipment-queue';
import { useShipmentTracking } from '../hooks/use-shipment-tracking';
import type { CarrierShipment, ShipmentStatus } from '../types';

const FILTERS: { label: string; value: ShipmentStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Accepted', value: 'ACCEPTED' },
  { label: 'In transit', value: 'IN_TRANSIT' },
];

export function CarrierQueueTable() {
  const [status, setStatus] = useState<ShipmentStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useShipmentQueue({
    status: status === 'ALL' ? undefined : status,
    page,
    limit: 20,
  });
  const claim = useClaimShipment();
  useShipmentTracking({ subscribeToQueue: true });

  return (
    <div className="space-y-4">
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
      {isLoading || !data ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : (
        <PaginatedTable<CarrierShipment>
          data={data.data}
          meta={data.meta}
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
                s.ownerId ? null : (
                  // A direct button, no confirm dialog — unlike admin
                  // approve/reject (infrequent, higher-consequence), claiming
                  // is meant to be a fast, in-the-flow action for an operator
                  // working through a shared queue (DESIGN.md § 3); a modal
                  // per claim would actively work against that.
                  <Button
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      claim.mutate(s.id);
                    }}
                    disabled={claim.isPending}
                  >
                    Claim
                  </Button>
                ),
            },
          ]}
        />
      )}
    </div>
  );
}
