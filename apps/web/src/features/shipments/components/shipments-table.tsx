'use client';

import Link from 'next/link';
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
import { useShipmentsList } from '../hooks/use-shipments-list';
import type { Shipment, ShipmentStatus } from '../types';
import { shipmentColumns } from './shipment-columns';

const STATUS_OPTIONS = statusFilterOptions(SHIPMENT_STATUS, [
  'PENDING',
  'IN_TRANSIT',
  'DELIVERED',
  'CANCELLED',
]);

export function ShipmentsTable() {
  const { filters, setFilter, setPage, params } = useFilteredPagination({
    status: 'ALL' as StatusFilter<ShipmentStatus>,
  });

  const query = useShipmentsList(params);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <StatusFilterTabs
          options={STATUS_OPTIONS}
          value={filters.status}
          onChange={(value) => setFilter('status', value)}
        />
        <Button asChild>
          <Link href="/seller/shipments/new">+ Create shipment</Link>
        </Button>
      </div>
      <QueryState query={query} errorMessage="Couldn't load shipments.">
        {(result) => (
          <PaginatedTable<Shipment>
            data={result.data}
            meta={result.meta}
            onPageChange={setPage}
            getRowKey={(shipment) => shipment.id}
            getRowHref={(shipment) => `/seller/shipments/${shipment.id}`}
            emptyMessage="No shipments yet — create your first one."
            columns={[
              shipmentColumns.trackingCode,
              shipmentColumns.status,
              shipmentColumns.destination,
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
