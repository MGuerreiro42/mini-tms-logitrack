'use client';

import {
  LiveIndicator,
  OfflineBanner,
} from '@/components/common/live-indicator';
import { PaginatedTable } from '@/components/common/paginated-table';
import { QuerySkeleton, QueryState } from '@/components/common/query-state';
import {
  type StatusFilter,
  StatusFilterTabs,
  statusFilterOptions,
  statusFilterValues,
} from '@/components/common/status-filter-tabs';
import { Button } from '@/components/ui/button';
import { useFilteredPagination } from '@/hooks/use-filtered-pagination';
import { ALL } from '@/lib/filters';
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
const STATUS_VALUES = statusFilterValues(STATUS_OPTIONS);

export function CarrierQueueTable() {
  const { filters, setFilter, setPage, params } = useFilteredPagination(
    { status: ALL as StatusFilter<ShipmentStatus> },
    { status: STATUS_VALUES },
  );

  const liveStatus = useShipmentTracking({ subscribeToQueue: true });
  const query = useShipmentQueue(params, liveStatus);
  const claim = useClaimShipment();

  return (
    <div className="space-y-4">
      <LiveIndicator status={liveStatus} />
      <OfflineBanner status={liveStatus} />
      <StatusFilterTabs
        options={STATUS_OPTIONS}
        value={filters.status}
        onChange={(value) => setFilter('status', value)}
      />
      <QueryState
        skeleton={<QuerySkeleton variant="table" />}
        query={query}
        errorMessage="Couldn't load the queue."
      >
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
                id: 'actions',
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
