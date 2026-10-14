'use client';

import {
  type FilterChoice,
  FilterMenu,
  FilterToolbar,
} from '@/components/common/filter-toolbar';
import { PaginatedTable } from '@/components/common/paginated-table';
import { QuerySkeleton, QueryState } from '@/components/common/query-state';
import type { StatusFilter } from '@/components/common/status-filter-tabs';
import { useFilteredPagination } from '@/hooks/use-filtered-pagination';
import { useNow } from '@/hooks/use-now';
import { ALL } from '@/lib/filters';
import { SHIPMENT_STATUS, SHIPMENT_STATUSES } from '@/lib/status-colors';
import { sumRecord } from '@/lib/sum-record';
import { useShipmentStatusCounts } from '../hooks/use-shipment-status-counts';
import { useShipmentsList } from '../hooks/use-shipments-list';
import type { Shipment, ShipmentStatus, ShipmentStatusCounts } from '../types';
import {
  lateRowClassName,
  shipmentColumns,
  slaColumn,
  type WithSla,
  withSla,
} from './shipment-columns';

const STATUS_VALUES: StatusFilter<ShipmentStatus>[] = [
  ALL,
  ...SHIPMENT_STATUSES,
];

const SLA_REFRESH_MS = 60_000;

function statusChoices(
  counts: ShipmentStatusCounts | undefined,
): FilterChoice<StatusFilter<ShipmentStatus>>[] {
  return [
    { value: ALL, label: 'All', count: counts && sumRecord(counts) },
    ...SHIPMENT_STATUSES.map((status) => ({
      value: status,
      label: SHIPMENT_STATUS[status].label,
      count: counts?.[status],
    })),
  ];
}

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
          options={statusChoices(counts.data)}
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
            getRowHref={(shipment) => `/seller/shipments/${shipment.id}`}
            emptyMessage={
              isFiltered
                ? 'No shipments match these filters.'
                : 'No shipments yet. Create your first one.'
            }
            columns={[
              shipmentColumns.trackingCode,
              shipmentColumns.destination,
              {
                header: 'Carrier',
                cell: (s) => s.carrierName,
                className: 'text-muted-foreground',
              },
              {
                header: 'Modality',
                cell: (s) => s.modalityName,
                className: 'text-muted-foreground',
              },
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
