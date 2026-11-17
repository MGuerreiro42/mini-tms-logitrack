import { ACTIVITY_WINDOW_MS } from '@/features/shipments/hooks/use-seller-dashboard';
import type { ShipmentActivity } from '@/features/shipments/types';
import { plural } from '@/lib/plural';
import { cn } from '@/lib/utils';

// A static density of the last 4 h: one 2 px tick per event, failures in the critical colour.
export function ActivityStrip({
  events,
  now,
}: {
  events: ShipmentActivity[];
  now: Date;
}) {
  const failed = events.filter(
    (event) => event.status === 'FAILED_DELIVERY',
  ).length;
  const left = (iso: string) =>
    `${Math.min(100, Math.max(0, 100 - ((now.getTime() - Date.parse(iso)) / ACTIVITY_WINDOW_MS) * 100))}%`;

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs text-muted-foreground">
        Last 4 hours · {plural(events.length, 'event')}
      </p>
      <div
        role="img"
        aria-label={`${plural(events.length, 'event')} in the last 4 hours${failed > 0 ? `, ${plural(failed, 'failed delivery', 'failed deliveries')}` : ''}`}
        className="relative h-6 rounded-sm bg-muted"
      >
        {events.map((event) => (
          <span
            key={event.id}
            className={cn(
              'absolute inset-y-1 w-0.5 -translate-x-1/2 rounded-full',
              event.status === 'FAILED_DELIVERY'
                ? 'bg-sla-late'
                : 'bg-muted-foreground',
            )}
            style={{ left: left(event.createdAt) }}
          />
        ))}
      </div>
      <div
        aria-hidden
        className="flex justify-between text-[11px] text-muted-foreground"
      >
        <span>4 h ago</span>
        <span>now</span>
      </div>
    </div>
  );
}
