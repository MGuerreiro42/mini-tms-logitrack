import { ShipmentStatusPill } from '@/components/ui/status-pill';
import { formatDateTime } from '@/lib/format-date';
import type { TimelineEvent } from '@/types/status';

export function TrackingTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
        No status updates yet.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {events.map((event) => (
        <li
          key={`${event.status}-${event.createdAt}`}
          className="flex items-start gap-3 text-sm"
        >
          <ShipmentStatusPill status={event.status} />
          <div className="flex-1 space-y-0.5">
            {event.note && (
              <p className="text-muted-foreground">{event.note}</p>
            )}
            <time
              dateTime={event.createdAt}
              className="block text-xs text-muted-foreground"
            >
              {formatDateTime(event.createdAt)}
            </time>
          </div>
        </li>
      ))}
    </ol>
  );
}
