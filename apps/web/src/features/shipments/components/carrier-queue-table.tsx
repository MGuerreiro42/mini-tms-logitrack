'use client';

import { LiveIndicator } from '@/components/common/live-indicator';
import { PaginatedTable } from '@/components/common/paginated-table';
import { QueryState } from '@/components/common/query-state';
import {
  type StatusFilter,
  StatusFilterTabs,
  statusFilterOptions,
} from '@/components/common/status-filter-tabs';
import { Button } from '@/components/ui/button';
import { useFilteredPagination } from '@/hooks/use-filtered-pagination';
import { SHIPMENT_STATUS } from '@/lib/status-colors';
import { useClaimShipment } from '../hooks/use-claim-shipment';
import { useShipmentQueue } from '../hooks/use-shipment-queue';
import { useShipmentTracking } from '../hooks/use-shipment-tracking';
import {
  type CarrierShipment,
  isClaimable,
  ownerLabel,
  type ShipmentStatus,
} from '../types';
import { shipmentColumns } from './shipment-columns';

const STATUS_OPTIONS = statusFilterOptions(SHIPMENT_STATUS, [
  'PENDING',
  'ACCEPTED',
  'IN_TRANSIT',
  'CANCELLED',
]);

export function CarrierQueueTable() {
  const { filters, setFilter, setPage, params } = useFilteredPagination({
    status: 'ALL' as StatusFilter<ShipmentStatus>,
  });

  const query = useShipmentQueue(params);
  const claim = useClaimShipment();
  useShipmentTracking({ subscribeToQueue: true });

  return (
    <div className="space-y-4">
      <LiveIndicator />
      <StatusFilterTabs
        options={STATUS_OPTIONS}
        value={filters.status}
        onChange={(value) => setFilter('status', value)}
      />
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
              shipmentColumns.trackingCode,
              shipmentColumns.status,
              { header: 'Seller', cell: (s) => s.sellerCompanyName },
              shipmentColumns.destination,
              {
                header: 'Owner',
                cell: ownerLabel,
                className: 'text-muted-foreground',
              },
              {
                header: '',
                className: 'text-right',
                cell: (s) =>
                  isClaimable(s) ? (
                    <Button
                      size="sm"
                      className="relative z-10"
                      onClick={() => claim.mutate(s.id)}
                      disabled={claim.isPending && claim.variables === s.id}
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
