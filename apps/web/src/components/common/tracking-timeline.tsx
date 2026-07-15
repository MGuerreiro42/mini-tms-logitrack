import { ShipmentStatusPill } from '@/components/ui/status-pill';
import type { ShipmentStatus } from '@/lib/status-colors';

// Deliberately re-declares the event shape locally instead of importing it
// from features/shipments/types.ts — components/ never imports from
// features/ (DESIGN.md § 9's unidirectional-dependency rule), same
// precedent already set by lib/status-colors.ts redeclaring ShipmentStatus
// independently rather than reaching into the feature for it.
export interface TrackingTimelineEvent {
  id: string;
  status: ShipmentStatus;
  note: string | null;
  createdAt: string;
}

export function TrackingTimeline({
  events,
}: {
  events: TrackingTimelineEvent[];
}) {
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
        <li key={event.id} className="flex items-start gap-3 text-sm">
          <ShipmentStatusPill status={event.status} />
          <div className="flex-1 space-y-0.5">
            {event.note && (
              <p className="text-muted-foreground">{event.note}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {new Date(event.createdAt).toLocaleString()}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
