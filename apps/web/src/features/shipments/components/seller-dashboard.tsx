'use client';

import Link from 'next/link';
import { PaginatedTable } from '@/components/common/paginated-table';
import { QueryState } from '@/components/common/query-state';
import { StatTile } from '@/components/common/stat-tile';
import { Button } from '@/components/ui/button';
import { ShipmentStatusPill } from '@/components/ui/status-pill';
import {
  type SellerDashboardData,
  useSellerDashboard,
} from '../hooks/use-seller-dashboard';
import type { Shipment } from '../types';
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
  // Zero shipments ever, not just zero on the current filter — the
  // create-shipment CTA takes over the whole screen instead of a row of
  // zero-count tiles nobody asked to see yet (FLOW.md Frame 19).
  if (counts.total === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <p className="text-sm text-muted-foreground">
          No shipments yet — create your first one to get started.
        </p>
        <Button asChild>
          <Link href="/seller/shipments/new">+ Create shipment</Link>
        </Button>
      </div>
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
          meta={{
            total: recentShipments.length,
            page: 1,
            limit: 5,
            totalPages: 1,
          }}
          onPageChange={() => {}}
          getRowKey={(shipment) => shipment.id}
          getRowHref={(shipment) => `/seller/shipments/${shipment.id}`}
          emptyMessage="No shipments yet."
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
            {
              header: 'Created',
              className: 'text-right text-muted-foreground',
              cell: (s) => new Date(s.createdAt).toLocaleDateString(),
            },
          ]}
        />
      </div>
    </div>
  );
}
