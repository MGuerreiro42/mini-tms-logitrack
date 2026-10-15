'use client';

import { FilterMenu, FilterToolbar } from '@/components/common/filter-toolbar';
import { PaginatedTable } from '@/components/common/paginated-table';
import { QuerySkeleton, QueryState } from '@/components/common/query-state';
import {
  type StatusFilter,
  statusFilterOptions,
  statusFilterValues,
} from '@/components/common/status-filter-tabs';
import { useFilteredPagination } from '@/hooks/use-filtered-pagination';
import { useNow } from '@/hooks/use-now';
import { ALL } from '@/lib/filters';
import { ROUTES } from '@/lib/routes';
import { SHIPMENT_STATUS, SHIPMENT_STATUSES } from '@/lib/status-colors';
import { useShipmentStatusCounts } from '../hooks/use-shipment-status-counts';
import { useShipmentsList } from '../hooks/use-shipments-list';
import type { Shipment, ShipmentStatus } from '../types';
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

export function ShipmentsTable() {
  const { filters, isFiltered, setFilter, clearFilters, setPage, params } =
    useFilteredPagination(
      { status: ALL as StatusFilter<ShipmentStatus> },
      { status: STATUS_VALUES },
    );

  const query = useShipmentsList(params);
  const counts = useShipmentStatusCounts();
  const now = useNow(SLA_REFRESH_MS);
  const total = query.data?.meta.total;

  return (
    <div className="space-y-4">
      <FilterToolbar
        onClear={isFiltered ? clearFilters : undefined}
        summary={
          total !== undefined && `${total} shipment${total === 1 ? '' : 's'}`
        }
      >
        <FilterMenu
          label="Status"
          value={filters.status}
          options={statusFilterOptions(SHIPMENT_STATUS, SHIPMENT_STATUSES, {
            counts: counts.data,
          })}
          onChange={(value) => setFilter('status', value)}
        />
      </FilterToolbar>
      <QueryState
        skeleton={<QuerySkeleton variant="table" />}
        query={query}
        errorMessage="Couldn't load shipments."
      >
        {(result) => (
          <PaginatedTable<WithSla<Shipment>>
            data={withSla(result.data, now)}
            meta={result.meta}
            onPageChange={setPage}
            getRowClassName={lateRowClassName}
            getRowKey={(shipment) => shipment.id}
            getRowHref={(shipment) => ROUTES.sellerShipment(shipment.id)}
            emptyMessage={
              isFiltered
                ? 'No shipments match these filters.'
                : 'No shipments yet. Create your first one.'
            }
            columns={[
              shipmentColumns.trackingCode,
              shipmentColumns.destination,
              partyColumns.carrier,
              partyColumns.modality,
              shipmentColumns.status,
              slaColumn,
              shipmentColumns.created,
            ]}
          />
        )}
      </QueryState>
    </div>
  );
}
