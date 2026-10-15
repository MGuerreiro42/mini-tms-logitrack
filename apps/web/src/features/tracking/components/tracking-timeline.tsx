import { formatDateTime, formatShortDateTime } from '@/lib/format-date';
import { newestFirst, nextExpectedStatus } from '@/lib/shipment-progress';
import { SHIPMENT_STATUS_DOT } from '@/lib/status-colors';
import { SHIPMENT_STATUS_LABEL } from '@/lib/status-labels';
import { cn } from '@/lib/utils';
import type { ShipmentStatus, TimelineEvent } from '@/types/status';

type Stage = 'next' | 'newest' | 'past';

const DOT: Record<Stage, string> = {
  next: 'border-2 border-dashed border-chart-2',
  newest: 'bg-current ring-5 ring-live-halo',
  past: 'border-3 border-current bg-card',
};

export function TrackingTimeline({
  events,
  status,
}: {
  events: TimelineEvent[];
  status: ShipmentStatus;
}) {
  const ordered = newestFirst(events);
  const next = nextExpectedStatus(status);

  if (ordered.length === 0) {
    return (
      <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
        No status updates yet.
      </p>
    );
  }

  return (
    <ol>
      {next && <TimelineItem stage="next" status={next} />}
      {ordered.map((event, index) => (
        <TimelineItem
          key={`${event.status}-${event.createdAt}`}
          stage={index === 0 ? 'newest' : 'past'}
          status={event.status}
          event={event}
          isLast={index === ordered.length - 1}
        />
      ))}
    </ol>
  );
}

function TimelineItem({
  stage,
  status,
  event,
  isLast = false,
}: {
  stage: Stage;
  status: ShipmentStatus;
  event?: TimelineEvent;
  isLast?: boolean;
}) {
  const isNext = stage === 'next';

  return (
    <li className="grid grid-cols-[1.375rem_minmax(0,1fr)] gap-x-3.5">
      <div aria-hidden className="flex flex-col items-center">
        <span
          className={cn(
            'mt-0.75 size-3.5 shrink-0 rounded-full',
            !isNext && SHIPMENT_STATUS_DOT[status],
            DOT[stage],
          )}
        />
        {!isLast && (
          <span
            className={cn(
              'w-0 flex-1 border-l-2',
              isNext ? 'border-dashed border-chart-2' : 'border-border',
            )}
          />
        )}
      </div>
      <div className={cn('flex flex-col gap-0.5', !isLast && 'pb-5')}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span
            className={cn(
              'text-[15px]',
              isNext ? 'font-medium text-muted-foreground' : 'font-semibold',
            )}
          >
            {isNext && <span className="sr-only">Next expected: </span>}
            {SHIPMENT_STATUS_LABEL[status]}
          </span>
          {event ? (
            <time
              dateTime={event.createdAt}
              title={formatDateTime(event.createdAt)}
              className="text-[13px] text-muted-foreground"
            >
              {formatShortDateTime(event.createdAt)}
            </time>
          ) : (
            <span
              aria-hidden
              className="shrink-0 text-[13px] text-muted-foreground"
            >
              Next
            </span>
          )}
        </div>
        {event?.note && (
          <p className="text-[13px] text-muted-foreground">{event.note}</p>
        )}
      </div>
    </li>
  );
}
