import Link from 'next/link';
import { SHIPMENT_STATUS, SHIPMENT_STATUS_DOT } from '@/lib/status-colors';
import { cn } from '@/lib/utils';
import type { ShipmentStatus } from '@/types/status';

// The open statuses in lifecycle order.
export const PIPELINE_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'COLLECTED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
] as const satisfies ShipmentStatus[];

type PipelineStatus = (typeof PIPELINE_STATUSES)[number];

// Label ink per segment, each at least 4.5:1 on its dot in both themes.
const LABEL_INK: Record<PipelineStatus, string> = {
  PENDING: 'text-status-dot-ink',
  ACCEPTED: 'text-card dark:text-background',
  COLLECTED: 'text-status-dot-ink',
  IN_TRANSIT: 'text-card dark:text-background',
  OUT_FOR_DELIVERY: 'text-status-dot-ink',
};

// Below this share a segment is too narrow for its label; the legend and aria-label still carry it.
const MIN_LABEL_SHARE = 0.12;

interface PipelineBarProps {
  counts: Record<PipelineStatus, number>;
  hrefFor: (status: PipelineStatus) => string;
}

export function PipelineBar({ counts, hrefFor }: PipelineBarProps) {
  const total = PIPELINE_STATUSES.reduce(
    (sum, status) => sum + counts[status],
    0,
  );
  const segments = PIPELINE_STATUSES.map((status) => ({
    status,
    count: counts[status],
    name: `${counts[status]} ${SHIPMENT_STATUS[status].label}`,
  }));

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex h-7 gap-0.5">
        {segments.map(({ status, count, name }) => (
          <li
            key={status}
            // A zero segment stays a 4 px stub, so every stage is still a door.
            style={{ flex: count > 0 ? `${count} 1 0` : '0 0 4px' }}
            className="min-w-1"
          >
            <Link
              href={hrefFor(status)}
              aria-label={name}
              title={name}
              className={cn(
                'flex h-full items-center overflow-hidden rounded bg-current outline-ring hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2',
                SHIPMENT_STATUS_DOT[status],
              )}
            >
              {total > 0 && count / total >= MIN_LABEL_SHARE && (
                <span
                  aria-hidden
                  className={cn(
                    'truncate px-2 text-xs font-semibold max-md:hidden',
                    LABEL_INK[status],
                  )}
                >
                  {name}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
      <ul
        aria-hidden
        className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] sm:grid-cols-3 lg:grid-cols-5"
      >
        {segments.map(({ status, count }) => (
          <li key={status} className="flex items-center gap-2">
            <span
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
    </div>
  );
}
