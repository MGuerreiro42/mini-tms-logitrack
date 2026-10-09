'use client';

import { LiveIndicator } from '@/components/common/live-indicator';
import { PaginatedTable } from '@/components/common/paginated-table';
import { QueryState } from '@/components/common/query-state';
import {
  type StatusFilter,
  StatusFilterTabs,
  statusFilterOptions,
} from '@/components/common/status-filter-tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCarriersList } from '@/features/carriers/hooks/use-carriers-list';
import { useSellersList } from '@/features/sellers/hooks/use-sellers-list';
import { useFilteredPagination } from '@/hooks/use-filtered-pagination';
import {
  SHIPMENT_STATUS,
  SHIPMENT_STATUSES,
  type ShipmentStatus,
} from '@/lib/status-colors';
import { useAdminShipments } from '../hooks/use-admin-shipments';
import { useShipmentTracking } from '../hooks/use-shipment-tracking';
import type { AdminShipment } from '../types';
import { shipmentColumns } from './shipment-columns';

// Monitoring exposes every status; the carrier queue only the ones operators act on.
const STATUS_OPTIONS = statusFilterOptions(SHIPMENT_STATUS, SHIPMENT_STATUSES);

export function AdminMonitoringTable() {
  const { filters, setFilter, setPage, params } = useFilteredPagination({
    status: 'ALL' as StatusFilter<ShipmentStatus>,
    carrierId: 'ALL',
    sellerId: 'ALL',
  });

  const query = useAdminShipments(params);
  const { data: carriers } = useCarriersList({ page: 1, limit: 100 });
  const { data: sellers } = useSellersList({ page: 1, limit: 100 });
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
        <Select
          value={filters.carrierId}
          onValueChange={(value) => setFilter('carrierId', value)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Carrier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All carriers</SelectItem>
            {carriers?.data.map((carrier) => (
              <SelectItem key={carrier.id} value={carrier.id}>
                {carrier.companyName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.sellerId}
          onValueChange={(value) => setFilter('sellerId', value)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Seller" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All sellers</SelectItem>
            {sellers?.data.map((seller) => (
              <SelectItem key={seller.id} value={seller.id}>
                {seller.companyName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
