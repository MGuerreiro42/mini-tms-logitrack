'use client';

import { PaginatedTable } from '@/components/common/paginated-table';
import { QuerySkeleton, QueryState } from '@/components/common/query-state';
import {
  type StatusFilter,
  StatusFilterTabs,
  statusFilterOptions,
  statusFilterValues,
} from '@/components/common/status-filter-tabs';
import { useFilteredPagination } from '@/hooks/use-filtered-pagination';
import { ALL } from '@/lib/filters';
import { SHIPMENT_STATUS } from '@/lib/status-colors';
import { useShipmentsList } from '../hooks/use-shipments-list';
import type { Shipment, ShipmentStatus } from '../types';
import { lateRowClassName, shipmentColumns } from './shipment-columns';

const STATUS_OPTIONS = statusFilterOptions(SHIPMENT_STATUS, [
  'PENDING',
  'IN_TRANSIT',
  'DELIVERED',
  'CANCELLED',
]);
const STATUS_VALUES = statusFilterValues(STATUS_OPTIONS);

export function ShipmentsTable() {
  const { filters, setFilter, setPage, params } = useFilteredPagination(
    { status: ALL as StatusFilter<ShipmentStatus> },
    { status: STATUS_VALUES },
  );

  const query = useShipmentsList(params);

  return (
    <div className="space-y-4">
      <StatusFilterTabs
        options={STATUS_OPTIONS}
        value={filters.status}
        onChange={(value) => setFilter('status', value)}
      />
      <QueryState
        skeleton={<QuerySkeleton variant="table" />}
        query={query}
        errorMessage="Couldn't load shipments."
      >
        {(result) => (
          <PaginatedTable<Shipment>
            data={result.data}
            meta={result.meta}
            onPageChange={setPage}
            getRowClassName={lateRowClassName}
            getRowKey={(shipment) => shipment.id}
            getRowHref={(shipment) => `/seller/shipments/${shipment.id}`}
            emptyMessage="No shipments yet — create your first one."
            columns={[
              shipmentColumns.trackingCode,
              shipmentColumns.status,
              shipmentColumns.destination,
              shipmentColumns.sla,
              {
                header: 'Carrier',
                cell: (s) => s.carrierName,
                className: 'text-muted-foreground',
              },
              { header: 'Modality', cell: (s) => s.modalityName },
              shipmentColumns.created,
            ]}
          />
        )}
      </QueryState>
    </div>
  );
}
