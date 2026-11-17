import Link from 'next/link';
import { hasEnoughData, ON_TIME_TARGET } from '@/lib/metrics';

export interface RangeDotRow {
  key: string;
  label: string;
  rate: number | null;
  count: number;
  n: number;
  // The 95 % range of the true rate; null below MIN_SAMPLE.
  range: { low: number; high: number } | null;
  href: string;
}

const TICK_STEP = 20;
const DEFAULT_FLOOR = 40;

type ShownRow = RangeDotRow & {
  rate: number;
  range: NonNullable<RangeDotRow['range']>;
};

const shown = (row: RangeDotRow): row is ShownRow =>
  hasEnoughData(row.n) && row.rate !== null && row.range !== null;

// A rate dot over its 95 % range, against the dashed target, on one shared axis (spec 10 FR-027).
export function RangeDotRows({
  rows,
  label,
}: {
  rows: RangeDotRow[];
  label: string;
}) {
  const lowest = Math.min(
    DEFAULT_FLOOR,
    ...rows.flatMap((row) => (shown(row) ? [row.range.low] : [])),
  );
  const floor = Math.floor(lowest / TICK_STEP) * TICK_STEP;
  const at = (value: number) => `${((value - floor) / (100 - floor)) * 100}%`;
  const ticks = Array.from(
    { length: (100 - floor) / TICK_STEP + 1 },
    (_, index) => floor + index * TICK_STEP,
  );

  return (
    <div className="flex flex-col gap-1">
      <ul aria-label={label} className="flex flex-col">
        {rows.map((row) => (
          <li key={row.key}>
            <Link
              href={row.href}
              aria-label={
                shown(row)
                  ? `${row.label}: ${row.rate.toFixed(0)}% on time, ${row.count} of ${row.n}, likely ${row.range.low.toFixed(0)}–${row.range.high.toFixed(0)}%`
                  : `${row.label}: too few deliveries, n=${row.n}`
              }
              className="grid min-h-9 grid-cols-[5.5rem_minmax(0,1fr)_6.5rem] items-center gap-3 rounded-sm text-[13px] outline-ring hover:bg-muted/50 focus-visible:outline-2 pointer-coarse:min-h-11"
            >
              <span className="truncate font-medium">{row.label}</span>
              <span aria-hidden className="relative h-3">
                {shown(row) && (
                  <>
                    <span
                      className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-chart-2"
                      style={{
                        left: at(row.range.low),
                        right: `calc(100% - ${at(row.range.high)})`,
                      }}
                    />
                    <span
                      className="absolute top-1/2 size-2.5 -translate-1/2 rounded-full bg-primary ring-2 ring-card"
                      style={{ left: at(row.rate) }}
                    />
                  </>
                )}
                <span
                  className="absolute inset-y-[-4px] border-l border-dashed border-foreground/60"
                  style={{ left: at(ON_TIME_TARGET) }}
                />
              </span>
              <span className="text-right whitespace-nowrap tabular-nums">
                {shown(row) ? (
                  <>
                    {row.rate.toFixed(0)}%{' '}
                    <span className="text-muted-foreground">
                      · {row.count}/{row.n}
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">
                    too few · n={row.n}
                  </span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div
        aria-hidden
        className="grid grid-cols-[5.5rem_minmax(0,1fr)_6.5rem] gap-3 text-[11px] text-muted-foreground"
      >
        <span className="relative col-start-2 h-4">
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute -translate-x-1/2 tabular-nums"
              style={{ left: at(tick) }}
            >
              {tick}%
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
