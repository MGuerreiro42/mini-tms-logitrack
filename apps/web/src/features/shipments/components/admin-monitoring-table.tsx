'use client';

import { useState } from 'react';
import { PaginatedTable } from '@/components/common/paginated-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ShipmentStatusPill } from '@/components/ui/status-pill';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCarriersList } from '@/features/carriers/hooks/use-carriers-list';
import { useSellersList } from '@/features/sellers/hooks/use-sellers-list';
import type { ShipmentStatus } from '@/lib/status-colors';
import { useAdminShipments } from '../hooks/use-admin-shipments';
import { useShipmentTracking } from '../hooks/use-shipment-tracking';
import type { AdminShipment } from '../types';

// Every ShipmentStatus individually selectable, not a flat list — this is
// the one screen meant to show off the full granularity of all 9 states
// (SCREENS.md's Global Monitoring), unlike the carrier queue's own tabs
// which only surface the 3-4 statuses an operator acts on day to day.
const STATUS_FILTERS: { label: string; value: ShipmentStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Accepted', value: 'ACCEPTED' },
  { label: 'Collected', value: 'COLLECTED' },
  { label: 'In transit', value: 'IN_TRANSIT' },
  { label: 'Out for delivery', value: 'OUT_FOR_DELIVERY' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Failed delivery', value: 'FAILED_DELIVERY' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'Returned', value: 'RETURNED' },
];

export function AdminMonitoringTable() {
  const [status, setStatus] = useState<ShipmentStatus | 'ALL'>('ALL');
  const [carrierId, setCarrierId] = useState<string | 'ALL'>('ALL');
  const [sellerId, setSellerId] = useState<string | 'ALL'>('ALL');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAdminShipments({
    status: status === 'ALL' ? undefined : status,
    carrierId: carrierId === 'ALL' ? undefined : carrierId,
    sellerId: sellerId === 'ALL' ? undefined : sellerId,
    page,
    limit: 20,
  });
  // Carrier/seller filter options — a plain, unfiltered list of each is
  // enough to populate a picker; the same admin-only endpoints the
  // Sellers/Carriers nav pages already use.
  const { data: carriers } = useCarriersList({ page: 1, limit: 100 });
  const { data: sellers } = useSellersList({ page: 1, limit: 100 });
  useShipmentTracking({ subscribeToMonitoring: true });

  return (
    <div className="space-y-4">
      <Tabs
        value={status}
        onValueChange={(value) => {
          setStatus(value as ShipmentStatus | 'ALL');
          setPage(1);
        }}
      >
        <TabsList className="flex-wrap">
          {STATUS_FILTERS.map((filter) => (
            <TabsTrigger key={filter.value} value={filter.value}>
              {filter.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex gap-3">
        <Select
          value={carrierId}
          onValueChange={(value) => {
            setCarrierId(value);
            setPage(1);
          }}
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
          value={sellerId}
          onValueChange={(value) => {
            setSellerId(value);
            setPage(1);
          }}
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

      {isLoading || !data ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : (
        <PaginatedTable<AdminShipment>
          data={data.data}
          meta={data.meta}
          onPageChange={setPage}
          getRowKey={(s) => s.id}
          emptyMessage="No shipments match this filter."
          columns={[
            {
              header: 'Tracking code',
              cell: (s) => (
                <span className="font-mono text-xs">{s.trackingCode}</span>
              ),
            },
            {
              header: 'Status',
              cell: (s) => <ShipmentStatusPill status={s.status} />,
            },
            {
              header: 'Destination',
              cell: (s) => `${s.addressCity}/${s.addressState}`,
            },
            { header: 'Seller', cell: (s) => s.sellerCompanyName },
            { header: 'Carrier', cell: (s) => s.carrierCompanyName },
            {
              header: 'Created',
              className: 'text-right text-muted-foreground',
              cell: (s) => new Date(s.createdAt).toLocaleDateString(),
            },
          ]}
        />
      )}
    </div>
  );
}
