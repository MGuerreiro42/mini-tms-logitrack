'use client';

import {
  type FilterOption,
  FilterSelect,
  filterValues,
} from '@/components/common/filter-select';
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
import { useFilteredPagination } from '@/hooks/use-filtered-pagination';
import { useNow } from '@/hooks/use-now';
import { ALL } from '@/lib/filters';
import { SHIPMENT_STATUS, SHIPMENT_STATUSES } from '@/lib/status-colors';
import type { ShipmentStatus } from '@/types/status';
import { useAdminShipments } from '../hooks/use-admin-shipments';
import { useShipmentTracking } from '../hooks/use-shipment-tracking';
import type { AdminShipment } from '../types';
import {
  lateRowClassName,
  partyColumns,
  shipmentColumns,
  slaColumn,
  type WithSla,
  withSla,
} from './shipment-columns';

const STATUS_OPTIONS = statusFilterOptions(SHIPMENT_STATUS, SHIPMENT_STATUSES);
const STATUS_VALUES = statusFilterValues(STATUS_OPTIONS);

interface AdminMonitoringTableProps {
  carrierOptions: FilterOption[];
  sellerOptions: FilterOption[];
}

const SLA_REFRESH_MS = 60_000;

export function AdminMonitoringTable({
  carrierOptions,
  sellerOptions,
}: AdminMonitoringTableProps) {
  const { filters, setFilter, setPage, params } = useFilteredPagination(
    {
      status: ALL as StatusFilter<ShipmentStatus>,
      carrierId: ALL as string,
      sellerId: ALL as string,
    },
    {
      status: STATUS_VALUES,
      carrierId: filterValues(carrierOptions),
      sellerId: filterValues(sellerOptions),
    },
  );

  const liveStatus = useShipmentTracking({ subscribeToMonitoring: true });
  const query = useAdminShipments(params, liveStatus);
  const now = useNow(SLA_REFRESH_MS);

  return (
    <div className="space-y-4">
      <LiveIndicator status={liveStatus} />
      <OfflineBanner status={liveStatus} />
      <StatusFilterTabs
        options={STATUS_OPTIONS}
        value={filters.status}
        onChange={(value) => setFilter('status', value)}
        wrap
      />

      <div className="flex gap-3">
        <FilterSelect
          placeholder="Carrier"
          allLabel="All carriers"
          options={carrierOptions}
          value={filters.carrierId}
          onChange={(value) => setFilter('carrierId', value)}
        />
        <FilterSelect
          placeholder="Seller"
          allLabel="All sellers"
          options={sellerOptions}
          value={filters.sellerId}
          onChange={(value) => setFilter('sellerId', value)}
        />
      </div>

      <QueryState
        skeleton={<QuerySkeleton variant="table" />}
        query={query}
        errorMessage="Couldn't load shipments."
      >
        {(result) => (
          <PaginatedTable<WithSla<AdminShipment>>
            data={withSla(result.data, now)}
            meta={result.meta}
            onPageChange={setPage}
            getRowClassName={lateRowClassName}
            getRowKey={(s) => s.id}
            emptyMessage="No shipments match this filter."
            columns={[
              shipmentColumns.trackingCode,
              shipmentColumns.status,
              shipmentColumns.destination,
              slaColumn,
              partyColumns.seller,
              {
                header: 'Carrier',
                card: 'meta',
                cell: (s) => s.carrierCompanyName,
              },
              shipmentColumns.created,
            ]}
          />
        )}
      </QueryState>
    </div>
  );
}
