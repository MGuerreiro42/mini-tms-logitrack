import { cn } from '@/lib/utils';

// The tile figures (spec 10 FR-019): small, aria-hidden marks whose words live in the tile's note.

const pct = (value: number, max: number) =>
  `${Math.min(Math.max(value / max, 0), 1) * 100}%`;

// Parts of a whole as one thin bar; each class colours its segment through `bg-current`.
export function SegmentBar({
  segments,
}: {
  segments: { key: string; value: number; className: string }[];
}) {
  return (
    <div className="flex h-1.5 gap-0.5">
      {segments
        .filter(({ value }) => value > 0)
        .map(({ key, value, className }) => (
          <span
            key={key}
            className={cn('rounded-full bg-current', className)}
            style={{ flexGrow: value }}
          />
        ))}
    </div>
  );
}

// One tick per value on a 0–max track; values past max sit on its end.
export function TickTrack({ values, max }: { values: number[]; max: number }) {
  return (
    <div className="relative h-2.5">
      <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
      {values.map((value, index) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: no identity beyond position
          key={index}
          className="absolute top-0 h-full w-0.5 -translate-x-1/2 rounded-full bg-sla-late"
          style={{ left: pct(value, max) }}
        />
      ))}
    </div>
  );
}

// A rate on a min–100 % track: the current dot, the previous one hollow, and the target tick.
export function RateDots({
  rate,
  previous,
  target,
  min = 50,
}: {
  rate: number;
  previous?: number;
  target: number;
  min?: number;
}) {
  const at = (value: number) => ({ left: pct(value - min, 100 - min) });
  return (
    <div className="relative h-2.5">
      <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
      <span
        className="absolute top-0 h-full w-px bg-foreground"
        style={at(target)}
      />
      {previous !== undefined && (
        <span
          className="absolute top-1/2 size-2 -translate-1/2 rounded-full border-[1.5px] border-muted-foreground bg-card"
          style={at(previous)}
        />
      )}
      <span
        className="absolute top-1/2 size-2 -translate-1/2 rounded-full bg-primary ring-2 ring-card"
        style={at(rate)}
      />
    </div>
  );
}

// Columns over time, the latest one drawn strong.
export function MiniColumns({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-4 items-end gap-0.5">
      {values.map((value, index) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: columns are positions in time
          key={index}
          className={cn(
            'flex-1 rounded-t-[1px]',
            index === values.length - 1 ? 'bg-primary' : 'bg-chart-2',
          )}
          style={{ height: pct(value, max) }}
        />
      ))}
    </div>
  );
}

// The typical value solid, the slow tail light, and a tick at the limit they are held to.
export function SpanBar({
  from,
  to,
  limit,
}: {
  from: number;
  to: number;
  limit: number;
}) {
  const max = Math.max(to, limit) * 1.1;
  return (
    <div className="relative h-2.5">
      <span
        className="absolute top-1/2 left-0 h-1.5 -translate-y-1/2 rounded-full bg-chart-2"
        style={{ width: pct(to, max) }}
      />
      <span
        className="absolute top-1/2 left-0 h-1.5 -translate-y-1/2 rounded-full bg-primary"
        style={{ width: pct(from, max) }}
      />
      <span
        className="absolute top-0 h-full w-px bg-foreground"
        style={{ left: pct(limit, max) }}
      />
    </div>
  );
}
