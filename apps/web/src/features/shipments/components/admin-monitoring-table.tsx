'use client';

import {
  type FilterChoice,
  FilterMenu,
  FilterToolbar,
} from '@/components/common/filter-toolbar';
import {
  LiveIndicator,
  OfflineBanner,
} from '@/components/common/live-indicator';
import { PageHeader } from '@/components/common/page-header';
import { PaginatedTable } from '@/components/common/paginated-table';
import { QuerySkeleton, QueryState } from '@/components/common/query-state';
import {
  type StatusFilter,
  statusFilterOptions,
  statusFilterValues,
} from '@/components/common/status-filter-tabs';
import { useFilteredPagination } from '@/hooks/use-filtered-pagination';
import { useNow } from '@/hooks/use-now';
import { useRecentCount } from '@/hooks/use-recent-count';
import { ALL } from '@/lib/filters';
import { plural } from '@/lib/plural';
import { SHIPMENT_STATUS, SHIPMENT_STATUSES } from '@/lib/status-colors';
import type { ShipmentStatus } from '@/types/status';
import {
  useAdminShipmentStatusCounts,
  useAdminShipments,
} from '../hooks/use-admin-shipments';
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

const STATUS_VALUES = statusFilterValues(
  statusFilterOptions(SHIPMENT_STATUS, SHIPMENT_STATUSES),
);

const SLA_REFRESH_MS = 60_000;
const UPDATES_WINDOW_MS = 60_000;

function withAny(options: FilterChoice<string>[]): FilterChoice<string>[] {
  return [{ value: ALL, label: 'Any' }, ...options];
}

interface AdminMonitoringTableProps {
  carrierOptions: FilterChoice<string>[];
  sellerOptions: FilterChoice<string>[];
}

export function AdminMonitoringTable({
  carrierOptions,
  sellerOptions,
}: AdminMonitoringTableProps) {
  const carrierChoices = withAny(carrierOptions);
  const sellerChoices = withAny(sellerOptions);
  const { filters, isFiltered, setFilter, clearFilters, setPage, params } =
    useFilteredPagination(
      {
        status: ALL as StatusFilter<ShipmentStatus>,
        carrierId: ALL as string,
        sellerId: ALL as string,
      },
      {
        status: STATUS_VALUES,
        carrierId: carrierChoices.map((choice) => choice.value),
        sellerId: sellerChoices.map((choice) => choice.value),
      },
    );

  const updates = useRecentCount(UPDATES_WINDOW_MS);
  const liveStatus = useShipmentTracking({
    subscribeToMonitoring: true,
    onEvent: updates.record,
  });
  const query = useAdminShipments(params, liveStatus);
  const counts = useAdminShipmentStatusCounts(
    { carrierId: params.carrierId, sellerId: params.sellerId },
    liveStatus,
  );
  const now = useNow(SLA_REFRESH_MS);
  const total = query.data?.meta.total;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Monitoring"
        description="Every shipment on the platform, updated live."
        action={
          <LiveIndicator
            status={liveStatus}
            detail={
              updates.count > 0
                ? `${plural(updates.count, 'update')} in the last minute`
                : undefined
            }
            className="h-8.5 rounded-lg bg-card px-3 text-foreground shadow-xs"
          />
        }
      />
      <OfflineBanner status={liveStatus} />
      <FilterToolbar
        onClear={isFiltered ? clearFilters : undefined}
        summary={total !== undefined && plural(total, 'shipment')}
      >
        <FilterMenu
          label="Status"
          value={filters.status}
          options={statusFilterOptions(SHIPMENT_STATUS, SHIPMENT_STATUSES, {
            counts: counts.data,
          })}
          onChange={(value) => setFilter('status', value)}
        />
        <FilterMenu
          label="Carrier"
          value={filters.carrierId}
          options={carrierChoices}
          onChange={(value) => setFilter('carrierId', value)}
        />
        <FilterMenu
          label="Seller"
          value={filters.sellerId}
          options={sellerChoices}
          onChange={(value) => setFilter('sellerId', value)}
        />
      </FilterToolbar>

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
            emptyMessage={
              isFiltered
                ? 'No shipments match these filters.'
                : 'No shipments on the platform yet.'
            }
            columns={[
              shipmentColumns.trackingCode,
              partyColumns.seller,
              {
                header: 'Carrier',
                card: 'meta',
                className: 'text-muted-foreground',
                cell: (s) => s.carrierCompanyName,
              },
              shipmentColumns.destination,
              shipmentColumns.status,
              partyColumns.owner,
              slaColumn,
              shipmentColumns.created,
            ]}
          />
        )}
      </QueryState>
    </div>
  );
}
