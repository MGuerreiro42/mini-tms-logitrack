import { Panel } from '@/components/common/panel';
import { plural } from '@/lib/plural';
import { SHIPMENT_STATUS, SHIPMENT_STATUS_DOT } from '@/lib/status-colors';
import { sumRecord } from '@/lib/sum-record';
import { cn } from '@/lib/utils';
import type { ShipmentStatus, ShipmentStatusCounts } from '@/types/status';

export function StatusDistribution({
  counts,
}: {
  counts: ShipmentStatusCounts;
}) {
  const entries = (Object.entries(counts) as [ShipmentStatus, number][])
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);
  const summary = entries
    .map(([status, count]) => `${SHIPMENT_STATUS[status].label} ${count}`)
    .join(', ');

  return (
    <Panel
      title="Status distribution"
      description={plural(sumRecord(counts), 'shipment')}
      isEmpty={entries.length === 0}
      emptyMessage="No shipments yet."
    >
      <div
        role="img"
        aria-label={summary}
        className="flex h-4.5 gap-0.5 overflow-hidden rounded-sm"
      >
        {entries.map(([status, count]) => (
          <span
            key={status}
            className={cn('bg-current', SHIPMENT_STATUS_DOT[status])}
            style={{ flexGrow: count }}
          />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
        {entries.map(([status, count]) => (
          <li key={status} className="flex items-center gap-2 text-[13px]">
            <span
              aria-hidden
              className={cn(
                'size-2.5 shrink-0 rounded-xs bg-current',
                SHIPMENT_STATUS_DOT[status],
              )}
            />
            {SHIPMENT_STATUS[status].label}
            <span className="ml-auto font-mono text-muted-foreground">
              {count}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
