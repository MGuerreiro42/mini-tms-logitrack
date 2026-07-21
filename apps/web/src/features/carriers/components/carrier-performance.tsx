'use client';

import { StatTile } from '@/components/common/stat-tile';
import { ShipmentStatusPill } from '@/components/ui/status-pill';
import type { ShipmentStatus } from '@/lib/status-colors';
import { useCarrierPerformance } from '../hooks/use-carrier-performance';

export function CarrierPerformance() {
  const { isLoading, isError, data } = useCarrierPerformance();

  if (isLoading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        Couldn't load performance data. Please refresh the page.
      </div>
    );
  }

  // New carrier, no shipments yet — misleading 0%/0h figures would read as
  // real metrics rather than "nothing to measure yet" (FLOW.md Frame 24).
  if (data.totalShipments === 0) {
    return (
      <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
        Not enough data yet — metrics appear once shipments start moving through
        your queue.
      </div>
    );
  }

  const statusEntries = Object.entries(data.shipmentCountsByStatus).filter(
    ([, count]) => count > 0,
  ) as [ShipmentStatus, number][];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total shipments" value={data.totalShipments} />
        <StatTile
          label="Avg. time between updates"
          value={
            data.avgHoursBetweenEvents === null
              ? '—'
              : `${data.avgHoursBetweenEvents.toFixed(1)}h`
          }
        />
        <StatTile
          label="Failed delivery rate"
          value={`${data.failedDeliveryRate.toFixed(1)}%`}
        />
        <StatTile
          label="Returned rate"
          value={`${data.returnedRate.toFixed(1)}%`}
        />
      </div>
      {data.avgHoursBetweenEvents === null && (
        <p className="text-xs text-muted-foreground">
          Avg. time between updates needs at least one shipment with two
          tracking events — not enough data for that yet.
        </p>
      )}

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Distribution by status</h2>
        <div className="flex flex-wrap gap-2">
          {statusEntries.map(([status, count]) => (
            <div key={status} className="flex items-center gap-1.5">
              <ShipmentStatusPill status={status} />
              <span className="text-xs text-muted-foreground">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Scoped to this carrier's own shipments only — no visibility into other
        carriers' numbers.
      </p>
    </div>
  );
}
