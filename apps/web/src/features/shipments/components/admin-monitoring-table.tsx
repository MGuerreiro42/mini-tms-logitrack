'use client';

import {
  type FilterOption,
  FilterSelect,
} from '@/components/common/filter-select';
import { LiveIndicator } from '@/components/common/live-indicator';
import { PaginatedTable } from '@/components/common/paginated-table';
import { QueryState } from '@/components/common/query-state';
import {
  type StatusFilter,
  StatusFilterTabs,
  statusFilterOptions,
} from '@/components/common/status-filter-tabs';
import { useFilteredPagination } from '@/hooks/use-filtered-pagination';
import { SHIPMENT_STATUS, SHIPMENT_STATUSES } from '@/lib/status-colors';
import type { ShipmentStatus } from '@/types/status';
import { useAdminShipments } from '../hooks/use-admin-shipments';
import { useShipmentTracking } from '../hooks/use-shipment-tracking';
import type { AdminShipment } from '../types';
import { shipmentColumns } from './shipment-columns';

const STATUS_OPTIONS = statusFilterOptions(SHIPMENT_STATUS, SHIPMENT_STATUSES);

interface AdminMonitoringTableProps {
  carrierOptions: FilterOption[];
  sellerOptions: FilterOption[];
}

export function AdminMonitoringTable({
  carrierOptions,
  sellerOptions,
}: AdminMonitoringTableProps) {
  const { filters, setFilter, setPage, params } = useFilteredPagination({
    status: 'ALL' as StatusFilter<ShipmentStatus>,
    carrierId: 'ALL',
    sellerId: 'ALL',
  });

  const query = useAdminShipments(params);
  useShipmentTracking({ subscribeToMonitoring: true });

  return (
    <div className="space-y-4">
      <LiveIndicator />
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

      <QueryState query={query} errorMessage="Couldn't load shipments.">
        {(result) => (
          <PaginatedTable<AdminShipment>
            data={result.data}
            meta={result.meta}
            onPageChange={setPage}
            getRowKey={(s) => s.id}
            emptyMessage="No shipments match this filter."
            columns={[
              shipmentColumns.trackingCode,
              shipmentColumns.status,
              shipmentColumns.destination,
              { header: 'Seller', cell: (s) => s.sellerCompanyName },
              { header: 'Carrier', cell: (s) => s.carrierCompanyName },
              shipmentColumns.created,
            ]}
          />
        )}
      </QueryState>
    </div>
  );
}
