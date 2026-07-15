'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StatTile } from '@/components/common/stat-tile';
import { Button } from '@/components/ui/button';
import { ShipmentStatusPill } from '@/components/ui/status-pill';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSellerDashboard } from '../hooks/use-seller-dashboard';

export function SellerDashboard() {
  const { isLoading, counts, recentShipments } = useSellerDashboard();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

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
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tracking code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead className="text-right">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentShipments.map((shipment) => (
                <TableRow
                  key={shipment.id}
                  className="cursor-pointer"
                  onClick={() =>
                    router.push(`/seller/shipments/${shipment.id}`)
                  }
                >
                  <TableCell className="font-mono text-xs">
                    {shipment.trackingCode}
                  </TableCell>
                  <TableCell>
                    <ShipmentStatusPill status={shipment.status} />
                  </TableCell>
                  <TableCell>
                    {shipment.addressCity}/{shipment.addressState}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {new Date(shipment.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
