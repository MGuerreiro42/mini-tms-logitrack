'use client';

import Link from 'next/link';
import { EmptyState } from '@/components/common/feedback-state';
import { PaginatedTable } from '@/components/common/paginated-table';
import { QueryState } from '@/components/common/query-state';
import { StatTile } from '@/components/common/stat-tile';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/routes';
import {
  type SellerDashboardData,
  useSellerDashboard,
} from '../hooks/use-seller-dashboard';
import type { Shipment } from '../types';
import { shipmentColumns } from './shipment-columns';
import { SlaSummaryChart } from './sla-summary-chart';

export function SellerDashboard() {
  const query = useSellerDashboard();

  return (
    <QueryState query={query} errorMessage="Couldn't load your dashboard.">
      {(data) => <SellerDashboardView {...data} />}
    </QueryState>
  );
}

function SellerDashboardView({
  counts,
  recentShipments,
  slaSummary,
}: SellerDashboardData) {
  if (counts.total === 0) {
    return (
      <EmptyState
        title="Send your first shipment"
        description="Two steps, and carriers that cover your customers can pick it up."
        steps={[
          {
            label: 'Enable at least one delivery modality',
            action: (
              <Button asChild variant="link">
                <Link href="/seller/modalities">Modalities</Link>
              </Button>
            ),
          },
          {
            label: 'Create a shipment for a real address',
            action: (
              <Button asChild size="sm">
                <Link href={ROUTES.newShipment}>Create shipment</Link>
              </Button>
            ),
          },
        ]}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Pending" value={counts.pending} />
        <StatTile label="In transit" value={counts.inTransit} />
        <StatTile label="Delivered" value={counts.delivered} />
        <StatTile label="Total" value={counts.total} />
      </div>
      {counts.other > 0 && (
        <p className="text-xs text-muted-foreground">
          {counts.other} shipment{counts.other === 1 ? '' : 's'} in other
          statuses (accepted, collected, out for delivery, failed, cancelled, or
          returned) — not broken out above, but counted in Total.
        </p>
      )}

      <SlaSummaryChart data={slaSummary} />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent shipments</h2>
          <Link
            href="/seller/shipments"
            className="text-sm text-primary hover:underline"
          >
            View all
          </Link>
        </div>
        <PaginatedTable<Shipment>
          data={recentShipments}
          getRowKey={(shipment) => shipment.id}
          getRowHref={(shipment) => `/seller/shipments/${shipment.id}`}
          emptyMessage="No shipments yet."
          columns={[
            shipmentColumns.trackingCode,
            shipmentColumns.status,
            shipmentColumns.destination,
            shipmentColumns.created,
          ]}
        />
      </div>
    </div>
  );
}
